(ns collect-earth-online.generators.ce-project
  (:require [clojure.data.xml :as xml]
            [clojure.zip :as zip]
            [clojure.java.io  :as io]
            [clojure.data.csv :as csv]
            [clojure.string   :as cstr]
            [collect-earth-online.generators.external-file :refer [unzip-project]]
            [collect-earth-online.utils.part-utils :refer [read-file-base64]]
            [triangulum.response :refer [data-response]]
            [triangulum.logging :refer [log]]
            [triangulum.type-conversion :as tc]))

(defn read-xml-file
  "Reads xml file containing survey information for Collect Earth."
  [dir]
  (xml/parse (io/reader (str dir "/placemark.idm.xml"))))

(defn- code-items->answers
  "Transforms list of items into CEO's answers"
  [code-items]
  (reduce (fn [acc item]
            (assoc acc (keyword (-> item :attrs :id))
                   {:color  (format "#%06x" (rand-int 16777216))
                    :answer (-> item :content last :content first)}))
          {}
          code-items))

(defn- get-code-list
  "Retrieves the list of options from the XML."
  [dir-name]
   (some (fn [o]
           (when (= (:tag o) :codeLists)
             (:content o)))
         (-> dir-name read-xml-file :content)))

(defn extract-code-lists
  "Extracts the contents of the code lists from Collect
   into CEO's answers structure."
  [dir-name]
  (let [code-list (get-code-list dir-name)]
    (merge {:boolean {:answers {:1 {:color "#02D92D"
                                    :answer "Yes"}
                                :0 {:color "#D90202"
                                    :answer "No"}}}}
           (reduce (fn [acc list]
                     (assoc acc (keyword (-> list :attrs :name))
                            {:answers (code-items->answers (-> list :content last :content))}))
                   {}
                   code-list))))

(defn- get-question
  "Retrieves question name from Collect's XML."
  [tag-map]
  (-> (filter (fn [content]
                (= (:tag content) :label))
              (:content tag-map))
      first
      :content
      first))

(defn- find-parent-question
  "Looks for the id of the parent question."
  [question-attr questions]
  (if (:relevant question-attr)
    (or (some (fn [q]
                (when (= (:relevant question-attr)
                         (-> q :attrs :name))
                  {:parent-id (tc/val->int (-> q :attrs :id))
                   :type (-> q :tag)}))
              questions)
        {:parent-id -1})
    {:parent-id -1}))

(defn find-parent-question-and-answers
  [question-attrs questions code-lists]
  (if (and (:relevant question-attrs) (not= "false()" (cstr/lower-case (:relevant question-attrs))))
    (let [parse-relevance (fn [relevance]
                            (when relevance
                              (if (re-find #"[=/!=]" relevance)
                                (let [[_ parent-name operator value]
                                      (re-matches #"(\S+)\s*(=|!=)\s*(\d+)" relevance)]
                                  {:parent-name parent-name
                                   :operator operator
                                   :value value})
                                {:parent-name relevance})))
          find-question-by-name (fn [name]
                                  (some #(when (= (:name (:attrs %)) name) %) questions))
          find-id-in-codelist (fn [list-name answer]
                                (->> (get-in code-lists [(keyword list-name) :answers])
                                     (some #(when (= (str (key %)) answer) (key %)))))
          relevance (:relevant question-attrs)
          parsed-relevance (parse-relevance relevance)]
      (when parsed-relevance
        (let [{:keys [parent-name operator value]} parsed-relevance
              parent-question (find-question-by-name parent-name)
              parent-id (:id (:attrs parent-question))
              parent-tag (:tag parent-question)
              parent-answer-id
              (cond
                (= parent-tag :boolean)
                (if (= operator "=")
                  (if (= value "1") [1] [0])
                  (if (= value "1") [0] [1]))
                (= parent-tag :code)
                (find-id-in-codelist (:list (:attrs parent-question)) value)
                :else [])]
          {:parent-question-id (tc/val->int parent-id)
           :parent-answer-ids parent-answer-id})))
    {:parent-question-id -1
     :parent-answer-ids []}))


(defn- define-types
  "Define component type and data type for CEO's
   survey questions based on the XML's tag and layout type."
  [tag attributes]
  (cond
    (or (= tag :number) (= tag :text))
    {:dataType (name tag) :componentType "input"}
    (= tag :boolean)
    {:dataType "text" :componentType "button"}
    (and (= tag :code) (get attributes :ui/layoutType))
    {:dataType "text" :componentType "dropdown"}
    (= tag :code)
    {:dataType "text" :componentType "button"}
    :else {:dataType nil :componentType nil}))

(defn- extract-survey-questions
  "Parses the XML file and creates a list of CEO's questions
   based on the schema tag from the XML."
  [dir-name survey-answers]
  (let [survey-content     (-> dir-name read-xml-file :content last :content first :content)
        filtered-questions (filter (fn [q] (contains? #{:text :code :number :boolean} (:tag q)))
                                   survey-content)]
    (into (sorted-map)
          (map (fn [question]
                 (let [question-tag    (:tag question)
                       question-attrs  (:attrs question)
                       types           (define-types question-tag question-attrs)
                       {:keys [parent-question-id
                               parent-answer-ids]} (find-parent-question-and-answers question-attrs filtered-questions survey-answers)]
                   {(-> question-attrs :id Integer/parseInt)
                    {:dataType      (:dataType types)
                     :question      (get-question question)
                     :cardOrder     (if (and (:relevant question-attrs) (not= "false()" (cstr/lower-case (:relevant question-attrs))))
                                      nil
                                      (-> question-attrs :id tc/val->int))
                     :componentType (:componentType types)
                     :answerList    (if (= question-tag :boolean)
                                      :boolean
                                      (keyword (:list question-attrs)))
                     :parentAnswerIds  parent-answer-ids
                     :parentQuestionId parent-question-id}}))
               filtered-questions))))

(defn create-project-survey
  [dir-name]
  (let [survey-answers   (extract-code-lists dir-name)
        survey-questions (extract-survey-questions dir-name survey-answers)]
    (reduce (fn [acc [id question]]
              (let [answers (get survey-answers (:answerList question))]
                (if (:answerList question)
                  (assoc acc (-> id str keyword) (-> question
                                                     (merge answers)
                                                     (dissoc :answerList)))
                  (assoc acc (-> id str keyword) (-> question
                                                     (merge {:answers {:0 {:hide false
                                                                           :color "#000000"
                                                                           :answer ""
                                                                           :required true}}})
                                                     (dissoc :answerList))))))
            {}
            survey-questions)))

(defn list-files-in-folder
  [dir-path]
  (->> (io/file dir-path)
       .listFiles
       (map #(.getName %))
       (filter #(.endsWith % ".csv"))))

(defn get-plot-csv-headers
  [dir-path]
  (let [full-path (str dir-path "grid/")
        file (first (list-files-in-folder full-path))
        rows (cstr/split (slurp (str full-path file)) #"\r\n|\n|\r")
        header-row (first rows)]
    (set (map cstr/lower-case (cstr/split header-row #",")))))

(defn remove-metadata-questions
  [survey-questions dir-path]
  (let [csv-headers (get-plot-csv-headers dir-path)
        metadata-questions (-> csv-headers
                               (conj "actively saved by user")
                               (conj "csv file that contains the plot")
                               (conj "operator"))]
    (into {} (remove #(contains? metadata-questions (cstr/lower-case (:question (val %)))) survey-questions))))

(defn parse-project-properties
  [file-path]
  (with-open [f (clojure.java.io/reader (str file-path "/project_definition.properties"))]

    (reduce (fn [acc line]
              (let [[k v] (clojure.string/split line #"\=")]
                (if v
                  (assoc acc (keyword k) v)
                  acc)))
            {}
            (line-seq f))))

(defn rename-columns-and-write
  [file-path]
  (let [full-path (str file-path "grid/")
        new-headers ["PLOTID" "LAT" "LON"]
        file (first (list-files-in-folder full-path))]
    (with-open [reader (io/reader (str full-path file))
                writer (io/writer (str full-path "updated_plots.csv"))]
      (let [data (csv/read-csv reader)
            headers (first data)
            updated-headers (vec (concat new-headers (drop 3 headers)))
            updated-data (cons
                          updated-headers
                          (map-indexed (fn [idx row]
                                         (assoc row 0 (str (inc idx))))
                                       (rest data)))]
        (csv/write-csv writer updated-data)))
    (str full-path "updated_plots.csv")))

(defn- encode-plot-file
  [dir-path]
  (let [dir  (rename-columns-and-write dir-path)
        file (read-file-base64 dir)]
    (str "data:text/csv;base64," file)))

(defn format-project-properties
  "Parses properties file into edn format. Used to
   retireve general project information."
  [dir]
  (let [project-properties (parse-project-properties dir)
        samples-per-plot   (:number_of_sampling_points_in_plot project-properties)]
    {:name               (:survey_name project-properties)
     :description        (:survey_name project-properties)
     :plotDistribution   "csv"
     :plotShape          (cstr/lower-case (:sample_shape project-properties))
     :plotSize           (* 2 (tc/val->int (:distance_to_plot_boundaries project-properties)))
     :plotFileName       (str (:survey_name project-properties) ".csv")
     :plotFileBase64     (encode-plot-file dir)
     :samplesPerPlot     samples-per-plot
     :sampleDistribution "gridded"
     :allowDrawnSamples  false
     :sampleResolution   (:distance_between_sample_points project-properties)
     :sampleFileName     ""
     :aoiFeatures        [{:type "Polygon" :coordinates [[[-170,-75],[-170,75],[170,75],[170,-75],[-170,-75]]]}]
     :aoiFileName        ""}))

(defn import-ce-project
  [{:keys [params]}]
  (let [file-name (:fileName params)
        file-b64  (:fileb64 params)
        saved-file (unzip-project file-name file-b64)
        project-properties (format-project-properties saved-file)
        survey-questions (remove-metadata-questions
                          (create-project-survey saved-file)
                          saved-file)]
    (data-response (merge project-properties
                          {:surveyQuestions survey-questions}))))

(ns collect-earth-online.generators.ce-project
  (:require [clojure.data.xml :as xml]
            [clojure.java.io  :as io]
            [clojure.data.csv :as csv]
            [clojure.string   :as str]
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
                   {:color  "#000000"
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
    (merge {:boolean {:answers {:0 {:color "#02D92D"
                                    :answer "Yes"}
                                :1 {:color "#D90202"
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

(defn- find-parent-question-id
  "Looks for the id of the parent question."
  [question-attr questions]
  (if (:parent question-attr)
    (tc/val->int (some (fn [q]
                         (when (= (:parent question-attr)
                                  (-> q :attrs :name))
                           (-> q :attrs :id)))
                       questions))
    -1))

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
  [dir-name]
  (let [survey-content     (-> dir-name read-xml-file :content last :content first :content)
        filtered-questions (filter (fn [q] (contains? #{:text :code :number :boolean} (:tag q)))
                                   survey-content)]
    (into (sorted-map)
          (map (fn [question]
                 (let [question-tag   (:tag question)
                       question-attrs (:attrs question)
                       types          (define-types question-tag question-attrs)]
                   {(-> question-attrs :id Integer/parseInt)
                    {:dataType         (:dataType types)
                     :question         (get-question question)
                     :cardOrder        (-> question-attrs :id tc/val->int)
                     :componentType    (:componentType types)
                     :answerList       (if (= question-tag :boolean)
                                         :boolean
                                         (keyword (:list question-attrs)))
                     :parentQuestionId (find-parent-question-id question-attrs filtered-questions)}}))
               filtered-questions))))

(defn create-project-survey
  [dir-name]
  (let [survey-questions (extract-survey-questions dir-name)
        survey-answers   (extract-code-lists dir-name)]
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

(defn list-files-in-folder
  [dir-path]
  (->> (io/file dir-path)
       .listFiles
       (map #(.getName %))
       (filter #(.endsWith % ".csv"))))

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
     :plotShape          (str/lower-case (:sample_shape project-properties))
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
        project-properties (format-project-properties saved-file)]
    (data-response (merge project-properties
                          {:surveyQuestions (create-project-survey saved-file)}))))
 

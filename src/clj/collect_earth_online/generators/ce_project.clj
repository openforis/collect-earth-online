(ns collect-earth-online.generators.ce-project
  (:require [clojure.data.xml :as xml]
            [clojure.java.io  :as io]
            [clojure.string   :as str]
            [collect-earth-online.generators.external-file :refer [tmp-dir]]
            [triangulum.type-conversion :as tc]))

(defn read-xml-file
  "Reads xml file containing survey information for Collect Earth."
  [dir-name]
  (let [dir (str tmp-dir "/" dir-name)]
    (xml/parse (io/reader (str dir "/placemark.idm.xml")))))

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
    (reduce (fn [acc list]
              (assoc acc (keyword (-> list :attrs :name))
                     {:answers (code-items->answers (-> list :content last :content))}))
            {}
            code-list)))

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
                     :answerList       (keyword (:list question-attrs))
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
                  (assoc acc (-> id str keyword) (-> question (dissoc :answerList))))))
            {}
            survey-questions)))

(defn parse-properties-file
  "Parses properties file into edn format. Used to
   retireve general project information."
  [dir-name]
  (let [dir (str tmp-dir "/" dir-name)]
    (with-open [f (clojure.java.io/reader (str dir "/project_definition.properties"))]

      (reduce (fn [acc line]
                (let [[k v] (clojure.string/split line #"\=")]
                  (if v
                    (assoc acc (keyword k) v)
                    acc)))
              {}
              (line-seq f)))))


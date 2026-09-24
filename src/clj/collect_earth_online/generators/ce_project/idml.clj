(ns collect-earth-online.generators.ce-project.idml
  (:require [clojure.data.xml :as xml]
            [clojure.java.io  :as io]
            [clojure.string   :as str]
            [collect-earth-online.generators.ce-project.report :as report])
  (:import [java.io File]
           [javax.xml.stream XMLStreamException]))

(def survey-file-name "placemark.idm.xml")

;;;
;;; XML access
;;;

(defn- local-name
  "Local name of a tag or attribute key, ignoring its namespace."
  [k]
  (when k (name k)))

(defn- element?
  "True for XML elements, false for text."
  [x]
  (map? x))

(defn- tag?
  "True if el is an element with the given local tag name."
  [el tag-name]
  (and (element? el) (= tag-name (local-name (:tag el)))))

(defn- children
  "Child elements of el, optionally only those with the given tag name."
  ([el]          (filter element? (:content el)))
  ([el tag-name] (filter #(tag? % tag-name) (:content el))))

(defn- child
  "First child element with the given tag name."
  [el tag-name]
  (first (children el tag-name)))

(defn- attr
  "Attribute value by local name, ignoring its namespace."
  [el attr-name]
  (some (fn [[k v]] (when (= attr-name (local-name k)) v))
        (:attrs el)))

(defn- attrs-in-ns
  "Attributes whose namespace contains ns-fragment, keyed by local name."
  [el ns-fragment]
  (into {}
        (keep (fn [[k v]]
                (when (some-> (namespace k) (str/includes? ns-fragment))
                  [(keyword (local-name k)) v])))
        (:attrs el)))

(defn- true-attr?
  "True if the attribute is set to true."
  [el attr-name]
  (= "true" (some-> (attr el attr-name) str/trim str/lower-case)))

(defn- long-attr
  "Attribute value as a long, or nil."
  [el attr-name]
  (some-> (attr el attr-name) str/trim parse-long))

(defn- text
  "Trimmed text of el, or nil when blank."
  [el]
  (some->> (:content el)
           (filter string?)
           (apply str)
           (str/trim)
           (not-empty)))

;;;
;;; Localized texts
;;;

(defn- in-lang?
  "True if el has no xml:lang or the given one."
  [lang el]
  (let [el-lang (attr el "lang")]
    (or (nil? el-lang) (= lang el-lang))))

(defn- localized
  "Text of the best tag-name child: default language first, then by preferred type."
  ([el tag-name lang] (localized el tag-name lang nil))
  ([el tag-name lang types]
   (let [candidates (filter text (children el tag-name))
         of-type    (fn [t]
                      (if (nil? t)
                        candidates
                        (filter #(= t (or (attr % "type") "instance")) candidates)))
         pick       (fn [pred]
                      (some (fn [t] (first (filter pred (of-type t))))
                            (concat types [nil])))]
     (text (or (pick #(in-lang? lang %))
               (pick any?))))))

;;;
;;; Units and code lists
;;;

(defn- unit-abbreviations
  "Map of unit name to abbreviation."
  [survey lang]
  (into {}
        (keep (fn [unit]
                (when-let [unit-name (attr unit "name")]
                  [unit-name (or (localized unit "abbreviation" lang)
                                 (localized unit "label" lang)
                                 unit-name)])))
        (children (child survey "units") "unit")))

(defn- normalize-color
  "Collect RRGGBB color as #rrggbb, or nil."
  [color]
  (when-let [[_ hex] (some->> color str/trim (re-matches #"#?([0-9a-fA-F]{6})"))]
    (str "#" (str/lower-case hex))))

(declare parse-items)

(defn- parse-item
  "Code list item with its child items, or nil if it has no code."
  [lang level item]
  (when-let [code (text (child item "code"))]
    {:code        code
     :label       (or (localized item "label" lang) code)
     :description (localized item "description" lang)
     :color       (normalize-color (attr item "color"))
     :level       level
     :children    (parse-items lang (inc level) item)}))

(defn- parse-items
  "Items directly under parent-el at the given level."
  [lang level parent-el]
  (into [] (keep #(parse-item lang level %)) (children parent-el "item")))

(defn- parse-code-list
  "Code list with its levels and items."
  [lang list-el]
  {:name      (attr list-el "name")
   :label     (localized list-el "label" lang ["list" "item"])
   :levels    (into [] (keep #(attr % "name")) (children (child list-el "hierarchy") "level"))
   :external? (some? (attr list-el "lookup"))
   :items     (parse-items lang 1 (child list-el "items"))})

;;;
;;; Nodes
;;;

(def ^:private node-kinds
  {"entity"     :entity
   "text"       :text
   "number"     :number
   "code"       :code
   "boolean"    :boolean
   "date"       :date
   "time"       :time
   "coordinate" :coordinate
   "taxon"      :taxon
   "range"      :range
   "file"       :file})

(def ^:private check-kinds
  {"compare"  :compare
   "pattern"  :pattern
   "check"    :custom
   "distance" :distance
   "unique"   :unique})

(defn- node-element?
  "True for elements that define a survey node."
  [el]
  (and (element? el) (contains? node-kinds (local-name (:tag el)))))

(defn- parse-default
  "Calculated default as a map of value, expr and if."
  [default-el]
  (cond-> {}
    (attr default-el "value") (assoc :value (attr default-el "value"))
    (attr default-el "expr")  (assoc :expr  (attr default-el "expr"))
    (attr default-el "if")    (assoc :if    (attr default-el "if"))))

(defn- compare-bounds
  "Bounds of a compare check."
  [check-el]
  (into {}
        (keep (fn [k] (when-let [v (attr check-el (name k))] [k v])))
        [:gt :gte :lt :lte :eq]))

(defn- parse-check
  "Check as a map, or nil if the element isn't a check."
  [lang check-el]
  (when-let [kind (check-kinds (local-name (:tag check-el)))]
    (let [message (localized check-el "message" lang)]
      (cond-> {:type kind
               :flag (if (= "warn" (attr check-el "flag")) :warning :error)}
        (attr check-el "if")      (assoc :if (attr check-el "if"))
        (#{:custom :unique} kind) (assoc :expr (attr check-el "expr"))
        (= :pattern kind)         (assoc :regex (attr check-el "regex"))
        (= :compare kind)         (assoc :bounds (compare-bounds check-el))
        message                   (assoc :message message)))))

(defn- number-unit
  "Unit abbreviation of a number attribute's default precision."
  [units number-el]
  (let [precisions (children number-el "precision")
        precision  (or (first (filter #(true-attr? % "default") precisions))
                       (first precisions))]
    (some->> (attr precision "unit") (get units))))

(defn- parse-node
  "Node definition and, for entities, its children."
  [{:keys [lang units] :as ctx} parent-path node-el]
  (let [kind      (node-kinds (local-name (:tag node-el)))
        node-name (attr node-el "name")
        path      (str parent-path "/" node-name)
        min-count (long-attr node-el "minCount")]
    (cond-> {:id          (or (long-attr node-el "id") -1)
             :kind        kind
             :name        node-name
             :path        path
             :label       (or (localized node-el "label" lang ["instance" "heading"]) node-name)
             :description (localized node-el "description" lang)
             :multiple?   (true-attr? node-el "multiple")
             :key?        (true-attr? node-el "key")
             :required?   (boolean (or (true-attr? node-el "required")
                                       (some-> min-count pos?)))
             :required-if (attr node-el "requiredIf")
             :relevant    (attr node-el "relevant")
             :calculated? (true-attr? node-el "calculated")
             :hidden?     (true-attr? node-el "hide")
             :from-csv?   (true-attr? node-el "fromcsv")
             :defaults    (mapv parse-default (children node-el "default"))
             :checks      (into [] (keep #(parse-check lang %)) (children node-el))}

      (attr node-el "layoutType")
      (assoc :layout-type (attr node-el "layoutType"))

      (= :entity kind)
      (assoc :enumerate? (true-attr? node-el "enumerate")
             :children   (into []
                               (comp (filter node-element?)
                                     (map #(parse-node ctx path %)))
                               (children node-el)))

      (= :code kind)
      (assoc :list        (attr node-el "list")
             :parent-code (attr node-el "parent"))

      (= :text kind)
      (assoc :text-type (or (attr node-el "type") "short"))

      (= :number kind)
      (assoc :number-type (or (attr node-el "type") "real")
             :unit        (number-unit units node-el)))))

;;;
;;; Survey
;;;

(defn- languages
  "Survey languages in document order."
  [survey]
  (into [] (comp (keep text) (distinct)) (children survey "language")))

(defn- collect-earth-attributes
  "Survey-level collectearth attributes, without API keys."
  [survey]
  (into {}
        (remove (fn [[k _]] (str/ends-with? (name k) "Key")))
        (attrs-in-ns survey "collectearth")))

(defn parse-survey
  "Converts the survey element into a survey model."
  [survey]
  (when-not (tag? survey "survey")
    (throw (report/fatal (str survey-file-name " is not a Collect survey (no <survey> element)."))))
  (let [langs   (languages survey)
        lang    (or (first langs) "en")
        root-el (->> (children (child survey "schema"))
                     (filter #(tag? % "entity"))
                     (first))]
    (when-not root-el
      (throw (report/fatal "The survey has no root entity, so there is nothing to import.")))
    {:default-lang  lang
     :languages     (if (seq langs) langs [lang])
     :project-name  (localized survey "project" lang)
     :description   (localized survey "description" lang)
     :code-lists    (into {}
                          (keep (fn [list-el]
                                  (when-let [list-name (attr list-el "name")]
                                    [list-name (parse-code-list lang list-el)])))
                          (children (child survey "codeLists") "list"))
     :root          (parse-node {:lang lang :units (unit-abbreviations survey lang)} "" root-el)
     :collect-earth (collect-earth-attributes survey)}))

(defn read-survey
  "Reads the survey model from the project folder."
  [^File dir]
  (let [file (io/file dir survey-file-name)]
    (when-not (.isFile file)
      (throw (report/fatal (str "This is not a Collect Earth project: " survey-file-name " was not found."))))
    (try
      (parse-survey (xml/parse-str (slurp file :encoding "UTF-8")))
      (catch XMLStreamException e
        (throw (report/fatal (str survey-file-name " is not valid XML: " (ex-message e))))))))

;;;
;;; Model helpers
;;;

(defn parent-path
  "Path of the entity that contains the node at path."
  [path]
  (if-let [i (str/last-index-of path "/")]
    (subs path 0 i)
    ""))

(defn resolve-path
  "Absolute path of a relative Collect path, starting from an entity path."
  [entity-path expr]
  (reduce (fn [path step]
            (case step
              ("parent()" "..") (parent-path path)
              ("" ".")          path
              (str path "/" step)))
          entity-path
          (map str/trim (str/split (str/trim expr) #"/"))))

(defn walk
  "All nodes in document order, root first."
  [model]
  (tree-seq #(= :entity (:kind %)) :children (:root model)))

(defn node-index
  "Map of node path to node."
  [model]
  (into {} (map (juxt :path identity)) (walk model)))

(defn key-attributes
  "Key attributes of the root entity, in CSV column order."
  [model]
  (filterv :key? (:children (:root model))))

(defn list-items
  "Items of a code list at the given level, 1 being the top."
  [model list-name level]
  (->> (get-in model [:code-lists list-name :items])
       (mapcat #(tree-seq (comp seq :children) :children %))
       (filterv #(= level (:level %)))))

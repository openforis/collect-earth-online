(ns collect-earth-online.generators.ce-project.survey
  (:require [clojure.string :as str]
            [collect-earth-online.generators.ce-project.idml      :as idml]
            [collect-earth-online.generators.ce-project.relevance :as relevance]
            [collect-earth-online.generators.ce-project.report    :as report]))

(def ^:private bookkeeping-names #{"operator" "actively_saved" "actively_saved_on" "plot_file"})

(def ^:private unsupported-kinds #{:coordinate :taxon :file :range})

(def ^:private palette
  ["#1b9e77" "#d95f02" "#7570b3" "#e7298a" "#66a61e" "#e6ab02"
   "#a6761d" "#1f78b4" "#b15928" "#6a3d9a" "#33a02c" "#666666"])

(def ^:private max-multiple-items 15)

;;;
;;; Code list levels
;;;

(defn- code-level
  "Hierarchy level of a code attribute's items, following its parent chain."
  [index node]
  (loop [node  node
         level 1
         seen  #{(:path node)}]
    (let [parent (some->> (:parent-code node)
                          (idml/resolve-path (idml/parent-path (:path node)))
                          (get index))]
      (if (and parent (not (seen (:path parent))))
        (recur parent (inc level) (conj seen (:path parent)))
        level))))

;;;
;;; Candidates
;;;

(defn- never-shown?
  "True when the attribute's relevance is false()."
  [node]
  (boolean (some->> (:relevant node) (re-matches #"(?i)\s*false\(\)\s*"))))

(defn- skip-reason
  "[level reason] when an attribute doesn't become a question, else nil."
  [model node]
  (let [code-list (get-in model [:code-lists (:list node)])]
    (cond
      (:key? node)                     [:info "key attribute, kept as a plot property"]
      (:calculated? node)              [:info "calculated attribute"]
      (:from-csv? node)                [:info "filled from the plot CSV"]
      (never-shown? node)              [:info "never shown in Collect Earth"]
      (:hidden? node)                  [:info "hidden in Collect Earth"]
      (bookkeeping-names (:name node)) [:info "Collect Earth bookkeeping attribute"]
      (unsupported-kinds (:kind node)) [:warning (str (name (:kind node)) " attributes aren't supported")]
      (and (:multiple? node)
           (not= :code (:kind node)))  [:warning "several values per plot aren't supported"]
      (not= :code (:kind node))        nil
      (nil? code-list)                 [:warning (str "code list " (:list node) " not found")]
      (:external? code-list)           [:warning (str "code list " (:list node) " is stored outside the survey")]
      (empty? (:items node))
      [:warning (str "code list " (:list node) " has no items at this level")])))

(defn- skip-entry
  "Report entry for an attribute or table that isn't imported."
  [level node reason]
  (report/entry level :questions (:path node)
                (str "\"" (:label node) "\" not imported: " reason ".")
                :outcome :skipped))

(defn- with-items
  "Code attributes with the items of their list at their level."
  [model index node]
  (cond-> node
    (= :code (:kind node)) (assoc :items (idml/list-items model (:list node) (code-level index node)))))

(defn- table-candidates
  "Cells of an enumerated table, one per row and importable column, and report entries for the rest."
  [model index table]
  (let [row-key (first (filter #(and (:key? %) (= :code (:kind %))) (:children table)))
        rows    (:items (some->> row-key (with-items model index)))]
    (if (empty? rows)
      {:nodes [] :entries [(skip-entry :warning table "the table has no rows to import")]}
      (reduce (fn [acc column]
                (let [column (with-items model index column)]
                  (cond
                    (:key? column)
                    acc

                    (= :entity (:kind column))
                    (update acc :entries conj (skip-entry :warning column "groups inside tables aren't supported"))

                    (:multiple? column)
                    (update acc :entries conj (skip-entry :warning column "several answers inside tables aren't supported"))

                    :else
                    (if-let [[level reason] (skip-reason model column)]
                      (update acc :entries conj (skip-entry level column reason))
                      (update acc :nodes into (map #(assoc column :table table :row %) rows))))))
              {:nodes [] :entries []}
              (:children table)))))

(defn- candidates
  "Attributes of the entity that become questions, and report entries for the rest."
  [model index entity]
  (reduce (fn [acc node]
            (cond
              (and (= :entity (:kind node)) (:multiple? node) (:enumerate? node))
              (merge-with into acc (table-candidates model index node))

              (and (= :entity (:kind node)) (:multiple? node))
              (update acc :entries conj (skip-entry :warning node "tables whose rows are added freely aren't supported"))

              (= :entity (:kind node))
              (merge-with into acc (candidates model index node))

              :else
              (let [node (with-items model index node)]
                (if-let [[level reason] (skip-reason model node)]
                  (update acc :entries conj (skip-entry level node reason))
                  (update acc :nodes conj node)))))
          {:nodes [] :entries []}
          (:children entity)))

;;;
;;; Plans
;;;

(defn- question-type
  "CEO component and data types for an attribute."
  [node]
  (case (:kind node)
    :number  {:componentType "input" :dataType "number"}
    :boolean {:componentType "button" :dataType "text"}
    :code    {:componentType (case (:layout-type node)
                               "radio"    "radiobutton"
                               "dropdown" "dropdown"
                               "button")
              :dataType      "text"}
    {:componentType "input" :dataType "text"}))

(defn- suffix-repeated
  "Items whose value at k repeats get a suffix appended."
  [items k suffix-fn]
  (let [counts (frequencies (map k items))]
    (mapv (fn [item]
            (if (< 1 (counts (k item)))
              (update item k str " (" (suffix-fn item) ")")
              item))
          items)))

(defn- answers
  "Planned answers for an attribute."
  [node]
  (case (:kind node)
    :boolean [{:code "true"  :answer "Yes" :color "#02d92d"}
              {:code "false" :answer "No"  :color "#d90202"}]
    :code    (-> (map-indexed (fn [i item]
                                {:code   (:code item)
                                 :answer (:label item)
                                 :color  (or (:color item) (nth palette (mod i (count palette))))})
                              (:items node))
                 (vec)
                 (suffix-repeated :answer :code))
    [{:answer "" :color "#000000"}]))

(defn- conditionally-required?
  "True when Collect Earth requires the attribute only in some cases."
  [node]
  (let [expr (some-> (:required-if node) str/trim)]
    (boolean (and (seq expr) (not (re-matches #"(?i)false(\(\))?" expr))))))

(defn- sanitize
  "Lowercase text with anything but letters, digits and underscores replaced by _."
  [s]
  (str/replace (str/lower-case s) #"[^a-z0-9_]" "_"))

(defn- base-plan
  "Question plan for one attribute."
  [node]
  (merge (question-type node)
         {:source    {:path (:path node)}
          :kind      (:kind node)
          :question  (cond-> (:label node) (:unit node) (str " (" (:unit node) ")"))
          :label     (:name node)
          :answers   (answers node)
          :required? (and (:required? node) (not (conditionally-required? node)))}))

(defn- cell-plan
  "Question plan for one row of an enumerated table column."
  [{:keys [table row] :as node}]
  (-> (base-plan node)
      (assoc-in [:source :variant] {:row (:code row)})
      (update :question #(str (:label table) " – " (:label row) ": " %))
      (assoc :label (sanitize (str (:name table) "_" (:code row) "_" (:name node))))))

(defn- item-plans
  "One yes/no question per item of an attribute that allows several answers."
  [node]
  (let [base (base-plan (assoc node :kind :boolean))]
    (mapv (fn [item]
            (assoc base
                   :source    {:path (:path node) :variant {:item (:code item)}}
                   :question  (str (:question base) ": " (:label item))
                   :label     (sanitize (str (:name node) "_" (:code item)))
                   :required? false))
          (:items node))))

(defn- split-answers?
  "True for code attributes with several answers that are split into yes/no questions."
  [node]
  (and (= :code (:kind node))
       (:multiple? node)
       (not (:table node))
       (<= (count (:items node)) max-multiple-items)))

(defn- question-plans
  "Question plans for a candidate attribute."
  [node]
  (cond
    (:table node)          [(cell-plan node)]
    (split-answers? node)  (item-plans node)
    :else                  [(base-plan node)]))

(defn- unique-questions
  "Plans with repeated question texts told apart by attribute name, then by path."
  [plans]
  (-> plans
      (suffix-repeated :question #(last (str/split (get-in % [:source :path]) #"/")))
      (suffix-repeated :question #(get-in % [:source :path]))))

(defn- entity-name
  "Name of the entity that contains the node at path."
  [path]
  (last (str/split (idml/parent-path path) #"/")))

(defn- number-repeated
  "Items whose value at k repeats get _2, _3... from the second occurrence on."
  [items k]
  (first (reduce (fn [[out seen] item]
                   (let [v (k item)
                         n (inc (get seen v 0))]
                     [(conj out (cond-> item (< 1 n) (assoc k (str v "_" n)))) (assoc seen v n)]))
                 [[] {}]
                 items)))

(defn- unique-labels
  "Plans with repeated labels prefixed by their group name, then numbered."
  [plans]
  (let [counts (frequencies (map :label plans))]
    (-> (mapv (fn [plan]
                (if (< 1 (counts (:label plan)))
                  (update plan :label #(str (entity-name (get-in plan [:source :path])) "_" %))
                  plan))
              plans)
        (number-repeated :label))))

(defn- attributes
  "Distinct attributes behind the candidates, without table rows."
  [nodes]
  (distinct (map #(dissoc % :table :row) nodes)))

(defn- required-if-entries
  "Report entries for attributes required only in some cases."
  [nodes]
  (for [node (attributes nodes)
        :when (conditionally-required? node)]
    (report/entry :warning :questions (:path node)
                  (str "\"" (:label node) "\" is required only in some cases in Collect Earth; "
                       "imported as optional."))))

(defn- multiple-answer-entries
  "Report entries for code attributes that allow several answers."
  [nodes]
  (for [node (attributes nodes)
        :when (and (= :code (:kind node)) (:multiple? node))]
    (if (split-answers? node)
      (report/entry :info :questions (:path node)
                    (str "\"" (:label node) "\" allows several answers; imported as one yes/no question per answer."))
      (report/entry :warning :questions (:path node)
                    (str "\"" (:label node) "\" allows several answers but has too many to split; "
                         "imported as a single-answer question.")))))

;;;
;;; Visibility, ids and output
;;;

(defn- path-of
  "Collect path a plan was built from."
  [plan]
  (get-in plan [:source :path]))

(defn- plan-key
  "Path and variant that identify a plan."
  [plan]
  [(get-in plan [:source :path]) (get-in plan [:source :variant])])

(defn- attach-visibility
  "Adds visibility to each plan; questions CEO can't condition like Collect Earth become optional."
  [ctx index plans]
  (mapv (fn [plan]
          (let [visibility (relevance/project ctx (get index (path-of plan)))]
            (cond-> (assoc plan :visibility visibility)
              (= :unconditional (:fidelity visibility)) (assoc :required? false))))
        plans))

(defn- cycle?
  "True if following parents from key loops."
  [parents k]
  (loop [p    (parents k)
         seen #{k}]
    (cond
      (nil? p)  false
      (seen p)  true
      :else     (recur (parents p) (conj seen p)))))

(defn- break-cycles
  "Plans whose chain of parents loops become unconditional."
  [plans]
  (let [parents (into {}
                      (keep (fn [plan]
                              (when-let [parent (get-in plan [:visibility :parent-path])]
                                [(plan-key plan) [parent nil]])))
                      plans)]
    (mapv (fn [plan]
            (if (and (parents (plan-key plan)) (cycle? parents (plan-key plan)))
              (assoc plan
                     :visibility {:fidelity :unconditional
                                  :reason   "its condition depends on questions that depend on it"}
                     :required?  false)
              plan))
          plans)))

(defn- assign-ids
  "Sequential question ids and answer ids."
  [plans]
  (vec (map-indexed (fn [i plan]
                      (assoc plan
                             :id         (inc i)
                             :answer-ids (into {}
                                               (keep-indexed (fn [j answer]
                                                               (when (:code answer) [(:code answer) (inc j)])))
                                               (:answers plan))))
                    plans)))

(defn- link-parents
  "Parent ids and answer ids for conditioned plans, and card order for top-level plans."
  [plans]
  (let [by-key (into {} (map (juxt plan-key identity)) plans)
        linked (mapv (fn [plan]
                       (if-let [parent (by-key [(get-in plan [:visibility :parent-path]) nil])]
                         (assoc plan
                                :parent-id         (:id parent)
                                :parent-answer-ids (vec (sort (map (:answer-ids parent)
                                                                   (get-in plan [:visibility :parent-codes])))))
                         plan))
                     plans)]
    (first (reduce (fn [[out n] plan]
                     (if (:parent-id plan)
                       [(conj out plan) n]
                       [(conj out (assoc plan :card-order n)) (inc n)]))
                   [[] 1]
                   linked))))

(defn- ceo-question
  "CEO question map for a plan."
  [plan]
  (let [input? (= "input" (:componentType plan))]
    {:question         (:question plan)
     :questionLabel    (:label plan)
     :componentType    (:componentType plan)
     :dataType         (:dataType plan)
     :answers          (into {}
                             (map-indexed (fn [j answer]
                                            [(inc j) (cond-> {:answer (:answer answer) :color (:color answer)}
                                                       input? (assoc :required (:required? plan)))]))
                             (:answers plan))
     :parentQuestionId (or (:parent-id plan) -1)
     :parentAnswerIds  (or (:parent-answer-ids plan) [])
     :cardOrder        (:card-order plan)
     :required         (:required? plan)}))

(defn- emit
  "CEO questions by id, and the index rules use to find them."
  [plans]
  {:questions (into {} (map (juxt :id ceo-question)) plans)
   :index     (into {}
                    (map (fn [plan]
                           [(plan-key plan)
                            {:id (:id plan) :kind (:kind plan) :answer-ids (:answer-ids plan)}]))
                    plans)})

(defn- visibility-entry
  "Report entry describing how a question was imported."
  [{:keys [source question visibility]}]
  (let [{:keys [fidelity reason]} visibility
        path                      (:path source)]
    (case fidelity
      (:always :exact)
      (report/entry :info :questions path
                    (str "Imported \"" question "\".")
                    :outcome :exact)

      :unconditional
      (report/entry :warning :relevance path
                    (str "\"" question "\" is always shown and optional in CEO: " reason ".")
                    :outcome :unconditional))))

(defn build-questions
  "CEO questions, the index rules use, and report entries."
  [model _opts]
  (let [index                   (idml/node-index model)
        {:keys [nodes entries]} (candidates model index (:root model))
        plans                   (->> nodes
                                     (into [] (mapcat question-plans))
                                     (unique-questions)
                                     (unique-labels))
        plans                   (->> plans
                                     (attach-visibility (relevance/build-context index plans) index)
                                     (break-cycles)
                                     (assign-ids)
                                     (link-parents))
        {:keys [questions] question-index :index} (emit plans)]
    {:questions questions
     :index     question-index
     :entries   (concat entries
                        (required-if-entries nodes)
                        (multiple-answer-entries nodes)
                        (map visibility-entry plans))}))

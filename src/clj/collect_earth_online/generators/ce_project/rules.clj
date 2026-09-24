(ns collect-earth-online.generators.ce-project.rules
  (:require [clojure.set    :as set]
            [clojure.string :as str]
            [collect-earth-online.generators.ce-project.idml      :as idml]
            [collect-earth-online.generators.ce-project.relevance :as relevance]
            [collect-earth-online.generators.ce-project.report    :as report]))

(def ^:private unbounded 9999999)

(def ^:private max-rules-per-check 25)

(def ^:private format-regexes
  {:date "^\\d{4}-\\d{2}-\\d{2}$"
   :time "^\\d{2}:\\d{2}$"})

(def ^:private length-pattern
  #"(?i)\s*string-length\s*\(\s*(?:\$this|\.)\s*\)\s*(>=|<=|>|<|=)\s*(\d+)\s*")

(def ^:private this-comparison
  #"\s*\$this\s*(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)\s*")

;;;
;;; Rule shapes
;;;

(defn- text-match
  "Text-match rule for a question."
  [question regex]
  {:ruleType "text-match" :questionId (:id question) :regex regex})

(defn- numeric-range
  "Numeric-range rule for a question."
  [question [low high]]
  {:ruleType "numeric-range" :questionId (:id question) :min low :max high})

(defn- incompatible
  "Incompatible-answers rule for two question and answer pairs."
  [a a-code b b-code]
  {:ruleType    "incompatible-answers"
   :questionId1 (:id a)
   :answerId1   ((:answer-ids a) a-code)
   :questionId2 (:id b)
   :answerId2   ((:answer-ids b) b-code)})

;;;
;;; Numbers and lengths
;;;

(defn- as-number
  "Whole numbers as longs, others as doubles."
  [d]
  (if (== d (Math/rint d)) (long d) d))

(defn- range-from-bounds
  "[min max] from numeric bounds, or nil when a bound isn't a number or no value fits."
  [bounds integer?]
  (let [numbers (update-vals bounds #(some-> % str/trim parse-double))]
    (when (every? some? (vals numbers))
      (let [{:keys [gt gte lt lte eq]} numbers
            low  (cond eq  eq
                       gte gte
                       gt  (if integer? (inc (Math/floor gt)) gt)
                       :else (- unbounded))
            high (cond eq  eq
                       lte lte
                       lt  (if integer? (dec (Math/ceil lt)) lt)
                       :else unbounded)]
        (when (<= low high)
          [(as-number (double low)) (as-number (double high))])))))

(defn- this-bounds
  "Bounds from comparisons of $this with numbers joined by and, or nil."
  [expr]
  (let [matches (map #(re-matches this-comparison %) (str/split expr #"\s+and\s+"))]
    (when (every? some? matches)
      (into {}
            (map (fn [[_ op n]] [({">" :gt ">=" :gte "<" :lt "<=" :lte "=" :eq} op) n]))
            matches))))

(defn- length-regex
  "Regex for a string-length comparison, or nil when no text can match."
  [op n]
  (case op
    ">"  (str "^[\\s\\S]{" (inc n) ",}$")
    ">=" (str "^[\\s\\S]{" n ",}$")
    "<"  (when (pos? n) (str "^[\\s\\S]{0," (dec n) "}$"))
    "<=" (str "^[\\s\\S]{0," n "}$")
    "="  (str "^[\\s\\S]{" n "}$")))

;;;
;;; Incompatible answers
;;;

(defn- questions-for
  "Questions built from a path, keyed by variant."
  [question-index path]
  (into {} (keep (fn [[[p variant] question]] (when (= p path) [variant question]))) question-index))

(defn- codes-meeting
  "Answer codes a parsed condition accepts, or nil when it can't tell."
  [{:keys [codes except bare]} question]
  (let [list-codes (keys (:answer-ids question))
        matching   (fn [values]
                     (set (filter (fn [c] (some #(relevance/same-code? c %) values)) list-codes)))]
    (cond
      codes                                      (matching codes)
      except                                     (set/difference (set list-codes) (matching except))
      (and bare (= :boolean (:kind question)))   #{"true"}
      :else                                      nil)))

(defn- incompatible-rules
  "Rules for a check whose if and expr each test one answer question, or nil."
  [question-index node check]
  (let [context   (idml/parent-path (:path node))
        condition (some-> (:if check) relevance/parse-condition)
        allowed   (some-> (:expr check) relevance/parse-condition)
        find-q    (fn [field variant]
                    (let [path (idml/resolve-path context field)]
                      (or (get question-index [path variant]) (get question-index [path nil]))))
        per-row   (for [variant (keys (questions-for question-index (:path node)))
                        :let [a         (find-q (:field condition) variant)
                              b         (find-q (:field allowed) variant)
                              a-codes   (when a (codes-meeting condition a))
                              b-allowed (when b (codes-meeting allowed b))
                              b-codes   (when b-allowed
                                          (set/difference (set (keys (:answer-ids b))) b-allowed))]]
                    (when (and (seq a-codes) (seq b-codes) (not= (:id a) (:id b)))
                      (for [x a-codes, y b-codes]
                        (incompatible a x b y))))]
    (when (and condition allowed (seq per-row) (every? some? per-row))
      (vec (apply concat per-row)))))

;;;
;;; Checks
;;;

(defn- check-rules
  "Rules for one check, or the reason it can't be converted."
  [question-index node check]
  (let [questions (vals (questions-for question-index (:path node)))
        integer?  (= "integer" (:number-type node))
        {:keys [type flag regex bounds expr]} check
        if?       (boolean (not-empty (some-> (:if check) str/trim)))]
    (cond
      (= :warning flag)           "warning checks don't block saving in Collect Earth"
      (empty? questions)          "the field isn't a question"
      (#{:distance :unique} type) (str (name type) " checks aren't supported")

      (= :pattern type)
      (cond
        if?                       "conditional checks aren't supported"
        (not= :text (:kind node)) "pattern checks only apply to text questions"
        :else                     (mapv #(text-match % (str "^(?:" regex ")$")) questions))

      (= :compare type)
      (let [bounded (range-from-bounds bounds integer?)]
        (cond
          if?                         "conditional checks aren't supported"
          (not= :number (:kind node)) "comparisons only apply to number questions"
          (nil? bounded)              "the bounds aren't numbers or leave no valid value"
          :else                       (mapv #(numeric-range % bounded) questions)))

      if?
      (let [rules (incompatible-rules question-index node check)]
        (cond
          (empty? rules)                        "the condition is too complex"
          (< max-rules-per-check (count rules)) (str "it would need " (count rules) " rules")
          :else                                 rules))

      :else
      (let [[_ op n]     (some->> expr (re-matches length-pattern))
            expr-bounds  (some-> expr this-bounds)
            bounded      (some-> expr-bounds (range-from-bounds integer?))]
        (cond
          (and op (= :text (:kind node)))
          (if-let [length (length-regex op (parse-long n))]
            (mapv #(text-match % length) questions)
            "no text can have that length")

          (and expr-bounds (= :number (:kind node)))
          (if bounded
            (mapv #(numeric-range % bounded) questions)
            "no value fits the range")

          :else
          "the expression is too complex")))))

(defn- check-entry
  "Report entry for a converted or skipped check."
  [node check result]
  (let [what (str "A " (name (:type check)) " check on \"" (:label node) "\"")]
    (if (string? result)
      (report/entry (if (= :warning (:flag check)) :info :warning) :rules (:path node)
                    (str what " wasn't converted: " result ".")
                    :outcome :skipped)
      (report/entry :info :rules (:path node)
                    (str what " became " (count result) " rule(s)."
                         (when (and (= :compare (:type check))
                                    (not= "integer" (:number-type node))
                                    (some #(get (:bounds check) %) [:gt :lt]))
                           " Its strict bounds were made inclusive."))
                    :outcome :imported))))

(defn- format-rules
  "Text-match rules for the format of date and time questions."
  [question-index]
  (for [[_ question] (sort-by (comp :id val) question-index)
        :let [regex (format-regexes (:kind question))]
        :when regex]
    (text-match question regex)))

(defn build-rules
  "CEO rules from Collect checks and date and time questions, with report entries."
  [model question-index _opts]
  (let [results (for [node  (idml/walk model)
                      check (:checks node)]
                  [node check (check-rules question-index node check)])
        rules   (concat (mapcat (fn [[_ _ result]] (when-not (string? result) result)) results)
                        (format-rules question-index))]
    {:rules   (vec (map-indexed (fn [i rule] (assoc rule :id (inc i))) rules))
     :entries (map (fn [[node check result]] (check-entry node check result)) results)}))

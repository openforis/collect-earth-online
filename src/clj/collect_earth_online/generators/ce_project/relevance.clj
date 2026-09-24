(ns collect-earth-online.generators.ce-project.relevance
  (:require [clojure.set    :as set]
            [clojure.string :as str]
            [collect-earth-online.generators.ce-project.idml :as idml]))

;;;
;;; Recognized conditions
;;;

(def ^:private field "((?:(?:parent\\(\\)|\\.\\.)\\s*/\\s*)*[A-Za-z_]\\w*)")

(def ^:private value "(?:'([^']*)'|\"([^\"]*)\"|(-?\\d+(?:\\.\\d+)?))")

(def ^:private boolean-pattern  (re-pattern (str field "\\s*(=|!=)\\s*(true|false)\\(\\)")))
(def ^:private equality-pattern (re-pattern (str field "\\s*(=|!=)\\s*" value)))
(def ^:private any-pattern      (re-pattern (str "(?:boolean|idm:not-blank)\\s*\\(\\s*" field "\\s*\\)")))
(def ^:private not-pattern      (re-pattern (str "not\\s*\\(\\s*" field "\\s*\\)")))
(def ^:private bare-pattern     (re-pattern field))

(defn- balanced?
  "True if the parentheses in s balance without closing more than were opened."
  [s]
  (let [depths (reductions (fn [depth c] (case c \( (inc depth) \) (dec depth) depth)) 0 s)]
    (and (every? #(>= % 0) depths) (zero? (last depths)))))

(defn- normalize
  "Expression on one line, without wrapping parentheses."
  [expr]
  (loop [e (str/trim (str/replace expr #"\s+" " "))]
    (if (and (str/starts-with? e "(")
             (str/ends-with? e ")")
             (balanced? (subs e 1 (dec (count e)))))
      (recur (str/trim (subs e 1 (dec (count e)))))
      e)))

(defn- parse-simple
  "Field and expected answers of one recognized condition, else nil."
  [e]
  (or (when-let [[_ f op b] (re-matches boolean-pattern e)]
        {:field f :codes #{(if (= (= "=" op) (= "true" b)) "true" "false")} :boolean-only true})
      (when-let [[_ f op single double number] (re-matches equality-pattern e)]
        {:field f (if (= "=" op) :codes :except) #{(or single double number)}})
      (when-let [[_ f] (re-matches any-pattern e)]
        {:field f :any true})
      (when-let [[_ f] (re-matches not-pattern e)]
        {:field f :codes #{"false"} :boolean-only true})
      (when-let [[_ f] (re-matches bare-pattern e)]
        {:field f :bare true})))

(defn parse-condition
  "Field and expected answers of a recognized condition, else nil."
  [expr]
  (let [e     (normalize expr)
        parts (str/split e #" or ")]
    (if (= 1 (count parts))
      (parse-simple e)
      (let [conditions (map (comp parse-simple normalize) parts)]
        (when (and (every? :codes conditions)
                   (apply = (map :field conditions)))
          {:field        (:field (first conditions))
           :codes        (apply set/union (map :codes conditions))
           :boolean-only (boolean (some :boolean-only conditions))})))))

;;;
;;; Mapping to CEO
;;;

(defn same-code?
  "True if a list code matches a value from an expression, numerically when both are numbers."
  [code v]
  (or (= code v)
      (let [a (parse-double code)
            b (parse-double v)]
        (boolean (and a b (== a b))))))

(defn- unconditional
  "Visibility for a condition CEO can't express."
  [expr reason]
  {:fidelity :unconditional
   :reason   (str reason " (relevant: " (str/trim expr) ")")})

(defn- resolve-condition
  "CEO visibility for one relevance expression evaluated from an entity path."
  [questions node context expr]
  (let [{:keys [field codes except any bare boolean-only] :as condition} (parse-condition expr)
        parent-path (when field (idml/resolve-path context field))
        parent      (get questions parent-path)
        list-codes  (keep :code (:answers parent))
        boolean?    (= :boolean (:kind parent))
        matching    (fn [values] (set (filter (fn [c] (some #(same-code? c %) values)) list-codes)))
        exact       (fn [parent-codes] {:fidelity :exact :parent-path parent-path :parent-codes parent-codes})]
    (cond
      (nil? condition)
      (unconditional expr "the condition is too complex")

      (= parent-path (:path node))
      (unconditional expr "the question depends on itself")

      (nil? parent)
      (unconditional expr (str field " isn't an imported question"))

      (or any (and bare (not boolean?)))
      (exact #{})

      (= "input" (:componentType parent))
      (unconditional expr (str field " is a text or number question"))

      (and boolean-only (not boolean?))
      (unconditional expr (str field " isn't a yes/no question"))

      bare
      (exact #{"true"})

      except
      (let [kept (set/difference (set list-codes) (matching except))]
        (if (empty? kept)
          (unconditional expr "no answer shows it")
          (exact kept)))

      :else
      (let [missing (remove (fn [v] (some #(same-code? % v) list-codes)) codes)]
        (if (seq missing)
          (unconditional expr (str "code " (str/join ", " missing) " isn't in " field))
          (exact (matching codes)))))))

(defn- conditions
  "[entity-path expression] for the node's own condition and those of its groups."
  [index node]
  (->> (iterate idml/parent-path (:path node))
       (take-while not-empty)
       (keep (fn [path]
               (when-let [expr (:relevant (get index path))]
                 [(idml/parent-path path) expr])))))

(defn build-context
  "Node index and the questions that can be parents, by path."
  [index plans]
  {:index     index
   :questions (into {}
                    (comp (remove #(get-in % [:source :variant]))
                          (map (juxt #(get-in % [:source :path]) identity)))
                    plans)})

(defn project
  "CEO visibility for a node: :always, :exact with a parent, or :unconditional with a reason."
  [{:keys [index questions]} node]
  (let [results       (map (fn [[context expr]] (resolve-condition questions node context expr))
                           (conditions index node))
        unexpressible (first (filter #(= :unconditional (:fidelity %)) results))]
    (cond
      (empty? results)
      {:fidelity :always}

      unexpressible
      unexpressible

      (apply = (map #(select-keys % [:parent-path :parent-codes]) results))
      (first results)

      :else
      {:fidelity :unconditional
       :reason   "the question and its group have different conditions"})))

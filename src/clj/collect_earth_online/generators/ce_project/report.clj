(ns collect-earth-online.generators.ce-project.report)

(def outcomes #{:imported :exact :unconditional :skipped})

(defn fatal
  "Error for input that can't be imported; the importer returns its message with a 400."
  ([message] (fatal message {}))
  ([message data] (ex-info message (assoc data ::fatal true))))

(defn fatal?
  "True for errors created with fatal."
  [e]
  (boolean (::fatal (ex-data e))))

(defn entry
  "Report entry about a node path, file name or property."
  [level area subject message & {:keys [outcome]}]
  (cond-> {:level   level
           :area    area
           :subject (str subject)
           :message message}
    outcome (assoc :outcome outcome)))

(defn summarize
  "Report with counts by outcome, questions, rules and warnings, and all entries."
  [entries {:keys [questions rules]}]
  (let [entries (vec entries)]
    {:summary (merge (zipmap (sort outcomes) (repeat 0))
                     (frequencies (keep :outcome entries))
                     {:questions (count questions)
                      :rules     (count rules)
                      :warnings  (count (filter #(= :warning (:level %)) entries))})
     :entries entries}))

(ns org.openforis.ceo.database
  (:require [clojure.data.json :as json]
            [clojure.string    :as str]
            [org.openforis.ceo.logging :refer [log-str]]
            [org.openforis.ceo.views   :refer [data-response]]
            [next.jdbc :as jdbc]
            [next.jdbc.result-set :as rs]))

;;; Helper Functions

(defn kebab->snake [kebab-str]
  (str/replace kebab-str "-" "_"))

(defn format-simple
  "Use any char after % for format."
  [f-str & args]
  (apply format (str/replace f-str #"(%[^ ])" "%s") args))

(def sql-primitive (comp val first first))

;;; Static Data

(def pg-db {:dbtype                "postgresql"
            :dbname                "ceo"
            :user                  "ceo"
            :password              "ceo"
            :reWriteBatchedInserts true})

;;; Select Queries

(defn call-sql [sql-fn-name & opts+args]
  (let [[opts args] (if (map? (first opts+args))
                      [(first opts+args) (rest opts+args)]
                      [{} opts+args])
        {:keys [use-vec? log?] :or {use-vec? false log? true}} opts
        query           (format-simple "SELECT * FROM %1(%2)"
                                       sql-fn-name
                                       (str/join "," (repeat (count args) "?")))
        query-with-args (format-simple "SELECT * FROM %1(%2)"
                                       sql-fn-name
                                       (str/join "," (map pr-str args)))]
    (when log? (log-str "SQL Call: " query-with-args))
    (jdbc/execute! (jdbc/get-datasource pg-db)
                   (into [query] (map #(condp = (type %)
                                         java.lang.Long (int %)
                                         java.lang.Double (float %)
                                         %)
                                      args))
                   {:builder-fn (if use-vec?
                                  rs/as-unqualified-lower-arrays
                                  rs/as-unqualified-lower-maps)})))

(defn sql-handler [{:keys [uri params content-type]}]
  (let [[schema function] (->> (str/split uri #"/")
                               (remove str/blank?)
                               (map kebab->snake)
                               (rest))
        sql-args          (if (= content-type "application/edn")
                            (:sql-args params [])
                            (json/read-str (:sql-args params "[]")))
        sql-result        (apply call-sql (str schema "." function) sql-args)]
    (data-response sql-result {:type (if (= content-type "application/edn") :edn :json)})))

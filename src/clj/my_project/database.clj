(ns my-project.database
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [my-project.logging :refer [log-str]]
            [my-project.views :refer [data-response]]
            [next.jdbc :as jdbc]
            [next.jdbc.result-set :as rs]))

;;; Helper Functions

(defn kebab->snake [kebab-str]
  (str/replace kebab-str "-" "_"))

(defn format-simple
  "Use any char after % for format."
  [f-str & args]
  (apply format (str/replace f-str #"(%[^ ])" "%s") args))

;;; Static Data

(def pg-db {:dbtype                "postgresql"
            :dbname                "my_project"
            :user                  "my_project"
            :password              "my_project"
            :reWriteBatchedInserts true})

;;; Select Queries

(defn run-call-sql [use-vec? sql-fn-name & args]
  (let [query           (format-simple "SELECT * FROM %1(%2)"
                                       sql-fn-name
                                       (str/join "," (repeat (count args) "?")))
        query-with-args (format-simple "SELECT * FROM %1(%2)"
                                       sql-fn-name
                                       (str/join "," (map pr-str args)))]
    (log-str "SQL Call: " query-with-args)
    (jdbc/execute! (jdbc/get-datasource pg-db)
                   (into [query] (map #(condp = (type %)
                                         java.lang.Long (int %)
                                         java.lang.Double (float %)
                                         %)
                                      args))
                   {:builder-fn (if use-vec?
                                  rs/as-unqualified-lower-arrays
                                  rs/as-unqualified-lower-maps)})))

(defn call-sql [sql-fn-name & args]
  (apply run-call-sql false sql-fn-name args))

(defn call-sql-vec [sql-fn-name & args]
  (apply run-call-sql true sql-fn-name args))

(defn sql-handler [{:keys [uri params content-type]}]
  (let [[schema function] (->> (str/split uri #"/")
                               (remove str/blank?)
                               (map kebab->snake)
                               (rest))
        sql-args          (if (= content-type "application/edn")
                            (:sql-args params [])
                            (json/read-str (:sql-args params "[]")))
        sql-result        (apply call-sql (str schema "." function) sql-args)]
    (data-response 200 sql-result (= content-type "application/edn"))))

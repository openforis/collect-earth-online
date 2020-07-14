(ns my-project.remote-api
  (:require [clojure.data.json :as json]
            [clojure.repl :refer [demunge]]
            [clojure.string :as str]
            [my-project.email :refer [send-email]]
            [my-project.logging :refer [log-str]]
            [my-project.views :refer [data-response]]))

;; FIXME: Add more functions as necessary.
(def name->fn {"send-email" send-email})

(defn fn->sym [f]
  (-> (str f)
      (demunge)
      (str/split #"@")
      (first)
      (symbol)))

(defn clj-handler [{:keys [uri params content-type]}]
  (let [function   (->> (str/split uri #"/")
                        (remove str/blank?)
                        (second)
                        (name->fn))
        clj-args   (if (= content-type "application/edn")
                     (:clj-args params [])
                     (json/read-str (:clj-args params "[]")))
        clj-result (apply function clj-args)]
    (log-str "CLJ Call: " (cons (fn->sym function) clj-args))
    (if (:status clj-result)
      clj-result
      (data-response 200 clj-result (= content-type "application/edn")))))

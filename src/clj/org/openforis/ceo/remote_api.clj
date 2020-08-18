(ns org.openforis.ceo.remote-api
  (:require [clojure.repl :refer [demunge]]
            [clojure.string :as str]
            [org.openforis.ceo.logging :refer [log-str]]
            [org.openforis.ceo.views   :refer [data-response]]))

(defn fn->sym [f]
  (-> (str f)
      (demunge)
      (str/split #"@")
      (first)
      (symbol)))

(defn api-handler [function]
  (fn [request]
    (let [api-result (function request)]
      (log-str "API call to " (fn->sym function))
      (if (:body api-result)
        api-result
        (data-response api-result)))))

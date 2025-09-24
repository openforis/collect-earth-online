(ns collect-earth-online.gcloud
  (:require [clojure.core.async :as async :refer [go]]
            [jonotin.core :refer [subscribe!]]))

(defn listen [project-name subscription-name]
  (go (subscribe! {:project-name project-name
                   :subscription-name subscription-name
                   :handle-msg-fn (fn [msg] (println msg))
                   :handler-error-fn (fn [err] (println err))})))

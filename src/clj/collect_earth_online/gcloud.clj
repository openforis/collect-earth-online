(ns collect-earth-online.gcloud
  (:require [clojure.core.async :as async :refer [go put! <! close! chan]]
            [jonotin.core :refer [subscribe!]]
            [triangulum.response        :refer [data-response]]
            [collect-earth-online.sse :refer [broadcast!]]))

(defonce listener-state (atom {:active? false
                               :last-message nil}))

(defn respond [msg]
  (broadcast! {:message msg})
  (swap! list))

(defn gcloud-listener [project-name subscription-name]
  (when-not (:active? @listener-state)    
    (future
      (try
        (let [sub (subscribe! {:project-name project-name
                               :subscription-name subscription-name
                               :handle-msg-fn respond
                               :handler-error-fn (fn [err] 
                                                   (println "Error:" err)
                                                   (swap! listener-state assoc
                                                          :active? false))})]
          sub)))))

(defn handle-async [{:keys [params session]}]
  (try
    (when-not (:active? @listener-state)
      (gcloud-listener "collect-earth-online" "MySub")
      (swap! listener-state assoc :active? true))    
    (data-response {:message "Listener started"})
    (catch Exception e 
      (println e)
      (data-response {:message "Error starting listener"
                      :error (str e)}))))

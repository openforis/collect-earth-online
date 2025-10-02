(ns collect-earth-online.gcloud
  (:require [clojure.core.async :as async :refer [go put! <! close! chan]]
            [jonotin.core :refer [subscribe!]]
            [triangulum.response        :refer [data-response]]
            [collect-earth-online.sse :refer [broadcast!]]
            [triangulum.config :refer [get-config]]))

(defonce listener-state (atom {:active? false
                               :last-message nil}))

(defn respond [msg]
  (broadcast! {:message msg})
  (swap! list))

(defn gcloud-listener [project-name topic-name]
  (when-not (:active? @listener-state)    
    (future
      (try
        (let [sub (subscribe! {:project-name project-name
                               :subscription-name topic-name
                               :handle-msg-fn (fn [_] (respond "process complete"))
                               :handler-error-fn (fn [err] 
                                                   (println "Error:" err)
                                                   (swap! listener-state assoc
                                                          :active? false))})]
          sub)))))

(defn gcloud-handler [{:keys [params session]}]
  (try
    (when-not (:active? @listener-state)
      (gcloud-listener
       (:project-name (get-config :gcs-integration) "collect-earth-online")
       (:topic-name   (get-config :gcs-integration) "MySub"))
      (swap! listener-state assoc :active? true))    
    (data-response {:message "Listener started"})
    (catch Exception e 
      (println e)
      (data-response {:message "Error starting listener"
                      :error (str e)}))))

(comment
  (let [project-name (:project-name (get-config :gcs-integration ) "foo")
                                   topic-name (:topic-name   (get-config :gcs-integration) "MySub")]
                               (gcloud-listener project-name topic-name)))

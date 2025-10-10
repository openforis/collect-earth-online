(ns collect-earth-online.gcloud
  (:require [collect-earth-online.sse      :refer [broadcast!]]
            [collect-earth-online.db.geoai :refer [search-plot-by-similarity]]
            [triangulum.type-conversion    :as tc]
            [jonotin.core                  :refer [subscribe!]]
            [triangulum.response           :refer [data-response]]
            [triangulum.database           :refer [call-sql]]
            [triangulum.config             :refer [get-config]]))

(defonce listener-state
  (atom {:active? false
         :last-message nil}))

(defn respond [msg]
  (try
    (let [response            (tc/json->clj msg)
          [_ project-id year] (re-find #"ceo-(\d+)-plots_(\d+)\.geojson" (:source_file response))
          table-name          (:processed_table response)
          plot-id             (:reference_plot_rid (call-sql "select_project_by_id" (tc/val->int project-id)))]
      (call-sql "update_geoai_assets" (tc/val->int project-id) (tc/clj->jsonb {year table-name}))
      (search-plot-by-similarity (tc/val->int project-id) plot-id year)
      (broadcast! {:status msg})
      (swap! listener-state assoc :last-message msg))
    (catch Exception e
      (println "Error broadcasting Pub/Sub message:" (.getMessage e)))))

(defn gcloud-listener [project-name subscription-name]
  (when-not (:active? @listener-state)
    (future
      (try
        (subscribe! {:project-name project-name
                     :subscription-name subscription-name
                     :handle-msg-fn respond
                     :handler-error-fn
                     (fn [err]
                       (println "GCloud Pub/Sub listener error:" err)
                       (swap! listener-state assoc :active? false))})
        (println "Listener started")
        (swap! listener-state assoc :active? true)
        (catch Exception e
          (println "Error starting listener:" (.getMessage e))
          (swap! listener-state assoc :active? false))))))

(defn gcloud-handler [{:keys [params session]}]
  (try
    (when-not (:active? @listener-state)
      (gcloud-listener
       (get-config :gcs-integration :project-name)
       (get-config :gcs-integration :topic-name))
      (swap! listener-state assoc :active? true))    
    (data-response {:message "Listener started"})
    (catch Exception e 
      (println e)
      (data-response {:message "Error starting listener"
                      :error (str e)}))))

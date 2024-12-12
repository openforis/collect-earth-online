(ns collect-earth-online.db.metrics
  (:require
   [triangulum.database :refer [call-sql sql-primitive]]
   [triangulum.response :refer [data-response]]
   [triangulum.logging  :refer [log]]))

(defn show-metrics-user [user-id]
  (sql-primitive (call-sql "show_metrics_user" user-id)))

(defn get-imagery-counts [{:keys [params session]}]
  (try
    (let [start-date (:startDate params)
          end-date   (:endDate params)]
      (->> (call-sql "get_imagery_counts" start-date end-date)
           (mapv (fn [{:keys [imagery_id imagery_name user_plot_count start_date end_date]}]
                   {:imageryId   imagery_id
                    :imageryName imagery_name
                    :plots   user_plot_count
                    :startDate   start_date 
                    :endDate     end_date}))
           (data-response)))
    (catch Exception e
      (let [causes (:causes (ex-data e))]
        (log (ex-message e))
        (when-not causes (log (ex-message e)))
        (data-response "Internal server error." {:status 500})))))

(defn get-projects-with-gee [{:keys [params session]}]
  (let [start-date (:startDate params)
        end-date   (:endDate params)]
    (->> (call-sql "get_projects_with_gee" start-date end-date)
         (mapv (fn [{:keys [show_gee_script project_count start_date end_date]}]
                 {:showGeeScript  show_gee_script
                  :projects       project_count
                  :startDate      start_date
                  :endDate        end_date}))
         (data-response))))

(defn get-sample-plot-counts [{:keys [params session]}]
  (try
    (let [start-date (:startDate params)
          end-date   (:endDate params)]
      (->> (call-sql "get_sample_plot_counts" start-date end-date)
           (mapv (fn [{:keys [user_plot_count total_sample_count distinct_project_count start_date end_date]}]
                   {:userPlots            user_plot_count
                    :totalSamples         total_sample_count
                    :distinctProjects     distinct_project_count
                    :startDate            start_date 
                    :endDate              end_date}))
           (data-response)))
    (catch Exception e
      (let [causes (:causes (ex-data e))]
        (log (ex-message e))
        (when-not causes (log (ex-message e)))
        (data-response "Internal server error." {:status 500})))))

(defn get-project-count [{:keys [params session]}]
  (try
    (let [start-date (:startDate params)
          end-date   (:endDate params)]
      (->> (call-sql "get_project_count" start-date end-date)
           (mapv (fn [{:keys [project_count start_date end_date]}]
                   {:projects     project_count
                    :startDate    (str start_date)  ;; Convert to string
                    :endDate      (str end_date)})) ;; Convert to string
           (data-response)))
    (catch Exception e
      (let [causes (:causes (ex-data e))]
        (log (ex-message e))
        (when-not causes (log (ex-message e)))
        (data-response "Internal server error." {:status 500})))))


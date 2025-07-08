(ns collect-earth-online.db.metrics
  (:require
    [triangulum.database :refer [call-sql sql-primitive]]
    [triangulum.response :refer [data-response]]
    [triangulum.logging  :refer [log]]
    [clojure.string :as str]))

(defn validate-dates [params]
  (let [start-date (:startDate params)
        end-date   (:endDate params)]
    (cond
      (and start-date end-date) {:valid true}
      (and (not start-date) (not end-date))
        {:valid false
         :message "Missing parameters: startDate and endDate are required."}
      (not start-date)
        {:valid false
         :message "Missing parameter: startDate is required."}
      (not end-date)
        {:valid false
         :message "Missing parameter: endDate is required."})))

(defn validation-error-response [message]
  (data-response message {:status 400}))

(defn show-metrics-user [user-id]
  (try
    (sql-primitive (call-sql "show_metrics_user" user-id))
    (catch Exception e
      (log (ex-message e))
      (data-response "Internal server error." {:status 500}))))

(defn get-imagery-counts [{:keys [params session]}]
  (let [validation (validate-dates params)]
    (if (:valid validation)
      (try
        (let [start-date (:startDate params)
              end-date   (:endDate params)]
          (->> (call-sql "get_imagery_counts" start-date end-date)
               (mapv (fn [{:keys [imagery_id imagery_name user_plot_count start_date end_date]}]
                       {:imageryId   imagery_id
                        :imageryName imagery_name
                        :plots       user_plot_count
                        :startDate   start_date 
                        :endDate     end_date}))
               (data-response)))
        (catch Exception e
          (log (ex-message e))
          (data-response "Internal server error." {:status 500})))
      (validation-error-response (:message validation)))))

(defn get-projects-with-gee [{:keys [params session]}]
  (let [validation (validate-dates params)]
    (if (:valid validation)
      (try
        (let [start-date (:startDate params)
              end-date   (:endDate params)]
          (->> (call-sql "get_projects_with_gee" start-date end-date)
               (mapv (fn [{:keys [show_gee_script project_count start_date end_date]}]
                       {:showGeeScript show_gee_script
                        :projects      project_count
                        :startDate     start_date
                        :endDate       end_date}))
               (data-response)))
        (catch Exception e
          (log (ex-message e))
          (data-response "Internal server error." {:status 500})))
      (validation-error-response (:message validation)))))

(defn get-sample-plot-counts [{:keys [params session]}]
  (let [validation (validate-dates params)]
    (if (:valid validation)
      (try
        (let [start-date (:startDate params)
              end-date   (:endDate params)]
          (->> (call-sql "get_sample_plot_counts" start-date end-date)
               (mapv (fn [{:keys [user_plot_count total_sample_count distinct_project_count start_date end_date]}]
                       {:userPlots          user_plot_count
                        :totalSamples       total_sample_count
                        :distinctProjects   distinct_project_count
                        :startDate          start_date 
                        :endDate            end_date}))
               (data-response)))
        (catch Exception e
          (log (ex-message e))
          (data-response "Internal server error." {:status 500})))
      (validation-error-response (:message validation)))))

(defn get-project-count [{:keys [params session]}]
  (let [validation (validate-dates params)]
    (if (:valid validation)
      (try
        (let [start-date (:startDate params)
              end-date   (:endDate params)]
          (->> (call-sql "get_project_count" start-date end-date)
               (mapv (fn [{:keys [project_count start_date end_date]}]
                       {:projects  project_count
                        :startDate (str start_date)
                        :endDate   (str end_date)}))
               (data-response)))
        (catch Exception e
          (log (ex-message e))
          (data-response "Internal server error." {:status 500})))
      (validation-error-response (:message validation)))))

(defn get-plot-imagery [{:keys [params session]}]
  (let [validation (validate-dates params)]
    (if (:valid validation)
      (try
        (let [rows (call-sql "get_plot_imagery_by_user" (:userId params))])
        (catch Exception e
          (log (ex-message e))
          (data-response "Internal server error." {:status 500})))
      (validation-error-response (:message validation)))))

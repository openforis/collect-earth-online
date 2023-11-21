(ns collect-earth-online.db.doi
  (:require [clj-http.client                               :as http]
            [clojure.data.json                             :as json]
            [clojure.java.io                               :as io]
            [collect-earth-online.generators.external-file :refer [create-and-zip-files-for-doi]]
            [triangulum.config                             :refer [get-config]]
            [triangulum.database                           :refer [call-sql sql-primitive]]
            [triangulum.response                           :refer [data-response]]
            [triangulum.type-conversion                    :as tc])
  (:import java.time.LocalDateTime
           java.time.format.DateTimeFormatter))

(def base-url (get-config :zenodo :url))

(defn req-headers
  []
  (let [auth-token (get-config :zenodo :api-key)]
    {"Authorization" (str "Bearer " auth-token)}))

(defn get-zenodo-deposition
  [deposition-id]
  (let [headers (req-headers)]
    (http/get (str base-url "/deposit/depositions/" deposition-id) {:headers headers :as :json})))

(defn get-doi-reference
  [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        doi-path   (:doi_path (last (call-sql "select_doi_by_project" project-id)))]
    (data-response {:doiPath doi-path})))

(defn create-contributors-list
  [users institution-name]
  (map (fn [user]
         {:name        (:email user)
          :type        "DataCurator"
          :affiliation institution-name})
       users))

(defn create-zenodo-deposition!
  [institution-name
   project-name
   user
   users-assigned
   description]
  (let [headers  (req-headers)
        metadata {:upload_type      "dataset"
                  :title            (str institution-name "_" project-name)
                  :publication_date (-> (DateTimeFormatter/ofPattern "yyyy-MM-dd")
                                        (.format (LocalDateTime/now)))
                  :creators         [{:name        (:email user)
                                      :affiliation institution-name}]
                  :description      description
                  :contributors     (create-contributors-list users-assigned institution-name)}]
    (http/post (str base-url "/deposit/depositions")
               {:form-params  {:metadata metadata}
                :content-type :json
                :as           :json
                :headers      headers})))

(defn insert-doi!
  [{:keys [id metadata] :as doi-info}
   project-id user-id]
  (let [doi-path (-> metadata :prereserve_doi :doi)]
    (sql-primitive
     (call-sql "insert_doi" id project-id user-id doi-path (tc/clj->jsonb doi-info)))))

(defn build-survey-data
  [plot-data]
  (reduce (fn [acc surv]
            (let [edn-sample-data (tc/jsonb->clj (:samples surv))]
              (conj acc
                    {:email             (:email surv)
                     :analysis_duration (:analysis_duration surv)
                     :collection_time   (-> surv :collection_time str)
                     :flagged           (:flagged surv)
                     :flagged_reason    (:flagged_reason surv)
                     :confidence        (:confidence surv)
                     :answers           (group-by (fn [s] (-> s :id)) edn-sample-data)})))
          [] plot-data))

(defn merge-plot-data
  [plot-data]
  (let [merged-plot-data (apply merge plot-data)
        survey-data      (build-survey-data plot-data)]
    (-> (select-keys merged-plot-data [:center_lat
                                       :center_lon
                                       :extra_plot_info
                                       :total_securewatch_dates
                                       :size_m
                                       :shape
                                       :common_securewatch_date])
        (update :extra_plot_info tc/jsonb->clj)
        (assoc :survey survey-data))))

(defn group-plot-data
  [plot-data]
  (->> plot-data
       (group-by (fn [s] (-> s :plotid str keyword)))
       (map (fn [[key value]]
              [key (merge-plot-data value)]))
       (into {})))

(defn get-project-data
  [project-id]
  (let [project-data (first (call-sql "select_project_info_for_doi" project-id))
        plot-data    (call-sql "dump_project_plot_data" project-id)]
    (-> project-data
        (assoc :plot_info (group-plot-data plot-data))
        (update :survey_rules #(tc/jsonb->clj %))
        (update :survey_questions #(tc/jsonb->clj %))
        (update :aoi_features #(tc/jsonb->clj %))
        (update :created_date #(str %))
        (update :closed_date (fn [x] (when x (str x))))
        (update :published_date #(str %)))))

(defn upload-deposition-files!
  [doi-id zip-file]
  (let [headers    (req-headers)]
    (http/post (str base-url "/deposit/depositions/" doi-id "/files")
               {:headers      headers
                :multipart    [{:name "Content/type" :content "application/octet-stream"}
                               {:name "file" :content (io/file zip-file)}]})))

(defn upload-doi-files!
  [doi-id project-id]
  (let [project-id   project-id
        doi          (first (call-sql "select_doi_by_id" doi-id))
        project-data (json/write-str (get-project-data project-id))
        zip-file     (create-and-zip-files-for-doi project-id project-data)]
    (try
      (:body (upload-deposition-files! (:doi_uid doi) zip-file))
      (catch Exception e
        (throw (ex-info "Failed to upload files."
                        {:details "Error in file upload to zenodo"}))))))

(defn create-doi!
  [{:keys [params session]}]
  (let [user-id            (:userId session -1)
        project-id         (:projectId params)
        project-name       (:projectName params)
        institution-name   (:name (first (call-sql "select_institution_by_id" (-> params :institution) user-id)))
        description        (:description params)
        creator            (first (call-sql "get_user_by_id" user-id))
        contributors       (call-sql "select_assigned_users_by_project" project-id)
        project-published? (:availability (first (call-sql "select_project_by_id" project-id)))
        doi-published?     (:submitted (last (call-sql "select_doi_by_project" project-id)))]
    (cond
      (and (not= "published" project-published?)
           (not= "closed"    project-published?)) (data-response {:message "In order to create a DOI, the project must be published"}
                                                                {:status 500})
      doi-published? (data-response {:message "A DOI for this project has already been published."}
                                    {:status 500})
      :else
      (try
        (->
         (create-zenodo-deposition! institution-name project-name creator contributors description)
         :body
         (insert-doi! project-id user-id)
         (upload-doi-files! project-id))
        (data-response {:message "DOI created successfully"})
        (catch Exception _
          (data-response {:message "Failed to create DOI."}
                         {:status 500}))))))

(defn publish-doi!
  "request zenodo to publish the DOI on DataCite"
  [{:keys [params]}]
  (let [project-id (:projectId params)
        doi-id     (:doi_uid (last (call-sql "select_doi_by_project" project-id)))
        req        (http/post (str base-url "/deposit/depositions/" doi-id "/actions/publish")
                              {:as :json
                               :headers (req-headers)})]
    (try
      (call-sql "update_doi" doi-id (tc/clj->jsonb (:body req)))
      (data-response {})
      (catch Exception _
        (data-response {:message "Failed to publish DOI"}
                       {:status 500})))))

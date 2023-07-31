(ns collect-earth-online.db.doi
  (:require
    [clj-http.client                               :as http]
    [clojure.data.json                             :as json]
    [clojure.java.io                               :as io]
    [collect-earth-online.generators.external-file :refer [create-and-zip-files-for-doi]]
    [collect-earth-online.views                    :refer [data-response]]
    [triangulum.config                             :refer [get-config]]
    [triangulum.database                           :refer [call-sql]]
    [triangulum.type-conversion                    :as tc])
  (:import
    java.time.LocalDateTime
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
    (first
      (call-sql "insert_doi" id project-id user-id doi-path (tc/clj->jsonb doi-info)))))

(defn create-doi!
  [{:keys [params]}]
  (let [user-id          (:userId params -1)
        project-id       (tc/val->int (:projectId params))
        project-name     (:projectName params)
        institution-name (:institution params)
        description      (:description params)
        creator          (first (call-sql "get_user_by_id" user-id))
        contributors     (call-sql "select_assigned_users_by_project" project-id)]
    (->
      (create-zenodo-deposition! institution-name project-name creator contributors description)
      :body
      (insert-doi! project-id user-id)
      data-response)))

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
    (-> merged-plot-data
        (dissoc :samples)
        (dissoc :email)
        (dissoc :analysis_duration)
        (dissoc :collection_time)
        (dissoc :flagged)
        (dissoc :flagged_reason)
        (dissoc :confidence)
        (assoc  :survey survey-data))))

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
        (assoc :plot-info (group-plot-data plot-data))
        (update :survey_rules #(tc/jsonb->clj %))
        (update :survey_questions #(tc/jsonb->clj %))
        (update :aoi_features #(tc/jsonb->clj %))
        (update :created_date #(str %))
        (update :published_date #(str %)))))

(defn upload-deposition-files!
  [bucket-url project-id zip-file]
  (let [headers    (req-headers)]
    (http/put (str bucket-url "/" project-id "-files" ".zip")
              {:content-type :multipart/form-data
               :headers      headers
               :multipart    [{:name "Content/type" :content "application/zip"}
                              {:name "file" :content (io/file zip-file)}]})))

(defn upload-doi-files!
  [{:keys [params]}]
  (let [project-id   (:projectId params)
        doi          (first (call-sql "select_doi_by_project" project-id))
        bucket       (-> doi :full_data tc/jsonb->clj :links :bucket)
        project-data (json/write-str (get-project-data project-id))
        zip-file     (create-and-zip-files-for-doi project-id project-data)]
    (upload-deposition-files! bucket project-id zip-file)
    (data-response {})))

(defn download-doi-files
  [{:keys [params]}]
  (let [project-id (:projectId params)
        doi (first (call-sql "select_doi_by_project" project-id))
        bucket (-> doi :full_data tc/jsonb->clj :links :bucket)]
    (data-response (str bucket "/" project-id "-files.zip"))))

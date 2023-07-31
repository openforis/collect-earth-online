(ns collect-earth-online.db.doi
  (:require [clj-http.client                               :as http]
            [clojure.java.io                               :as io]
            [collect-earth-online.generators.external-file :refer [create-shape-files]]
            [triangulum.config                             :refer [get-config]]
            [triangulum.database                           :refer [call-sql
                                                                   sql-primitive]]
            [triangulum.response                           :refer [data-response]]
            [triangulum.type-conversion                    :as tc])
  (:import java.time.format.DateTimeFormatter
           java.time.LocalDateTime))

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

(defn upload-deposition-file!
  [bucket-url project-id table-name]
  (let [headers    (req-headers)
        shape-file (create-shape-files table-name project-id)]
    (http/put (str bucket-url "/" table-name "-" project-id ".zip")
              {:content-type :multipart/form-data
               :headers      headers
               :multipart    [{:name "Content/type" :content "application/zip"}
                              {:name "file" :content (io/file shape-file)}]})))

(defn insert-doi!
  [{:keys [id metadata] :as doi-info}
   project-id user-id]
  (let [doi-path (-> metadata :prereserve_doi :doi)]
    (-> "insert_doi"
        (call-sql id project-id user-id doi-path doi-info)
        first
        sql-primitive)))

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
     (data-response))))

(defn upload-doi-files!
  [{:keys [params]}]
  (let [project-id (:projectId params)
        doi        (first (call-sql "select_doi_by_project" project-id))
        bucket     (-> doi :links :bucket)
        options    (:options params)]
    (upload-deposition-file! bucket project-id options)))

(ns collect-earth-online.db.doi
  (:require [clj-http.client :as http]
            [clojure.java.io :as io]
            [triangulum.database :refer [call-sql
                                         insert-rows!]]
            [triangulum.type-conversion :as tc]
            [collect-earth-online.generators.external-file :refer [create-shape-files]])
  (:import java.time.format.DateTimeFormatter
           java.time.LocalDateTime))

(def auth-token "jAzGJCULvXi6HQNCIPNc1oL2wMJoW3LiDnyPXfDk4eb59ONrecKA08TejQe5")

(def base-url "https://sandbox.zenodo.org/api")

(defn req-headers
  [auth-token]
  {"Authorization" (str "Bearer " auth-token)})

(defn get-zenodo-deposition
  [deposition-id]
  (let [headers (req-headers auth-token)]
    (http/get (str base-url "/deposit/depositions/" deposition-id) {:headers headers :as :json})))

(defn create-contributors-list
  [users institution-name]
  (map (fn [user]
         {:name (:name user)
          :type "DataCurator"
          :affiliation institution-name})
       users))


(defn create-zenodo-deposition
  [institution-name
   project-name
   user users-assigned
   description]
  (let [headers  (req-headers auth-token)
        metadata {:upload_type      "dataset"
                  :title            (str institution-name "_" project-name)
                  :publication_date (-> (DateTimeFormatter/ofPattern "yyyy-MM-dd")
                                        (.format (LocalDateTime/now)))
                  :creators         [{:name        (:name user)
                                      :affiliation institution-name}]
                  :description description
                  :contributors     (create-contributors-list users-assigned institution-name)}]
    (http/post (str base-url "/deposit/depositions")
                 {:form-params  {:metadata metadata}
                  :content-type :json
                  :as           :json
                  :headers      headers})))

(defn deposition-upload-file
  [bucket-url project-id table-name]
  (let [headers    (req-headers auth-token)
        shape-file (create-shape-files table-name project-id)]
    (http/put (str bucket-url "/" table-name "-" project-id ".zip")
              {:content-type :multipart/form-data
               :headers   headers
               :multipart [{:name "Content/type" :content "application/zip"}
                           {:name "file" :content (io/file shape-file)}]})))


(defn create-doi
  [{:keys [params]}]
  (let [user-id (:userId params -1)
        project-id (tc/val->int (:projectId params))
        institution-id (tc/val->int (:institution params))
        creator (first (call-sql "get_user_by_id" user-id))
        contributors (call-sql "select_assigned_users_by_project" project-id)]
    (println creator)
    (println contributors)))

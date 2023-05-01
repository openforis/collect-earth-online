(ns collect-earth-online.db.doi
  (:require [clj-http.client :as http]
            [collect-earth-online.generators.external-file :refer [create-shape-files]])
  (:import java.time.format.DateTimeFormatter
           java.time.LocalDateTime))

(def auth-token "jAzGJCULvXi6HQNCIPNc1oL2wMJoW3LiDnyPXfDk4eb59ONrecKA08TejQe5")

(def base-url "https://sandbox.zenodo.org/api")

(defn req-headers
  [auth-token]
  {"Authorization" (str "Bearer " auth-token)})

(defn get-deposition
  [deposition-id]
  (let [headers (req-headers auth-token)]
    (http/get (str base-url "/deposit/depositions/" deposition-id) {:headers headers})))

(defn create-contributors-list
  [users institution-name]
  (map (fn [user]
         {:name (:name user)
          :type "DataCurator"
          :affiliation institution-name})
       users))


(defn create-doi
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

(defn upload-file
  [deposition-id project-id table-name]
  (let [headers      (req-headers auth-token)
        shape-file   (create-shape-files table-name project-id)]
    (http/post (str base-url "/deposit/depositions/" deposition-id "/files")
               {:headers headers
                :multipart {:name (str table-name "-" project-id)
                            :content (clojure/java.io/file shape-file)}})))

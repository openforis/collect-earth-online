(ns org.openforis.ceo.db.institutions
  (:import java.util.Date)
  (:require [clojure.string    :as str]
            [clojure.data.json :as json]
            [org.openforis.ceo.database :refer [call-sql sql-primitive]]
            [org.openforis.ceo.views    :refer [data-response]]))

(defn is-inst-admin-query? [user-id institution-id]
  (sql-primitive (call-sql "is_institution_user_admin" user-id institution-id)))

(defn is-inst-admin? [{:keys [params]}]
  (let [user-id        (Integer/parseInt (or (:userId params) "-1"))
        institution-id (Integer/parseInt (or (:institutionId params) "0"))]
    (is-inst-admin-query? user-id institution-id)))

(defn- prepare-institution [{:keys [institution_id name logo description url archived members admins pending]}]
  {:id          institution_id
   :name        name
   :logo        (str logo "?t=" (Date.))
   :description description
   :url         url
   :archived    archived
   :members     (json/read-str members)
   :admins      (json/read-str admins)
   :pending     (json/read-str pending)})

(defn get-all-institutions [_]
  (->> (call-sql "select_all_institutions")
       (mapv prepare-institution)
       (data-response)))

(defn get-institution-by-id [institution-id]
  (if-let [institution (first (call-sql "select_institution_by_id" institution-id))]
    (prepare-institution institution)
    {:id           -1
     :name         (str "No institution with ID=" institution-id)
     :logo         ""
     :description  ""
     :url          ""
     :archived     false
     :members      []
     :admins       []
     :pending      []}))

(defn get-institution-details [{:keys [params]}]
  (let [institution-id (Integer/parseInt (:institutionId params))]
    (data-response (get-institution-by-id institution-id))))

;; NEEDS: write-file-part-base64 expand-resource-path
(defn create-institution [{:keys [params]}]
  (let [user-id      (Integer/parseInt (:userId params))
        name         (:name params)
        url          (:url params)
        logo         (:logo params)
        base64-image (:base64Image params)
        description  (:description params)]
    (if-let [institution-id (sql-primitive (call-sql "add_institution" name "" description url false))]
      (do
        (when-not (str/blank? logo)
          (let [logo-file-name (write-file-part-base64 logo
                                                       base64-image
                                                       (expand-resource-path "/public/img/institution-logos")
                                                       (str "institution-" institution-id))]
            (call-sql "update_institution_logo" institution-id (str "img/institution-logos/" logo-file-name))))
        (doseq [admin-id #{user-id 1}]
          (call-sql "add_institution_user" institution-id admin-id 1))
        (data-response institution-id))
      (data-response ""))))

;; NEEDS: write-file-part-base64 expand-resource-path
(defn update-institution [{:keys [params]}]
  (let [institution-id (Integer/parseInt (:institutionId params))
        name           (:name params)
        url            (:url params)
        logo           (:logo params)
        base64-image   (:base64Image params)
        description    (:description params)]
    (if-let [institution (first (call-sql "select_institution_by_id" institution-id))]
      (let [logo-file-name (if (str/blank? logo)
                             (:logo institution)
                             (str "img/institution-logos/"
                                  (write-file-part-base64 logo
                                                          base64-image
                                                          (expand-resource-path "/public/img/institution-logos")
                                                          (str "institution-" institution-id))))]
        (call-sql "update_institution" institution-id name logo-file-name description url)
        (data-response institution-id))
      (data-response ""))))

(defn archive-institution [{:keys [params]}]
  (let [institution-id (Integer/parseInt (:institutionId params))]
    (call-sql "archive_institution" institution-id)
    (data-response institution-id)))

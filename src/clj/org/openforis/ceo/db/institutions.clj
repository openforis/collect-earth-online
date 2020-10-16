(ns org.openforis.ceo.db.institutions
  (:import java.util.Date)
  (:require [clojure.string :as str]
            [clojure.java.io :as io]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.database         :refer [call-sql sql-primitive]]
            [org.openforis.ceo.views            :refer [data-response]]
            [org.openforis.ceo.utils.part-utils :refer [write-file-part-base64]]))

(defn is-inst-admin-query? [user-id institution-id]
  (sql-primitive (call-sql "is_institution_admin" user-id institution-id)))

(defn is-inst-admin? [{:keys [params]}]
  (let [user-id        (:userId params -1)
        institution-id (tc/str->int (:institutionId params))]
    (and (pos? user-id)
         (pos? institution-id)
         (is-inst-admin-query? user-id institution-id))))

;; TODO the front end uses get-institution-members, don't return members here.
(defn- prepare-institution [{:keys [institution_id name logo description url archived members admins pending]}]
  {:id          institution_id
   :name        name
   :logo        (str logo "?t=" (Date.))
   :description description
   :url         url
   :archived    archived
   :members     (tc/jsonb->clj members)
   :admins      (tc/jsonb->clj admins)
   :pending     (tc/jsonb->clj pending)})

(defn get-all-institutions [_]
  (->> (call-sql "select_all_institutions")
       (mapv prepare-institution)
       (data-response)))

;; TODO: Return an error instead of an empty institution map
(defn- get-institution-by-id [institution-id]
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
  (let [institution-id (tc/str->int (:institutionId params))]
    (data-response (get-institution-by-id institution-id))))

(defn create-institution [{:keys [params]}]
  (let [user-id      (:userId params -1)
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
                                                       (io/resource "public/img/institution-logos/")
                                                       (str "institution-" institution-id))]
            (call-sql "update_institution_logo" institution-id (str "img/institution-logos/" logo-file-name))))
        (doseq [admin-id (set [user-id 1])]
          (call-sql "add_institution_user" institution-id admin-id 1))
        (data-response institution-id))
      (data-response ""))))

(defn update-institution [{:keys [params]}]
  (let [institution-id (tc/str->int (:institutionId params))
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
                                                          (io/resource "public/img/institution-logos/")
                                                          (str "institution-" institution-id))))]
        (call-sql "update_institution" institution-id name logo-file-name description url)
        (data-response ""))
      (data-response "")))) ; FIXME: Return "Institution not found." and update front-end code accordingly.

(defn archive-institution [{:keys [params]}]
  (let [institution-id (tc/str->int (:institutionId params))]
    (call-sql "archive_institution" institution-id)
    (data-response "")))

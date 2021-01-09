(ns org.openforis.ceo.db.institutions
  (:require [clojure.string :as str]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.database         :refer [call-sql sql-primitive]]
            [org.openforis.ceo.views            :refer [data-response]]))

(defn is-inst-admin? [user-id institution-id]
  (and (pos? user-id)
       (pos? institution-id)
       (sql-primitive (call-sql "is_institution_admin" {:log? false} user-id institution-id))))

;; TODO: this is only used on the home page.  Can drop all the role arrays for a single institutionMember column.
(defn- prepare-institution [{:keys [institution_id name description url members admins pending]}]
  {:id          institution_id
   :name        name
   :description description
   :url         url
   :members     (tc/jsonb->clj members)
   :admins      (tc/jsonb->clj admins)
   :pending     (tc/jsonb->clj pending)})

(defn get-all-institutions [_]
  (->> (call-sql "select_all_institutions")
       (mapv prepare-institution)
       (data-response)))

(defn get-institution-details [{:keys [params]}]
  (let [institution-id (tc/val->int (:institutionId params))
        user-id        (:userId params -1)]
    (if-let [institution (first (call-sql "select_institution_by_id" institution-id user-id))]
      (data-response (let [{:keys [name base64_image url description institution_admin]} institution]
                       {:name             name
                        :url              url
                        :description      description
                        :institutionAdmin institution_admin
                        :base64Image      base64_image})) ; base64Image is last so it does not appear in the logs.
      (data-response (str "Institution " institution-id " is not found.")))))

(defn create-institution [{:keys [params]}]
  (let [user-id      (:userId params -1)
        name         (:name params)
        base64-image (:base64Image params)
        url          (:url params)
        description  (:description params)]
    (if-let [institution-id (sql-primitive (call-sql "add_institution" name url description))]
      (do
        (when (pos? (count base64-image))
          (call-sql "update_institution_logo" {:log? false} institution-id (second (str/split base64-image #","))))
        (doseq [admin-id (set [user-id 1])]
          (call-sql "add_institution_user" institution-id admin-id 1))
        (data-response institution-id))
      (data-response ""))))

(defn update-institution [{:keys [params]}]
  (let [user-id        (:userId params -1)
        institution-id (tc/val->int (:institutionId params))
        name           (:name params)
        base64-image   (:base64Image params)
        url            (:url params)
        description    (:description params)]
    (if (first (call-sql "select_institution_by_id" institution-id user-id))
      (do
        (call-sql "update_institution" institution-id name url description)
        (when (pos? (count base64-image))
          (call-sql "update_institution_logo" {:log? false} institution-id (second (str/split base64-image #","))))
        (data-response ""))
      (data-response (str "Institution " institution-id " is not found.")))))

(defn archive-institution [{:keys [params]}]
  (let [institution-id (tc/val->int (:institutionId params))]
    (call-sql "archive_institution" institution-id)
    (data-response "")))

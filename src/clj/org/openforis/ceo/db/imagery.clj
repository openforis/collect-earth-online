(ns org.openforis.ceo.db.imagery
  (:require [clojure.data.json :as json]
            [org.openforis.ceo.database :refer [call-sql sql-primitive]]
            [org.openforis.ceo.db.institutions :refer [is-inst-admin-query]] ; FIXME this function has not yet been converted in institutions
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.views :refer [data-response]]))

(defn- clean-source [sourceConfig]
  (if (#{"GeoServer" "SecureWatch" "Planet"})
    (select-keys sourceConfig [:type :startDate :endDate :month :year])
    sourceConfig))

(defn- map-imagery [imagery admin?]
  (mapv (fn [{:keys [imagery_id institution_id visibility title attribution extent source_config]}]
          {:id           imagery_id ; FIXME, legacy variable name, update to imageryId
           :institution  institution_id ; FIXME, legacy variable name, update to institutionId
           :visibility   visibility
           :title        title
           :attribution  attribution
           :extent       extent
           :sourceConfig (if admin? source_config (clean-source source_config))})
        imagery))

(defn get-institution-imagery [{:keys [params]}]
  (let [institution-id (tc/str->int (:institutionId params))
        user-id        (tc/str->int (:userId params))]
    (data-response (map-imagery (call-sql "select_imagery_by_institution" institution-id user-id)
                                (is-inst-admin-query user-id institution-id)))))

(defn get-project-imagery [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        user-id    (tc/str->int (:userId params))
        token-key  (:token-key params)] ; TODO, what case are we using for the session?
    (data-response (map-imagery (call-sql "select_imagery_by_project" project-id user-id token-key)
                                false))))

(defn get-public-imagery [_]
  (data-response (map-imagery (call-sql "select_public_imagery")
                              false)))

(defn get-imagery-source-config [imagery-id]
  (data-response (sql-primitive (call-sql "select_imagery_source_config" imagery-id)))) ; FIXME this SQL function does not yet exist

(defn add-institution-imagery [{:keys [params]}]
  (let [institution-id       (tc/str->int (:institutionId params))
        imagery-title        (:imageryTitle params)
        imagery-attribution  (:imageryAttribution params)
        source-config        (json/read-str (:sourceConfig params)) ; TODO is this needed?
        add-to-all-projects? (tc/str-bool (:addToAllProjects params) true)]
    (if (sql-primitive (call-sql "check_institution_imagery")) ; TODO this SQL function name is unclear
      (data-response "The title you have chosen is already taken")
      (let [new-imagery-id (call-sql "add_institution_imagery"
                                     institution-id
                                     "private"
                                     imagery-title
                                     imagery-attribution
                                     nil ; FIXME, this was being saved a string to match JSON, create update query to replace "null" with NULL
                                     source-config)]
        (when add-to-all-projects?
          (call-sql "add_imagery_to_all_institution_projects" new-imagery-id))
        (data-response "")))))

;; TODO this should not be needed. Just build the source config on the front end and reuse add-institution-imagery
(defn add-geodash-imagery [{:keys [params]}]
  (let [institution-id      (tc/str->int (:institutionId params))
        imagery-title       (:imageryTitle params)
        imagery-attribution (:imageryAttribution params)
        gee-url             (:geeUrl params)
        gee-params          (json/read-str (:geeParam params))
        source-config       {:type      "GeeGateway"
                             :geeUrl    gee-url
                             :geeParams gee-params}]
    (if (sql-primitive (call-sql "check_institution_imagery"))
      (data-response "The title you have chosen is already taken")
      (do
        (call-sql "add_institution_imagery"
                  institution-id
                  "private"
                  imagery-title
                  imagery-attribution
                  nil
                  source-config)
        (data-response "")))))

(defn update-institution-imagery [{:keys [params]}]
  (let [imagery-id           (tc/str->int (:imageryId params))
        imagery-title        (:imageryTitle params) ;TODO there is no backend check for uniqueness. check_institution_imagery needs to be updated to handle existing imagery
        imagery-attribution  (:imageryAttribution params)
        source-config        (json/read-str (:sourceConfig params))
        add-to-all-projects? (tc/str-bool (:addToAllProjects params) true)]
    (call-sql "update_institution_imagery"
              imagery-id
              imagery-title
              imagery-attribution
              source-config)
    (when add-to-all-projects?
      (call-sql "add_imagery_to_all_institution_projects" imagery-id))
    (data-response "")))

(defn archive-institution-imagery [{:keys [params]}]
  (call-sql "archive_imagery" (tc/str->int (:imageryId params)))
  (data-response ""))

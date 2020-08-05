(ns org.openforis.ceo.db.imagery
  (:require [org.openforis.ceo.database :refer [call-sql sql-primitive]]
            [org.openforis.ceo.db.institutions :refer [is-inst-admin-query?]]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.views :refer [data-response]]))

(defn- clean-source [source-config]
  (if (#{"GeoServer" "SecureWatch" "Planet"} (:type source-config))
    (dissoc source-config [:geoserverParams :accessToken])
    source-config))

(defn- prepare-imagery [imagery admin?]
  (mapv (fn [{:keys [imagery_id institution_id visibility title attribution extent source_config]}]
          (let [source-config (tc/jsonb->clj source_config)]
            {:id           imagery_id
             :institution  institution_id ; FIXME, legacy variable name, update to institutionId
             :visibility   visibility
             :title        title
             :attribution  attribution
             :extent       (tc/jsonb->clj extent)
             :sourceConfig (if admin? source-config (clean-source source-config))}))
        imagery))

(defn get-institution-imagery [{:keys [params]}]
  (let [institution-id (tc/str->int (:institutionId params))
        user-id        (tc/str->int (:userId params))]
    (data-response (prepare-imagery (call-sql "select_imagery_by_institution" institution-id user-id)
                                    (is-inst-admin-query? user-id institution-id)))))

(defn get-project-imagery [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        user-id    (tc/str->int (:userId params))
        token-key   (:tokenKey params)]
    (data-response (prepare-imagery (call-sql "select_imagery_by_project" project-id user-id token-key)
                                    false))))

(defn get-public-imagery [_]
  (data-response (prepare-imagery (call-sql "select_public_imagery")
                                  false)))

(defn- get-imagery-by-id [imagery-id]
  (first (call-sql "select_imagery_by_id" imagery-id)))

(defn get-imagery-source-config [imagery-id]
  (if-let [source-config (:source_config (get-imagery-by-id imagery-id))]
    (tc/jsonb->clj source-config)
    {}))

(defn add-institution-imagery [{:keys [params]}]
  (let [institution-id       (tc/str->int (:institutionId params))
        imagery-title        (:imageryTitle params)
        imagery-attribution  (:imageryAttribution params)
        source-config        (tc/json->jsonb (:sourceConfig params))
        add-to-all-projects? (tc/str->bool (:addToAllProjects params) true)]
    (if (sql-primitive (call-sql "imagery_name_taken" institution-id imagery-title -1))
      (data-response "The title you have chosen is already taken.")
      (let [new-imagery-id (sql-primitive (call-sql "add_institution_imagery"
                                                    institution-id
                                                    "private"
                                                    imagery-title
                                                    imagery-attribution
                                                    nil
                                                    source-config))]
        (when add-to-all-projects?
          (call-sql "add_imagery_to_all_institution_projects" new-imagery-id))
        (data-response "")))))

;; TODO this should not be needed. Just build the source config on the front end and reuse add-institution-imagery
(defn add-geodash-imagery [{:keys [params]}]
  (let [institution-id      (tc/str->int (:institutionId params))
        imagery-title       (:imageryTitle params)
        imagery-attribution (:imageryAttribution params)
        gee-url             (:geeUrl params)
        gee-params          (tc/json->clj (:geeParams params))
        source-config       (tc/clj->jsonb {:type      "GeeGateway"
                                            :geeUrl    gee-url
                                            :geeParams gee-params})]
    (if (sql-primitive (call-sql "imagery_name_taken" institution-id imagery-title -1))
      (data-response "The title you have chosen is already taken.")
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
        imagery-title        (:imageryTitle params)
        imagery-attribution  (:imageryAttribution params)
        source-config        (tc/json->jsonb (:sourceConfig params))
        add-to-all-projects? (tc/str->bool (:addToAllProjects params) true)
        institution-id       (:institution_rid (get-imagery-by-id imagery-id))]
    (if (call-sql "imagery_name_taken" institution-id imagery-title imagery-id)
      (data-response "The title you have chosen is already taken.")
      (do
        (call-sql "update_institution_imagery"
                  imagery-id
                  imagery-title
                  imagery-attribution
                  source-config)
        (when add-to-all-projects?
          (call-sql "add_imagery_to_all_institution_projects" imagery-id))
        (data-response "")))))

(defn archive-institution-imagery [{:keys [params]}]
  (call-sql "archive_imagery" (tc/str->int (:imageryId params)))
  (data-response ""))

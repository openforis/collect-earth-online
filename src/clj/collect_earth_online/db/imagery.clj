(ns collect-earth-online.db.imagery
  (:require [triangulum.database :refer [call-sql sql-primitive]]
            [triangulum.type-conversion :as tc]
            [triangulum.utils :refer [data-response]]
            [collect-earth-online.db.institutions :refer [is-inst-admin?]]))

(defn- clean-source [source-config]
  (let [image-type (:type source-config)]
    (cond-> source-config
      (#{"GeoServer" "SecureWatch"} image-type) (dissoc source-config :geoserverParams)
      (#{"Planet" "PlanetNICFI"}    image-type) (dissoc source-config :accessToken))))

(defn- prepare-imagery [imagery inst-admin?]
  (mapv (fn [{:keys [imagery_id institution_id visibility title attribution extent is_proxied source_config]}]
          (let [source-config (tc/jsonb->clj source_config)]
            {:id           imagery_id
             :institution  institution_id ; FIXME, legacy variable name, update to institutionId
             :visibility   visibility
             :title        title
             :attribution  attribution
             :extent       (tc/jsonb->clj extent)
             :isProxied    is_proxied
             :sourceConfig (if (or inst-admin? (not is_proxied))
                             source-config
                             (clean-source source-config))}))
        imagery))

(defn get-institution-imagery [{:keys [params]}]
  (let [institution-id (tc/val->int (:institutionId params))
        user-id        (:userId params -1)]
    (data-response (prepare-imagery (call-sql "select_imagery_by_institution" institution-id user-id)
                                    (is-inst-admin? user-id institution-id)))))

(defn get-project-imagery [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        user-id    (:userId params -1)
        token-key  (:tokenKey params)]
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
  (let [institution-id       (tc/val->int (:institutionId params))
        imagery-title        (:imageryTitle params)
        imagery-attribution  (:imageryAttribution params)
        source-config        (tc/clj->jsonb (:sourceConfig params))
        is-proxied?          (tc/val->bool (:isProxied params))
        add-to-all-projects? (tc/val->bool (:addToAllProjects params) true)]
    (if (sql-primitive (call-sql "imagery_name_taken" institution-id imagery-title -1))
      (data-response "The title you have chosen is already taken.")
      (let [new-imagery-id (sql-primitive (call-sql "add_institution_imagery"
                                                    institution-id
                                                    "private"
                                                    imagery-title
                                                    imagery-attribution
                                                    nil
                                                    is-proxied?
                                                    source-config))]
        (when add-to-all-projects?
          (call-sql "add_imagery_to_all_institution_projects" new-imagery-id))
        (data-response "")))))

(defn update-institution-imagery [{:keys [params]}]
  (let [imagery-id           (tc/val->int (:imageryId params))
        imagery-title        (:imageryTitle params)
        imagery-attribution  (:imageryAttribution params)
        source-config        (tc/clj->jsonb (:sourceConfig params))
        is-proxied?          (tc/val->bool (:isProxied params))
        add-to-all-projects? (tc/val->bool (:addToAllProjects params) true)
        institution-id       (tc/val->int (:institutionId params))]
    (if (sql-primitive (call-sql "imagery_name_taken" institution-id imagery-title imagery-id))
      (data-response "The title you have chosen is already taken.")
      (do
        (call-sql "update_institution_imagery"
                  imagery-id
                  imagery-title
                  imagery-attribution
                  is-proxied?
                  source-config)
        (when add-to-all-projects?
          (call-sql "add_imagery_to_all_institution_projects" imagery-id))
        (data-response "")))))

(defn update-imagery-visibility [{:keys [params]}]
  (let [imagery-id     (tc/val->int (:imageryId params))
        visibility     (:visibility params)
        institution-id (tc/val->int (:institutionId params))]
    (call-sql "update_imagery_visibility" imagery-id visibility institution-id)
    (data-response "")))

(defn archive-institution-imagery [{:keys [params]}]
  (call-sql "archive_imagery" (tc/val->int (:imageryId params)))
  (data-response ""))

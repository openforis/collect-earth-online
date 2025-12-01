(ns collect-earth-online.db.geoai
  (:require [clj-http.client            :as http]
            [clojure.data.json          :as json]
            [triangulum.type-conversion :as tc]
            [triangulum.config          :refer [get-config]]
            [triangulum.database        :refer [call-sql sql-primitive]]
            [triangulum.response        :refer [data-response]]
            [clj-gcloud.storage         :as st]))

(defonce gcs-resource
  (st/init
<<<<<<< HEAD
   #_{:project-id  (get-config :gcs-integration :project-name)
=======
   {:project-id  (get-config :gcs-integration :project-name)
>>>>>>> release/plot-similarity
    :credentials (get-config :gcs-integration :credentials)}))


(defonce gs-url (get-config :gcs-integration :bucket-url))

(defn generate-geojson [project-id]
  (let [plots (call-sql "get_plots_as_geojson" project-id)]
    {:type "FeatureCollection"
     :name "alerts"
     :crs  {:type "name" :properties {:name "urn:ogc:def:crs:OGC:1.3:CRS84"}}
     :features (mapv (fn [p]
                       (-> p
                           (update-vals tc/jsonb->clj)
                           (assoc-in [:properties :plotid] (:id p))
                           (assoc :type "Feature")
                           (dissoc :id)))
                     plots)}))

(defn- upload-json-to-gcs [project-id file-name year]
  (let [geojson  (generate-geojson project-id)
        json-str (json/write-str geojson)
        tmp-file (java.io.File/createTempFile file-name ".geojson")
        bq-tablename (format "%s_embed%s_pp" file-name year)]
    (spit tmp-file json-str)
    (st/copy-file-to-storage gcs-resource tmp-file (str gs-url file-name ".geojson"))
    (call-sql "update_geoai_assets" (tc/val->int project-id) (tc/clj->jsonb {year bq-tablename}))
    gs-url))

(defn clj->int-array-literal
  [arr]
  (str "{" (clojure.string/join "," (map int arr)) "}"))

(defn search-plot-by-similarity
<<<<<<< HEAD
  [project-id plot-id year]
  (let [bq-table          (-> (call-sql "get_bq_table" project-id year)
                              (sql-primitive)
                              (clojure.string/split #"\.")
                              (last))
        req               (:body (http/get
                                  (str (get-config :gcs-integration :api-url) "/search")
                                  {:query-params {:uniqueid plot-id
                                                  :table    bq-table
                                                  :matches  50}}))
        similar-plots-arr (map #(get % :base_plotid) (tc/json->clj req))]
    (call-sql "insert_geoai_cache"
              project-id
              plot-id
              (clj->int-array-literal similar-plots-arr)
              (tc/clj->jsonb req))))
=======
  [project-id plot-id year plots]
  (let [bq-table   (-> (call-sql "get_bq_table" project-id year)
                       sql-primitive
                       (clojure.string/split #"\.")
                       last)
        base-url   (get-config :gcs-integration :api-url)
        search-url (str base-url "/search")
        plot-ids   (map :plot_uid plots)
        try-plot   (fn [pid]
                     (let [resp (http/get search-url
                                          {:query-params {:uniqueid pid
                                                          :table    bq-table
                                                          :matches  500}
                                           :throw-exceptions false})
                           parsed (tc/json->clj (:body resp))]
                       (when (seq parsed) {:plot-id pid :resp parsed})))]

    (if-let [{:keys [plot-id resp]} (or (try-plot plot-id)
                                        (some try-plot (take 15 plot-ids)))]
      (let [similar-ids        (map #(get % :base_plotid) resp)
            remaining-plot-ids (clojure.set/difference (set similar-ids) (set plot-ids))]
        (call-sql "insert_geoai_cache"
                  project-id
                  plot-id
                  (clj->int-array-literal (concat [plot-id] similar-ids (vec remaining-plot-ids)))
                  (tc/clj->jsonb resp))
        (call-sql "update_reference_plot" project-id plot-id))
      (throw (ex-info "❌ No non-empty results found after retries" {:project-id project-id})))))
>>>>>>> release/plot-similarity

(defn start-plot-similarity! [{:keys [params]}]
  (let [project-id        (:projectId params)
        reference-plot-id (tc/val->int (:referencePlotId params))
        similarity-years  (:similarityYears params)
        file-name         (str "ceo-" project-id "-plots_" (first similarity-years))
        plot-id           (sql-primitive (call-sql "get_plot_id_by_visible_id" project-id reference-plot-id))]
    (call-sql "update_reference_plot" project-id plot-id)
    (upload-json-to-gcs project-id file-name (first similarity-years))
    (data-response {:message "calculating plot similarity."})))

<<<<<<< HEAD
=======
(defn update-plot-similarity! [{:keys [params]}]
  (let [project-id        (:projectId params)
        reference-plot-id (tc/val->int (:referencePlotId params))
        plot-id           (sql-primitive (call-sql "get_plot_id_by_visible_id" project-id reference-plot-id))
        similarity-year   (tc/val->int (first (:similarityYears params)))
        file-name         (str "ceo-" project-id "-plots_" similarity-year)
        current-year      (tc/val->int (sql-primitive (call-sql"get_plot_similarity_year" project-id)))]
    (if (not= similarity-year current-year)
      (do
        (upload-json-to-gcs project-id file-name similarity-year)
        (call-sql "update_reference_plot" project-id plot-id)
        (data-response {:message "recalculating plot similarity for newly selected year."}))
      (do
        (call-sql "update_reference_plot" project-id plot-id)
        (data-response {:message "recalculating plot similarity."})))))

>>>>>>> release/plot-similarity
(defn recalculate-plot-similarity [{:keys [params]}]
  (let [project-id        (:projectId params)
        reference-plot-id (tc/val->int (:referencePlotId params))
        similarity-years  (:similarityYears params)
        file-name         (str "ceo-" project-id "-plots_" (first similarity-years))
<<<<<<< HEAD
        plot-id           (sql-primitive (call-sql "get_plot_id_by_visible_id" project-id reference-plot-id))]
    (try
      (search-plot-by-similarity project-id plot-id (first similarity-years))
=======
        plot-id           (sql-primitive (call-sql "get_plot_id_by_visible_id" project-id reference-plot-id))
        plots             (call-sql "select_plots_by_project" project-id)]
    (try
      (search-plot-by-similarity project-id plot-id (first similarity-years) plots)
>>>>>>> release/plot-similarity
      (data-response {:message "successfully reprocessed plot similarity"})
      (catch Exception ex
        (data-response {:message "error recalculating plot similarity"})))))

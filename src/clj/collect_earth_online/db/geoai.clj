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
   {:project-id  (get-config :gcs-integration :project-name)
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

(defn- upload-json-to-gcs [project-id file-name]
  (let [geojson  (generate-geojson project-id)
        json-str (json/write-str geojson)
        tmp-file (java.io.File/createTempFile file-name ".geojson")]
    (spit tmp-file json-str)
    (st/copy-file-to-storage gcs-resource tmp-file (str gs-url file-name ".geojson"))
    gs-url))

(defn clj->int-array-literal
  [arr]
  (str "{" (clojure.string/join "," (map int arr)) "}"))

(defn search-plot-by-similarity
  [project-id plot-id year]
  (let [bq-table          (->> (call-sql "get_bq_table" project-id (str year))
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

(defn start-plot-similarity! [{:keys [params]}]
  (let [project-id        (:projectId params)
        reference-plot-id (tc/val->int (:referencePlotId params))
        similarity-years  (:similarityYears params)
        file-name         (str "ceo-" project-id "-plots_" (first similarity-years))
        plot-id           (sql-primitive (call-sql "get_plot_id_by_visible_id" project-id reference-plot-id))]
    (call-sql "update_reference_plot" project-id plot-id)
    (upload-json-to-gcs project-id file-name)
    (data-response {:message "calculating plot similarity."})))

(defn recalculate-plot-similarity [{:keys [params]}]
  (let [project-id        (:projectId params)
        reference-plot-id (tc/val->int (:referencePlotId params))
        similarity-years  (:similarityYears params)
        file-name         (str "ceo-" project-id "-plots_" (first similarity-years))
        plot-id           (sql-primitive (call-sql "get_plot_id_by_visible_id" project-id reference-plot-id))]
    (try
      (search-plot-by-similarity project-id plot-id (first similarity-years))
      (data-response {:message "successfully reprocessed plot similarity"})
      (catch Exception ex
        (data-response {:message "error recalculating plot similarity"})))))

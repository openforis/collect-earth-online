(ns collect-earth-online.db.geoai
  (:require [clj-http.client :as http]
            [clojure.data.json :as json]
            [triangulum.type-conversion :as tc]
            [triangulum.config :refer [get-config]]
            [triangulum.database :refer [call-sql]]
            [clj-gcloud.storage :as st]))

(defonce gcs-resource
  (st/init
   {:project-id  (get-config :gcs-integration :project-name)
    :credentials (get-config :gcs-integration :credentials)}))

(defn generate-geojson [project-id]
  (let [plots (call-sql "get_plots_as_geojson" project-id)]
    {:type "FeatureCollection"
     :name "alerts"
     :crs  {:type "name" :properties {:name "urn:ogc:def:crs:OGC:1.3:CRS84"}}
     :features (mapv #(-> %
                          (update-vals tc/jsonb->clj)
                          (assoc :type "Feature"))
                     plots)}))

(def gs-url "gs://sim-search/ceo/")

(defn- upload-json-to-gcs [project-id file-name]
  (let [geojson  (generate-geojson project-id)
        json-str (json/write-str geojson)
        tmp-file (java.io.File/createTempFile file-name ".geojson")]
    (spit tmp-file json-str)
    (st/copy-file-to-storage gcs-resource tmp-file gs-url)
    (.delete tmp-file)
    gs-url))

(defn- prepare-similarity-table
  [project-id file-name years]
  (let [req (:body (http/post (str (get-config :gcs-integration :api-url) "/prep")
                       {:form-params  {:years years
                                       :gcp-file file-name}
                        :content-type :json
                        :as           :json}))]
    (call-sql "update_geoai_assets" project-id (:tables req))))

(defn clj->int-array-literal
  [arr]
  (str "{" (clojure.string/join "," (map int arr)) "}"))

(defn- search-plot-by-similarity
  [project-id plot-id]
  (let [req (:body (http/get
                    (str (get-config :gcs-integration :api-url) "/search")
                    {:query-params {:uniqueid plot-id
                                    :table    table
                                    :matches  5}}))
        similar-plots-arr (map #(get % :base_plotid) req)]
    (call-sql "insert_geoai_cache"
              project-id
              plot-id
              (clj->int-array-literal similar-plots-arr)
              (tc/clj->jsonb req))))

(defn start-plot-similarity! [{:keys [params]}]
  (let [project-id        (:projectId params)
        reference-plot-id (:referencePlotId params)
        similarity-years  (:similarityYears params)
        file-name         (str "ceo-" project-id "-plots")]
     (upload-json-to-gcs project-id)))

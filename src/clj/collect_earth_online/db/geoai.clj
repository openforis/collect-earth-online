(ns collect-earth-online.db.geoai
  (:require [clj-http.client :as http]
            [triangulum.type-conversion :as tc]
            [triangulum.config :refer [get-config]]
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

(defn upload-json-to-gcs [project-id]
  (let [json-str (json/generate-string geojson)
        tmp-file (java.io.File/createTempFile (str "geojson-" project-id "-plots.geojson"))]
    (spit tmp-file json-str)
    (st/copy-file-to-storage gcs-resource tmp-file gs-url)
    (.delete tmp-file)
    gs-url))

(defn start-plot-similarity! [{:keys [params]}]
  (let [project-id        (:projectId params)
        reference-plot-id (:referencePlotId params)]
     ))

(ns org.openforis.ceo.proxy
  (:require [clojure.string  :as str]
            [clj-http.client :as client]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.utils.part-utils      :as pu]
            [org.openforis.ceo.db.imagery :refer [get-imagery-source-config]]))

(defn- planet-url [source-config query-params]
  (let [{:keys [year month tile x y z]} query-params]
    (str "https://tiles" tile
         ".planet.com/basemaps/v1/planet-tiles/global_monthly_"
         year "_" month
         "_mosaic/gmap/" z "/" x "/" y ".png?api_key="
         (:accessToken source-config))))

(defn- apply-default-styles [params]
  (update params :STYLES #(if (= "" %)
                            (str/join "," (map (constantly "") (str/split (:LAYERS params) #",")))
                            %)))

(defn- remove-extra-params [params]
  (cond-> params
    (= "" (:FEATUREPROFILE params)) (dissoc :FEATUREPROFILE) ; TODO verify that this is no longer needed and remove.
    :always (dissoc :IMAGERYID)))

(defn upcase-key [[key val]]
  [(keyword (str/upper-case (name key))) val])

(defn- wms-url [source-config query-params]
  (let [geoserver-params (pu/mapm upcase-key (:geoserverParams source-config))
        source-url       (:geoserverUrl source-config)]
    (str source-url
         (when-not (str/ends-with? source-url "?") "?")
         (as-> (pu/mapm upcase-key query-params) new-query-params
           (remove-extra-params new-query-params)
           (merge new-query-params geoserver-params)
           (apply-default-styles new-query-params)
           (map (fn [[key val]]
                  (str (name key) "=" val))
                new-query-params)
           (str/join "&" new-query-params)))))

(defn- build-url [{:keys [query-params]}]
  (let [source-config (get-imagery-source-config (tc/str->int (:imageryId query-params)))
        source-type   (:type source-config "")]
    (cond
      (= "Planet" source-type)
      (planet-url source-config query-params)

      (#{"GeoServer", "SecureWatch"} source-type)
      (wms-url source-config query-params)

      :else
      "")))

(defn proxy-imagery [req]
  (client/get (build-url req) {:as :stream}))

(defn get-securewatch-dates [{:keys [query-params]}]
  (let [source-config (get-imagery-source-config (tc/str->int (:imageryId query-params)))
        base-url      (:geoserverUrl source-config)
        url           (str base-url
                           (when-not (str/ends-with? base-url "?") "?")
                           (->> (dissoc query-params :imageryId)
                                (map (fn [[key val]] (str (name key) "=" val)))
                                (str/join "&"))
                           "&CONNECTID="
                           (get-in source-config [:geoserverParams :CONNECTID]))]
    ;; TODO check JSON for errors and parse (front end) using "&EXCEPTIONS=application/json"
    (client/get url)))

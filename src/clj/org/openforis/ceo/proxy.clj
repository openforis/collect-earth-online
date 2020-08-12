(ns org.openforis.ceo.proxy
  (:require [clojure.string  :as str]
            [clj-http.client :as client]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.utils.part-utils      :as pu]
            [org.openforis.ceo.db.imagery  :refer [get-imagery-source-config]]
            [org.openforis.ceo.views       :refer [data-response]]))

(defn- planet-url [source-config params]
  (let [{:keys [year month tile x y z]} params]
    (str "https://tiles" tile
         ".planet.com/basemaps/v1/planet-tiles/global_monthly_"
         year "_" month
         "_mosaic/gmap/" z "/" x "/" y ".png?api_key="
         (:accessToken source-config))))

;; TODO since we dropped STYLE=default for SecureWatch, we can drop STYLE= in buildSecureWatch
(defn- default-styles [params geoserver-params]
  (update params :STYLES #(if (= "" %)
                            (str/join ","
                                      (take (count (str/split (:LAYERS  geoserver-params) #","))
                                            (repeat "")))
                            %)))

(defn- remove-extra-params [params]
  (cond-> params
    (= "" (:FEATUREPROFILE params)) (dissoc :FEATUREPROFILE) ; TODO where is featureprofile coming from?
    :always (dissoc :imageryId)))

(defn keys-upper-case [[key val]]
  [(keyword (str/upper-case (name key))) val])

(defn- wms-url [source-config query-params]
  (let [geoserver-params (pu/mapm keys-upper-case (:geoserverParams source-config))
        source-url       (:geoserverUrl source-config)]
    (str source-url
         (when-not (str/includes? source-url "?") "?")
         (as-> (pu/mapm keys-upper-case query-params) params
           (remove-extra-params params)
           (merge params geoserver-params)
           (default-styles params geoserver-params)
           (map (fn [[key val]]
                  (str (name key) "=" val))
                params)
           (str/join "&" params)))))

(defn- build-url [{:keys [params query-params]}]
  (let [source-config (get-imagery-source-config (tc/str->int (:imageryId params)))
        source-type   (:type source-config "")]
    (cond
      (= "Planet" source-type)
      (planet-url source-config params)

      (#{"GeoServer", "SecureWatch"} source-type)
      (wms-url source-config query-params)

      :else
      "")))

(defn proxy-imagery [req]
  (client/get (build-url req) {:as :stream}))

(defn get-secure-watch-dates [req]
  (let [imagery-id    (tc/str->int (get-in req [:params :imageryId]))
        source-config (get-imagery-source-config imagery-id)
        base-url      (:geoserverUrl source-config)
        url           (str base-url
                           (when-not (str/includes? base-url "?") "?")
                           (->> (dissoc (:query-params req) :imageryId)
                                (map (fn [[key val]] (str (name key) "=" val)))
                                (str/join "&"))
                           "&CONNECTID="
                           (get-in source-config [:geoserverParams :CONNECTID]))]
    ;; TODO check for XML and parse error (front end)
    (client/get url)))

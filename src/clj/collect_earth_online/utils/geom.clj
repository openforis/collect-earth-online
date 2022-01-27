(ns collect-earth-online.utils.geom
  (:require [triangulum.type-conversion :as tc]))

;;; GeoJSON

(defn make-wkt-point [lon lat]
  (format "POINT(%s %s)" lon lat))

(defn make-geo-json-polygon [lon-min lat-min lon-max lat-max]
  (tc/clj->json {:type        "Polygon"
                 :coordinates [[[lon-min lat-min]
                                [lon-min lat-max]
                                [lon-max lat-max]
                                [lon-max lat-min]
                                [lon-min lat-min]]]}))

(defn EPSG:4326->3857
  "Convert wgs84(4326) lon/lat coordinates to web mercator(3857) x/y coordinates"
  [& points]
  (let [points (mapv (fn [[lon lat]]
                       [(* lon 111319.490778)
                        (-> lat (+ 90.0) (/ 360.0) (* Math/PI) (Math/tan) (Math/log) (* 6378136.98))])
                     points)]
    (if (= 1 (count points))
      (first points)
      points)))

(defn EPSG:3857->4326
  "Convert web mercator(3857) x/y coordinates to wgs84(4326) lon/lat coordinates"
  [& points]
  (let [points (mapv (fn [[x y]]
                       [(/ x 111319.490778)
                        (-> y (/ 6378136.98) (Math/exp) (Math/atan) (/ Math/PI) (* 360.0) (- 90.0))])
                     points)]
    (if (= 1 (count points))
      (first points)
      points)))

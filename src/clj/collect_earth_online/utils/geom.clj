(ns collect-earth-online.utils.geom
  (:require [clojure.string :as str]
            [triangulum.type-conversion :as tc]))

;;; GeoJSON

(defn make-wkt-point [lon lat]
  (format "POINT(%s %s)" lon lat))

(defn make-geo-json-polygon [lon-min lat-min lon-max lat-max]
  {:type        "Polygon"
   :coordinates [[[lon-min lat-min]
                  [lon-min lat-max]
                  [lon-max lat-max]
                  [lon-max lat-min]
                  [lon-min lat-min]]]})

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


(defn- exterior-ring [coords]
  (map (fn [[a b]] [(tc/val->double a) (tc/val->double b)])
       (first coords)))

(defn- same-ring? [[start1 :as ring1] ring2]
  (and (some #(= start1 %) ring2)
       (or (= ring1 ring2)
           (= ring1 (reverse ring2))
           (= ring1 (take (count ring1) (drop-while #(not= start1 %) (cycle (rest ring2)))))
           (= ring1 (take (count ring1) (drop-while #(not= start1 %) (cycle (reverse (rest ring2)))))))))

;; NOTE: This only works for polygons (and only compares their
;;       exterior rings). If you need to compare linestrings or points, you
;;       will need a different function.
(defn- same-polygon-boundary? [geom1 geom2]
  (and (= "polygon" (str/lower-case (:type geom1)) (str/lower-case (:type geom2)))
       (same-ring? (exterior-ring (:coordinates geom1))
                   (exterior-ring (:coordinates geom2)))))

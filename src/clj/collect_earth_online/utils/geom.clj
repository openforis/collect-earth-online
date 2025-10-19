(ns collect-earth-online.utils.geom
  (:require [clojure.string :as str]
            [triangulum.type-conversion :as tc]))

;;; GeoJSON

(def wsg84-radius 6378136.98)

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
                        (-> lat (+ 90.0) (/ 360.0) (* Math/PI) (Math/tan) (Math/log) (* wsg84-radius))])
                     points)]
    (if (= 1 (count points))
      (first points)
      points)))

(defn EPSG:3857->4326
  "Convert web mercator(3857) x/y coordinates to wgs84(4326) lon/lat coordinates"
  [& points]
  (let [points (mapv (fn [[x y]]
                       [(/ x 111319.490778)
                        (-> y (/ wsg84-radius) (Math/exp) (Math/atan) (/ Math/PI) (* 360.0) (- 90.0))])
                     points)]
    (if (= 1 (count points))
      (first points)
      points)))

(defn epsg3857-point-resolution
  [point]
  (/ 1 (Math/cosh (/ (second point) wsg84-radius))))

(require '[clojure.pprint :refer [pprint]])
(defn- close-enough
  "compares a point's x and y values to determine if it is 
   basically the same point as another given set of 
   coordinates, relative to a given tolerance"
  [{a-x :lat a-y :lon :as point-a} {b-x :lat b-y :lon :as point-b} & [tolerance]]
  (pprint  ["close-enough??" point-a point-b ])
  (let [tol   (or tolerance 1e-10)
        close (fn [a b]
                (let [diff  (abs (- a b))
                      scale (max 1.0 (abs a) (abs b))]
                  (or (zero? diff)
                      (< diff tol)
                      (< (/ diff scale) tol))))]
    (and (close a-x b-x) (close a-y b-y))))

(defn distinct-points
  ""
  [points-a points-b & [tolerance]]
  (let [points-b (map (fn [point]
                        (let [[lat lon] (-> point :center tc/json->clj :coordinates)]
                          (assoc point :lat lat :lon lon))))
        points-a (map (fn [point]
                        (let [[lat lon] (->> point :plot_geom
                                             (re-seq #"-?\d+\.\d+")
                                             (map parse-double))]
                          (assoc point :lat lat :lon lon))))
        tol (or tolerance 1e-10)
        b-groups (group-by (fn [point]
                             [(long (/ (:lat point) tol)) (long (/ (:lon point) tol))])
                           points-b)]
    (remove (fn [point]
              (let [cell [(long (/ (:lat point) tol))
                          (long (/ (:lon point) tol))]]
                (some #(close-enough point % tol)
                      (mapcat b-groups [(cell)
                                        (mapv inc cell)
                                        (mapv dec cell)]))))
            points-a)))

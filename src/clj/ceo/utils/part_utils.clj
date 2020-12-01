(ns ceo.utils.part-utils
  (:import java.util.Base64)
  (:require [clojure.java.io :as io]
            [clojure.string  :as str]))

(defn mapm [f coll]
  (persistent!
   (reduce (fn [acc cur]
             (conj! acc (f cur)))
           (transient {})
           coll)))

(defn- decode64 [to-decode]
  (.decode (Base64/getDecoder) (second (str/split to-decode #","))))

(defn write-file-part-base64 [input-file-name encoded-file output-directory output-file-prefix]
  (when input-file-name
    (let [ext       (subs input-file-name (str/last-index-of input-file-name "."))
          out-name  (str output-file-prefix ext)
          full-path (str output-directory
                         (when-not (str/ends-with? output-directory "/") "/")
                         out-name)
          data      (decode64 encoded-file)]
      (io/make-parents full-path)
      (with-open [os (io/output-stream full-path)]
        (.write os data 0 (count data)))
      out-name)))

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

(ns org.openforis.ceo.utils.part-utils
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
  "Convert wgs84(4326) lon/lat to mercator(3857) coordinates x/y"
  [& points]
  (let [points (mapv (fn [[lon lat]]
                       [(* lon 111319.490778)
                        (* (Math/log (Math/tan (* (+ 90.0 lat) (/ Math/PI 360)))) 6378136.98)])
                     points)]
    (if (= 1 (count points))
      (first points)
      points)))

(defn EPSG:3857->4326
  "Convert mercator(3857) coordinates x/y to wgs84(4326) lon/lat"
  [& points]
  (let [points (mapv (fn [[x y]]
                       [(/ x 111319.490778)
                        (- (/ (Math/atan (Math/exp (/ y 6378136.98))) (/ Math/PI 360)) 90.0)])
                     points)]
    (if (= 1 (count points))
      (first points)
      points)))

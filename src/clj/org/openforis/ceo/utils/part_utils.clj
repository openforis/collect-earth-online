(ns org.openforis.ceo.utils.part-utils
  (:import java.util.Base64)
  (:require [clojure.java.io :as io]
            [clojure.string  :as str]))

(defn- decode64 [to-decode]
  (.decode (Base64/getDecoder) (second (str/split to-decode #","))))

(defn mapm [f coll]
  (persistent!
   (reduce (fn [acc cur]
             (conj! acc (f cur)))
           (transient {})
           coll)))

(defn mapm [f coll]
  (persistent!
   (reduce (fn [acc cur]
             (conj! acc (f cur)))
           (transient {})
           coll)))

;; FIXME: stub
(defn write-file-part-base64 [input-file-name encoded-file output-directory output-file-prefix]
  (when input-file-name
    (let [ext      (subs input-file-name (str/last-index-of input-file-name "."))
          out-name (str output-file-prefix ext)
          data     (decode64 encoded-file)]
      (with-open [os (io/output-stream (str (io/resource output-directory) out-name))]
        (.write os data 0 (count data)))
      out-name)))

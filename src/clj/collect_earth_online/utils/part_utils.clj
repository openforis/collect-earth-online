(ns collect-earth-online.utils.part-utils
  (:import java.util.Base64)
  (:require [clojure.java.io :as io]
            [clojure.string  :as str]
            [triangulum.logging :refer [log]]))

;;; General

(defn mapm [f coll]
  (persistent!
   (reduce (fn [acc cur]
             (conj! acc (f cur)))
           (transient {})
           coll)))

(defn remove-vector-items [coll & items]
  (->> coll
       (remove (set items))
       (vec)))

;;; Base 64 files

(defn read-file-base64 [file]
  (with-open [is (io/input-stream file)
              os (java.io.ByteArrayOutputStream.)]
    (io/copy is os)
    (.encodeToString (Base64/getEncoder) (.toByteArray os))))

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

;;; Errors

(defn init-throw [message]
  (throw (ex-info message {:causes [message]})))

(defn try-catch-throw [try-fn message]
  (try (try-fn)
       (catch Exception e
         (log (ex-message e))
         (let [causes (conj (:causes (ex-data e) []) message)]
           (throw (ex-info message {:causes causes}))))))

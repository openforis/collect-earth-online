(ns org.openforis.ceo.utils.type-conversion
  (:import org.postgresql.util.PGobject)
  (:require [clojure.data.json :as json]))

(defn str->int
  ([string]
   (str->int string -1))
  ([string default]
   (try
     (Integer/parseInt string)
     (catch Exception _ default))))

(defn str->long
  ([string]
   (str->int string -1))
  ([string default]
   (try
     (Long/parseLong string)
     (catch default))))

(defn str->bool
  ([string]
   (str->bool string false))
  ([string default]
   (if string
     (try
       (Boolean/parseBoolean string)
       (catch Exception _ default))
     default)))

(defn json->clj
  ([string]
   (json->clj string {}))
  ([string default]
   (try
     (json/read-str string :key-fn keyword)
     (catch Exception _ default))))

(defn jsonb->clj [jsonb]
  (json->clj (str jsonb)))

(defn clj->jsonb [data]
  (doto (PGobject.)
    (.setType "jsonb")
    (.setValue (json/write-str data))))

(defn json->jsonb [json]
  (-> json json->clj clj->jsonb))

(def clj->json json/write-str)

(def jsonb->json str)

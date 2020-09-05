(ns org.openforis.ceo.utils.type-conversion
  (:import org.postgresql.util.PGobject)
  (:require [clojure.data.json :as json]))

(defn str->int
  ([string]
   (str->int string (int -1)))
  ([string default]
   (if (int? string)
     string
     (try
       (Integer/parseInt string)
       (catch Exception _ default)))))

(defn str->long
  ([string]
   (str->long string (long -1)))
  ([string default]
   (if (number? string)
     string
     (try
       (Long/parseLong string)
       (catch Exception _ default)))))

(defn str->float
  ([string]
   (str->float string (float -1.0)))
  ([string default]
   (if (number? string)
     string
     (try
       (Float/parseFloat string)
       (catch Exception _ default)))))

(defn str->double
  ([string]
   (str->double string (double -1.0)))
  ([string default]
   (if (number? string)
     string
     (try
       (Double/parseDouble string)
       (catch Exception _ default)))))

(defn str->bool
  ([string]
   (str->bool string false))
  ([string default]
   (if (boolean? string)
     string
     (try
       (Boolean/parseBoolean string)
       (catch Exception _ default)))))

(defn json->clj
  ([string]
   (json->clj string nil))
  ([string default]
   (try
     (json/read-str string :key-fn keyword)
     (catch Exception _ default))))

(def jsonb->json str)

(defn jsonb->clj [jsonb]
  (-> jsonb jsonb->json json->clj))

(def clj->json json/write-str)

(defn clj->jsonb [data]
  (doto (PGobject.)
    (.setType "jsonb")
    (.setValue (clj->json data))))

(defn json->jsonb [json]
  (-> json json->clj clj->jsonb))

(defn str->pg-uuid [string]
  (doto (PGobject.)
    (.setType "uuid")
    (.setValue string)))

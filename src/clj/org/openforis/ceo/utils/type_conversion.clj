(ns org.openforis.ceo.utils.type-conversion)

(defn str->int
  ([string]
   (str->int string -1))
  ([string default]
   (try
     (Integer/parseInt string)
     (catch default))))

(defn str->bool
  ([string]
   (str->bool string false))
  ([string default]
   (try
     (boolean string)
     (catch default))))

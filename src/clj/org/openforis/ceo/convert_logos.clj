(ns org.openforis.ceo.convert-logos
  (:import java.util.Base64)
  (:require [clojure.java.io    :as io]
            [org.openforis.ceo.database :refer [call-sql]]
            [org.openforis.ceo.utils.type-conversion :as tc]))

(defn encode [file]
  (with-open [is (io/input-stream file)
              os (java.io.ByteArrayOutputStream.)]
    (io/copy is os)
    (.encodeToString (Base64/getEncoder) (.toByteArray os))))

;; TODO: Delete this file after migration
;; TODO: Delete /resources/public/img/institution-logos after migration
;; Call with clojure -m org.openforis.ceo.convert-logos
(defn -main []
  (doseq [logo (->> (io/resource "/resources/public/img/institution-logos")
                    (io/file)
                    (file-seq)
                    (filter #(.isFile %)))]
    (when-let [id (re-find #"(?<=institution-)\d*" (.getName logo))]
      (println id)
      (call-sql "update_institution_logo"
                (tc/val->int id)
                (encode logo))))
  (shutdown-agents))

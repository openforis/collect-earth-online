(ns org.openforis.ceo.convert-logos
  (:require [clojure.java.io :as io]
            [org.openforis.ceo.database :refer [call-sql]]
            [org.openforis.ceo.utils.part-utils :refer [read-file-base64]]
            [org.openforis.ceo.utils.type-conversion :as tc]))

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
                (read-file-base64 logo))))
  (shutdown-agents))

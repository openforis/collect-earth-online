(ns collect-earth-online.convert-logos
  (:require [clojure.java.io :as io]
            [triangulum.type-conversion :as tc]
            [triangulum.database :refer [call-sql]]
            [collect-earth-online.utils.part-utils :refer [read-file-base64]]))

;; TODO: Delete this file after migration
;; TODO: Delete /resources/public/img/institution-logos after migration
;; Call with clojure -m collect-earth-online.convert-logos
(defn -main []
  (doseq [logo (->> (io/resource "public/img/institution-logos")
                    (io/file)
                    (file-seq)
                    (filter #(.isFile %)))]
    (when-let [id (re-find #"(?<=institution-)\d*" (.getName logo))]
      (println id)
      (call-sql "update_institution_logo"
                (tc/val->int id)
                (read-file-base64 logo))))
  (shutdown-agents))

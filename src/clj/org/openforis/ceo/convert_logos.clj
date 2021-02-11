(ns org.openforis.ceo.convert-logos
  (:require [clojure.java.io    :as io]
            [clojure.java.shell :as sh]))

;; TODO: Delete this file after migration
;; TODO: Delete /resources/public/img/institution-logos after migration
;; Call with clojure -m org.openforis.ceo.convert-logos
(defn -main []
  (doseq [logo (->> (io/resource "public/img/institution-logos")
                    (io/file)
                    (file-seq)
                    (filter #(.isFile %)))]
    (when-let [id (re-find #"(?<=institution-)\d*" (.getName logo))]
      (println id)
      (sh/sh "sh"
             "-c"
             (format "psql -h localhost -U postgres -d ceo -c \"select add_institution_logo_by_file(%s, '%s'::text)\""
                     id
                     (.getPath logo)))))
  (shutdown-agents))

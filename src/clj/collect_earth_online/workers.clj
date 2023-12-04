(ns collect-earth-online.workers
  (:require [clojure.java.io    :as io]
            [clojure.string     :as str]
            [triangulum.logging :refer [log-str]]))

(def ^:private expires-in "1 hour in msecs" (* 1000 60 60))

(defn- expired? [last-mod-time]
  (> (- (System/currentTimeMillis) last-mod-time) expires-in))

(defn- delete-tmp []
  (log-str "Removing temp files.")
  (let [tmp-dir (System/getProperty "java.io.tmpdir")
        dirs    (filter #(and (.isDirectory %)
                              (str/includes? % "ceo-tmp")
                              (expired? (.lastModified %)))
                        (.listFiles (io/file tmp-dir)))]
    (doseq [d    dirs
            file (reverse (file-seq d))]
      (io/delete-file file))))

(defn start-clean-up-service! []
  (log-str "Starting temp file removal service.")
  (future
    (while true
        (Thread/sleep expires-in)
        (try (delete-tmp)
             (catch Exception _)))))

(defn stop-clean-up-service! [service-thread]
  (future-cancel service-thread))

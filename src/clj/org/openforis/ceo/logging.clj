(ns org.openforis.ceo.logging
  (:import java.text.SimpleDateFormat
           java.util.Date)
  (:require [clojure.java.io :as io]
            [clojure.pprint :as pp]))

(defonce synchronized-log-writer (agent nil))

(defonce output-path      (atom ""))
(defonce clean-up-service (atom nil))

(defn max-length [string length]
  (subs string 0 (min length (count string))))

(defn log [data & {:keys [newline? pprint? force-stdout?]
                   :or {newline? true pprint? false force-stdout? false}}]
  (let [timestamp    (.format (SimpleDateFormat. "MM/dd HH:mm:ss") (Date.))
        log-filename (str (.format (SimpleDateFormat. "YYYY-MM-dd") (Date.)) ".log")
        max-data     (max-length data 500)
        line         (str timestamp
                          " "
                          (if pprint? (with-out-str (pp/pprint data)) max-data)
                          (when (and newline? (not pprint?)) "\n"))]
    (send-off synchronized-log-writer
              (if (or force-stdout? (= "" @output-path))
                (fn [_] (print line) (flush))
                (fn [_] (spit (io/file @output-path log-filename) line :append true)))))
  nil)

(defn log-str [& data]
  (log (apply str data)))

(defn- start-clean-up-service! []
  (log "Starting log file removal service." :force-stdout? true)
  (future
    (while true
      (Thread/sleep (* 1000 60 60 24)) ; 24 hours in milliseconds.
      (try (doseq [file (as-> (io/file @output-path) files
                          (.listFiles files)
                          (sort-by #(.lastModified %) files)
                          (take (- (count files) 10) files))]
             (io/delete-file file))
           (catch Exception _)))))

(defn set-log-path! [path]
  (cond
    (pos? (count path))
    (try
      (io/make-parents (io/file path "dummy.log"))
      (reset! output-path path)
      (log (str "Logging to: " path) :force-stdout? true)
      (when (nil? @clean-up-service)
        (reset! clean-up-service (start-clean-up-service!)))
      (catch Exception _
        (reset! output-path "")
        (log (str "Error setting log path to " path ". Check that you supplied a valid path.") :force-stdout? true)))

    (not (nil? @clean-up-service))
    (do
      (reset! output-path "")
      (log "Logging to: stdout" :force-stdout? true)
      (future-cancel @clean-up-service)
      (reset! clean-up-service nil))))

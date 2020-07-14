(ns my-project.logging
  (:import java.text.SimpleDateFormat
           java.util.Date)
  (:require [clojure.pprint :as pp]))

(defonce synchronized-log-writer (agent nil))

(defn log [data & {:keys [newline pprint] :or {newline true pprint false}}]
  (let [timestamp (.format (SimpleDateFormat. "MM/dd HH:mm:ss") (Date.))]
    (send-off synchronized-log-writer
              (cond pprint  (fn [_] (print (str timestamp " ")) (pp/pprint data))
                    newline (fn [_] (println timestamp data))
                    :else   (fn [_] (print timestamp data)))))
  nil)

(defn log-str [& data]
  (log (apply str data)))

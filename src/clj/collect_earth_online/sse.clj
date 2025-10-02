(ns collect-earth-online.sse
  (:require [triangulum.response :refer [data-response]]
            [clojure.java.io :as io]
            [clojure.core.async :as async]
            [ring.core.protocols :refer [StreamableResponseBody]])
  (:import  (clojure.core.async.impl.channels ManyToManyChannel)
            (java.io IOException OutputStream)
            (java.lang Thread)))

(defonce clients (atom #{}))

(extend-type ManyToManyChannel
  StreamableResponseBody
  (write-body-to-stream [ch _response ^OutputStream output-stream]
    (with-open [out    output-stream
                writer (io/writer out)]
      (try
        (loop [] #_[retries 10]
              #_(when (< 0 retries))
              (when-let [^String msg (async/<!! ch)]                
                (doto writer (.write (str "data: " msg "\n\n")) (.flush)))
              (recur #_(dec retries)))
        (catch java.io.IOException _)
        (finally          
          (swap! clients disj ch)
          (async/close! ch))))))

(defn send>!! [ch message]
  (let [sent? (async/>!! ch message)]
    (when-not sent?
      (swap! clients disj ch))
    sent?))

(defn heartbeat>!! [ch msec]
  (future
    (loop []
      (Thread/sleep ^long msec)
      (when (send>!! ch "\n\n")
        (recur)))))

(defn sse-handler [_]
  (let [ch (async/chan 10)]
    (swap! clients conj ch)
    (heartbeat>!! ch 10000)
    {:status 200
     :headers {"Content-Type"  "text/event-stream"
               "Cache-Control" "no-cache, no-store"
               "Connection"    "keep-alive"}
     :body ch}))

(defn broadcast! [message]
  (let [message-str (if (string? message)
                      message
                      (:message message "No message content"))]
    (doseq [ch @clients]
      (send>!! ch message-str))))

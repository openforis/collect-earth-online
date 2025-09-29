(ns collect-earth-online.sse
  (:require [triangulum.response :refer [data-response]]
            [clojure.java.io :as io]
            [clojure.core.async :as async]
            [ring.core.protocols :refer [StreamableResponseBody]])
  (:import  (clojure.core.async.impl.channels ManyToManyChannel)
            (java.io IOException OutputStream)
            (java.lang Thread)))

(extend-type ManyToManyChannel
  StreamableResponseBody
  (write-body-to-stream [ch _response ^OutputStream output-stream]
    (with-open [out    output-stream
                writer (io/writer out)]
      (try
        (loop [retries 10]
          (when (< 0 retries)
            (when-let [^String msg (async/<!! ch)]
              (doto writer (.write msg) (.flush)))
            (recur (dec retries))))
        (catch java.io.IOException _)
        (finally (async/close! ch))))))

(defonce clients (atom #{}))

(defn send>!! [ch message]
  (let [v (async/>!! ch message)]
    (when-not v (swap! clients disj ch))
    v))

(defn heartbeat>!! [ch msec]
  (future
    (loop []
      (Thread/sleep ^long msec)
      (when (send>!! ch "\n\n")
        (recur)))))

(defn sse-handler [_]
  (let [ch (async/chan 10)]
    (swap! clients conj ch)
    (send>!! ch "Hello, world!")
    (heartbeat>!! ch 10000)
    {:status 200
     :headers {"Content-Type"  "text/event-stream"
               "Cache-Control" "no-cache, no-store"}}))

(defn broadcast! [message]
  (println "Broadcast message: " (:message message))
  (run! (fn [ch] (send>!! ch message)) @clients))

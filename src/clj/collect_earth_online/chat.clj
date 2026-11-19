(ns collect-earth-online.chat
  "Proxies the help chat to the assistant server: {question} -> {answer, links}."
  (:require [clj-http.client     :as client]
            [clojure.data.json   :as json]
            [clojure.string      :as str]
            [triangulum.config   :refer [get-config]]
            [triangulum.logging  :refer [log-str]]
            [triangulum.response :refer [data-response]]))

(def ^:private connect-timeout-ms 5000)
(def ^:private answer-timeout-ms 120000)

(def ^:private unavailable-message
  "Sorry, the assistant can't answer right now. Please try again later.")

(defn- chat-url []
  (not-empty (get-config :chat :url)))

(defn chat-status
  "Lets the widget hide itself on servers where the assistant isn't configured."
  [_]
  (data-response {:enabled (boolean (chat-url))}))

(defn- request-options
  "clj-http options to forward the question as JSON."
  [question]
  (let [api-key (not-empty (get-config :chat :api-key))]
    {:headers            (cond-> {"Accept" "application/json"}
                           api-key (assoc "Authorization" (str "Bearer " api-key)))
     :connection-timeout connect-timeout-ms
     :socket-timeout     answer-timeout-ms
     :throw-exceptions   false
     :content-type       :json
     :body-encoding      "UTF-8"
     :body               (json/write-str {:question question})}))

(defn chat
  "Forwards a question to the assistant server."
  [{:keys [params]}]
  (if-let [url (chat-url)]
    (try
      (let [question              (str/trim (str (:question params "")))
            {:keys [status body]} (client/post url (request-options question))]
        (if (= 200 status)
          (data-response (json/read-str body))
          (do (log-str "Chat: assistant server answered with HTTP " status)
              (data-response {:message unavailable-message} {:status 502}))))
      (catch Exception e
        (log-str "Chat: request to assistant server failed: " (ex-message e))
        (data-response {:message unavailable-message} {:status 502})))
    (data-response {:message "The assistant isn't configured on this server."} {:status 503})))

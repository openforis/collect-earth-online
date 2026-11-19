(ns collect-earth-online.chat
  "Proxies the help chat to the assistant server: {question} (JSON or multipart with files) -> {answer, links}."
  (:require [clj-http.client     :as client]
            [clojure.data.json   :as json]
            [clojure.string      :as str]
            [triangulum.config   :refer [get-config]]
            [triangulum.logging  :refer [log-str]]
            [triangulum.response :refer [data-response]])
  (:import java.io.File))

(def ^:private max-question-chars 4000)
(def ^:private max-files 2)
(def ^:private max-file-bytes (* 5 1024 1024))
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

(defn- as-vector [x]
  (cond (nil? x)        []
        (sequential? x) (vec x)
        :else           [x]))

(defn- valid-image?
  "True for Ring temp-file image uploads; the File check rejects look-alike maps from JSON or query params."
  [{:keys [tempfile content-type size]}]
  (and (instance? File tempfile)
       (string? content-type)
       (str/starts-with? content-type "image/")
       (number? size)
       (<= size max-file-bytes)))

(defn- request-error [question files]
  (cond
    (and (str/blank? question) (empty? files))
    "Please type a question."

    (> (count question) max-question-chars)
    (str "Please keep questions under " max-question-chars " characters.")

    (> (count files) max-files)
    (str "You can attach up to " max-files " images per message.")

    (not-every? valid-image? files)
    "Only images up to 5 MB can be attached."))

(defn- request-options
  "clj-http options to forward the question as JSON, or as multipart when there are images."
  [question files]
  (let [api-key (not-empty (get-config :chat :api-key))
        headers (cond-> {"Accept" "application/json"}
                  api-key (assoc "Authorization" (str "Bearer " api-key)))
        options {:headers            headers
                 :connection-timeout connect-timeout-ms
                 :socket-timeout     answer-timeout-ms
                 :throw-exceptions   false}]
    (if (seq files)
      (assoc options :multipart
             (into [{:name      "question"
                     :content   question
                     :mime-type "text/plain"
                     :encoding  "UTF-8"}]
                   (for [{:keys [tempfile filename content-type]} files]
                     {:name      "files"
                      :content   tempfile
                      :filename  (or (not-empty filename) "image")
                      :mime-type content-type})))
      (assoc options
             :content-type  :json
             :body-encoding "UTF-8"
             :body          (json/write-str {:question question})))))

(defn chat
  "Forwards a question (and optional images) to the assistant server."
  [{:keys [params]}]
  (if-let [url (chat-url)]
    (let [question (str/trim (str (:question params "")))
          files    (as-vector (:files params))]
      (if-let [error (request-error question files)]
        (data-response {:message error} {:status 400})
        (try
          (let [{:keys [status body]} (client/post url (request-options question files))]
            (if (= 200 status)
              (data-response (json/read-str body))
              (do (log-str "Chat: assistant server answered with HTTP " status)
                  (data-response {:message unavailable-message} {:status 502}))))
          (catch Exception e
            (log-str "Chat: request to assistant server failed: " (ex-message e))
            (data-response {:message unavailable-message} {:status 502})))))
    (data-response {:message "The assistant isn't configured on this server."} {:status 503})))

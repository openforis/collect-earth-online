(ns org.openforis.ceo.email
  (:require [clojure.edn :as edn]
            [postal.core :refer [send-message]]))

(defn get-mail-config []
  (edn/read-string (slurp "email-server.edn")))

(defn send-email [to-address message-subject message-body]
  (let [mail-config (get-mail-config)]
    (send-message
     (dissoc mail-config :site-url)
     {:from    (mail-config :user)
      :to      to-address
      :subject message-subject
      :body    message-body})))

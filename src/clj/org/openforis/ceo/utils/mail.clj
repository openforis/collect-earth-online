(ns org.openforis.ceo.utils.mail
  (:import java.time.LocalDateTime)
  (:require [clojure.edn :as edn]
            [postal.core :refer [send-message]]))

;; Example value:
;; {:base-url              "https://collect.earth/"
;;  :smtp-server           "smtp.gmail.com"
;;  :smtp-port             587
;;  :smtp-user             "collectearth.mail@gmail.com"
;;  :smtp-password         "foobar"
;;  :smtp-recipient-limit  100
;;  :mailing-list-interval 600
;;  :ssl?                  true}
(defonce mail-config (atom (edn/read-string (slurp "mail-config.edn"))))

;; FIXME: stub
(defn email? [string]
  true)

;; FIXME: Verify that this is a valid call to postal.core/send-message and use content-type
(defn send-mail [to-addresses cc-addresses bcc-addresses subject body content-type]
  (send-message
   (select-keys @mail-config :smtp-server :smtp-port :smtp-user :smtp-password :ssl?)
   {:from    (@mail-config :smtp-user)
    :to      to-addresses
    :cc      cc-addresses
    :bcc     bcc-addresses
    :subject subject
    :body    body}))

;; FIXME: stub
(defn send-to-mailing-list [bcc-addresses subject body content-type]
  nil)

(defn get-base-url []
  (:base-url @mail-config))

(defn get-mailing-list-interval []
  (:mailing-list-interval @mail-config))

(defn get-mailing-list-last-sent []
  (or (:mailing-list-last-sent @mail-config)
      (.minusSeconds (LocalDateTime/now) (get-mailing-list-interval))))

(defn set-mailing-list-last-sent! [time]
  (swap! mail-config assoc :mailing-list-last-sent time))

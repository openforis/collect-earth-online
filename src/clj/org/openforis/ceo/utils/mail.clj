(ns org.openforis.ceo.utils.mail
  (:import java.time.LocalDateTime))

;; Example value:
;; {:base-url              "https://collect.earth/"
;;  :smtp-server           "smtp.gmail.com"
;;  :smtp-port             587
;;  :smtp-user             "collectearth.mail@gmail.com"
;;  :smtp-password         "foobar"
;;  :smtp-recipient-limit  100
;;  :mailing-list-interval 600
;;  :ssl?                  true}
;; FIXME: Load this from mail-config.edn in org.openforis.ceo.server/start-server!
(defonce mail-config (atom {}))

;; FIXME: stub
(defn email? [string]
  true)

;; FIXME: stub
(defn send-mail [to-addresses cc-addresses bcc-addresses subject body content-type]
  nil)

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

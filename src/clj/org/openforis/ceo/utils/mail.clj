(ns org.openforis.ceo.utils.mail)

;; Example value:
;; {:base-url              "https://collect.earth/"
;;  :smtp-server           "smtp.gmail.com"
;;  :smtp-port             587
;;  :smtp-user             "collectearth.mail@gmail.com"
;;  :smtp-password         "foobar"
;;  :smtp-recipient-limit  ?
;;  :mailing-list-interval ?
;;  :ssl?                  true}
;; FIXME: Load this from mail-config.edn in org.openforis.ceo.server/start-server!
(defonce mail-config (atom {}))

;; FIXME: stub
(defn email? [string]
  true)

;; FIXME: stub
(defn send-mail [to-addresses cc-addresses bcc-addresses subject body content-type]
  nil)

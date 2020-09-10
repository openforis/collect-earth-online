(ns org.openforis.ceo.utils.mail
  (:import java.time.LocalDateTime)
  (:require [clojure.edn :as edn]
            [clojure.string :as str]
            [postal.core :refer [send-message]]
            [org.openforis.ceo.logging :refer [log-str]]))

;; Example value:
;; {:host                  "smtp.gmail.com"
;;  :user                  "mail@gmail.com"
;;  :pass                  "mail"
;;  :tls                   true
;;  :port                  587
;;  :base-url              "https://collect.earth/"
;;  :recipient-limit       100
;;  :mailing-list-interval 600}
(defonce mail-config (atom (edn/read-string (slurp "mail-config.edn"))))

(defn get-base-url []
  (:base-url @mail-config))

(defn email? [string]
  (let [pattern #"[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"]
    (and (string? string) (re-matches pattern string))))

(defn- send-postal [to-addresses cc-addresses bcc-addresses subject body content-type]
  (send-message
   (select-keys @mail-config [:host :user :pass :tls :port])
   {:from    (@mail-config :user)
    :to      to-addresses
    :cc      cc-addresses
    :bcc     bcc-addresses
    :subject subject
    :body    [{:type    (or content-type "text/plain")
               :content body}]}))

(defn send-mail [to-addresses cc-addresses bcc-addresses subject body content-type]
  (let [{:keys [message error]} (send-postal to-addresses
                                             cc-addresses
                                             bcc-addresses
                                             subject
                                             body
                                             content-type)]
    (when-not (= :SUCCESS error) (log-str message))))

(defn send-to-mailing-list [bcc-addresses subject body]
  (let [base-url (get-base-url)
        new-body (str body
                      "<br><hr><p><a href=\""
                      base-url
                      (when-not (str/ends-with? base-url "/") "/")
                      "unsubscribe-mailing-list\">Unsubscribe</a></p>")]
    (->> bcc-addresses
         (filter email?)
         (partition-all (:recipient-limit @mail-config))
         (reduce (fn [acc cur]
                   (let [response (send-postal nil nil cur subject new-body "text/html")]
                     (if (= :SUCCESS (:error response))
                       acc
                       (-> acc
                           (assoc :status 400)
                           (update :messages #(conj % (:message response)))))))
                 {}))))

;; TODO it's probably cleaner to handle the interval in mail.clj with send-to-mailing-list instead of in user.js
(defn get-mailing-list-interval []
  (:mailing-list-interval @mail-config))

(defn get-mailing-list-last-sent []
  (or (:mailing-list-last-sent @mail-config)
      (.minusSeconds (LocalDateTime/now) (get-mailing-list-interval))))

(defn set-mailing-list-last-sent! [time]
  (swap! mail-config assoc :mailing-list-last-sent time))

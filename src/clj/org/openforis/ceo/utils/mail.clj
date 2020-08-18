(ns org.openforis.ceo.utils.mail
  (:import java.time.LocalDateTime)
  (:require [clojure.edn :as edn]
            [clojure.string :as str]
            [postal.core :refer [send-message]]
            [org.openforis.ceo.logging :refer [log-str]]
            [org.openforis.ceo.views   :refer [data-response]]))

;; Example value:
;; {:host                  "smtp.gmail.com"
;;  :user                  "mail@gmail.com"
;;  :pass                  "mail"
;;  :ssl                   true
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

;; TODO verify that the user exists before sending a message
;;      This is done in some routes (for example get-password-reset-key)
;;      but not all (for example update-institution-role)
(defn send-mail [to-addresses cc-addresses bcc-addresses subject body content-type]
  (let [{:keys [message error]} (send-postal to-addresses
                                             cc-addresses
                                             bcc-addresses
                                             subject
                                             body
                                             content-type)]
    (when-not (= :SUCCESS error) (log-str message))))

(defn send-to-mailing-list [bcc-addresses subject body content-type]
  (let [base-url (get-base-url)
        new-body (str body
                      "<br><hr><p><a href=\""
                      base-url
                      (when-not (str/ends-with? base-url "/") "/")
                      "\">Unsubscribe</a></p>")
        res-map  (->> bcc-addresses
                      (filter email?)
                      (partition-all (:recipient-limit @mail-config))
                      (reduce (fn [acc cur]
                                (let [response (send-postal cur nil nil subject new-body content-type)]
                                  (if (= :SUCCESS (:error response))
                                    cur
                                    (-> acc
                                        (assoc :status 400)
                                        (update :message #(conj % (:message response)))))))
                              {}))]
    (data-response (str/join "\n" (:message res-map []))
                   {:status (:status res-map 200)})))

;; TODO its probably cleaner to handle the interval in send-to-mailing-list instead of in user.js
(defn get-mailing-list-interval []
     (:mailing-list-interval @mail-config))

(defn get-mailing-list-last-sent []
  (or (:mailing-list-last-sent @mail-config)
      (.minusSeconds (LocalDateTime/now) (get-mailing-list-interval))))

(defn set-mailing-list-last-sent! [time]
  (swap! mail-config assoc :mailing-list-last-sent time))

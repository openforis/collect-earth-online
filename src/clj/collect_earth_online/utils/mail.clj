(ns collect-earth-online.utils.mail
  (:require [clojure.edn :as edn]
            [postal.core :refer [send-message]]
            [triangulum.config :refer [get-config]]
            [collect-earth-online.logging :refer [log-str]]))

;; Example value:
;; {:host                  "smtp.gmail.com"
;;  :user                  "mail@gmail.com"
;;  :pass                  "mail"
;;  :tls                   true
;;  :port                  587
;;  :base-url              "https://collect.earth/"
;;  :recipient-limit       100}
(defonce mail-config (get-config :mail))

(defn get-base-url []
  (:base-url mail-config))

(defn email? [string]
  (let [pattern #"[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"]
    (and (string? string) (re-matches pattern string))))

(defn- send-postal [to-addresses cc-addresses bcc-addresses subject body content-type]
  (send-message
   (select-keys mail-config [:host :user :pass :tls :port])
   {:from    (:user mail-config)
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

(defn mass-send [bcc-addresses subject body]
  (->> bcc-addresses
       (filter email?)
       (partition-all (:recipient-limit mail-config))
       (reduce (fn [acc cur]
                 (let [response (send-postal nil nil cur subject body "text/html")]
                   (if (= :SUCCESS (:error response))
                     acc
                     (-> acc
                         (assoc :status 400)
                         (update :messages #(conj % (:message response)))))))
               {})))

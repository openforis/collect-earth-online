(ns org.openforis.ceo.https
  (:require [clojure.java.io :as io]
            [clojure.java.shell :as sh]
            [clojure.string :as str]
            [org.openforis.ceo.logging :refer [log-str]]))

(def path-env (System/getenv "PATH"))

;; Helper functions

(defn parse-as-sh-cmd
  "Split string into an array for use with clojure.java.shell/sh."
  [s]
  (loop [chars (seq s)
         acc   []]
    (if (empty? chars)
      acc
      (if (= \` (first chars))
        (recur (->> chars (rest) (drop-while #(not= \` %)) (rest))
               (->> chars (rest) (take-while #(not= \` %)) (apply str) (str/trim) (conj acc)))
        (recur (->> chars (drop-while #(not= \` %)))
               (->> chars (take-while #(not= \` %)) (apply str) (str/trim) (#(str/split % #" ")) (remove str/blank?) (into acc)))))))

(defn format-simple
  "Use any char after % for format."
  [f-str & args]
  (apply format (str/replace f-str #"(%[^ ])" "%s") args))

(defn sh-wrapper [dir env & commands]
  (io/make-parents (str dir "/dummy"))
  (sh/with-sh-dir dir
    (sh/with-sh-env (merge {:PATH path-env} env)
      (every?
       (fn [cmd]
         (log-str cmd)
         (let [{:keys [out err]} (apply sh/sh (parse-as-sh-cmd cmd))]
           (log-str "out: "   out)
           (log-str "error: " err)
           (= err "")))
       commands))))

(defn -main [& [domain path]]
  (if domain
    (let [certbot-path (.getPath (io/file (or path "/etc/letsencrypt/live/") domain))]
      (io/make-parents "./.key/dummy")
      (sh-wrapper "./"
                  {}
                  (format-simple "sudo certbot certonly --quiet --non-interactive --agree-tos -m support@sig-gis.com --webroot -w ./resources/public -d %1"
                                 domain)
                  (format-simple (str "sudo openssl pkcs12 -export -out ./.key/keystore.pkcs12"
                                      " -in %1/fullchain.pem"
                                      " -inkey %2/privkey.pem"
                                      " -passout pass:foobar")
                                 certbot-path
                                 certbot-path)))
    (println "You must provide a domain to create a SSL key.\n\n"
             "Usage: clojure -A:ssl-key-gen domain [certbot-path-root]"))
  (shutdown-agents))

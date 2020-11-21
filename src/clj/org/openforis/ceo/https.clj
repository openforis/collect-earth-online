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

(defn sh-wrapper [dir env & commands]
  (io/make-parents (str dir "/dummy"))
  (sh/with-sh-dir dir
    (sh/with-sh-env (merge {:PATH path-env} env)
      (every?
       (fn [cmd] (log-str cmd)
         (let [{:keys [out err]} (apply sh/sh (parse-as-sh-cmd cmd))]
           (log-str "out: "   out)
           (log-str "error: " err)
           (= err "")))
       commands))))

(defn package-certificate [domain certbot-dir]
  (sh-wrapper "./"
              {}
              (str "sudo openssl pkcs12 -export -out ./.key/keystore.pkcs12"
                   " -in " certbot-dir "/live/" domain "/fullchain.pem"
                   " -inkey " certbot-dir "/live/" domain "/privkey.pem"
                   " -passout pass:foobar")))

(defn initial-certificate [domain certbot-dir]
  (let [repo-path (.getAbsolutePath (io/file ""))]
    (spit "certbot-deploy-hook.sh"
          (str "#!/bin/sh"
               "\ncd " repo-path
               "\nclojure -A:package-cert " domain " " certbot-dir))
    (sh-wrapper "./"
                {}
                "chmod +x certbot-deploy-hook.sh"
                (str "sudo certbot certonly"
                     " --quiet"
                     " --non-interactive"
                     " --agree-tos"
                     " -m support@sig-gis.com"
                     " --webroot"
                     " -w ./resources/public"
                     " -d " domain
                     " --deploy-hook " repo-path "/certbot-deploy-hook.sh"))))

(defn -main [& [type domain certbot-dir]]
  (if domain
    (case type
      "certbot-init" (initial-certificate domain (or certbot-dir "/etc/letsencrypt"))
      "package-cert" (package-certificate domain (or certbot-dir "/etc/letsencrypt"))
      (println "Valid options are:"
               "\n  certbot-init domain [certbot-dir]    to initialize certbot"
               "\n  package-cert domian [certbot-dir]    to repackage certificates after an update"))
    (println "You must provide a domain to create an SSL key."))
  (shutdown-agents))

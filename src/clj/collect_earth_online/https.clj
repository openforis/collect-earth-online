(ns collect-earth-online.https
  (:require [clojure.java.io    :as io]
            [clojure.java.shell :as sh]
            [clojure.string     :as str]
            [clojure.tools.cli  :refer [parse-opts]]
            [triangulum.logging :refer [log-str]]))

(def path-env (System/getenv "PATH"))

;; Helper functions

(defn parse-as-sh-cmd
  "Split string into an array for use with clojure.java.shell/sh."
  [s]
  (loop [char-seq (seq s)
         acc      []]
    (if (empty? char-seq)
      acc
      (if (= \` (first char-seq))
        (recur (->> char-seq (rest) (drop-while #(not= \` %)) (rest))
               (->> char-seq (rest) (take-while #(not= \` %)) (apply str) (str/trim) (conj acc)))
        (recur (->> char-seq (drop-while #(not= \` %)))
               (->> char-seq
                    (take-while #(not= \` %))
                    (apply str)
                    (str/trim)
                    (#(str/split % #" "))
                    (remove str/blank?)
                    (into acc)))))))

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
  (let [repo-path (.getAbsolutePath (io/file ""))
        sh-path   (.getPath (io/file certbot-dir "renewal-hooks" "deploy" (str domain ".sh")))]
    (sh-wrapper "./"
                {}
                (str "sudo certbot certonly"
                     " --quiet"
                     " --non-interactive"
                     " --agree-tos"
                     " -m support@sig-gis.com"
                     " --webroot"
                     " -w ./resources/public"
                     " -d " domain))
    ;; Certbot does not create its /etc folder until a certificate is created.
    (spit sh-path
          (str "#!/bin/sh"
               "\ncd " repo-path
               "\nclojure -M:https --package-cert -d " domain " -p " certbot-dir))
    (sh-wrapper "./"
                {}
                (str "chmod +x " sh-path))
    ;; The initial certificates are created without the deploy hook. Package then the first time.
    (package-certificate domain certbot-dir)))

(def cli-options
  [["-i" "--certbot-init" "Initialize certbot."]
   ["-c" "--package-cert" "Package certbot certificate."]
   ["-d" "--domain DOMAIN" "Domain for certbot registration."
    :missing "You must provide a domain to create an SSL key."]
   ["-p" "--path PATH" "Alternative path for certbot installation."
    :default "/etc/letsencrypt"]])

(defn -main [& args]
  (let [{:keys [options summary errors]} (parse-opts args cli-options)
        {:keys [domain path certbot-init package-cert]} options]
    (cond
      (seq errors)
      (do
        (run! println errors)
        (println (str "Usage:\n" summary)))

      certbot-init
      (initial-certificate domain path)

      package-cert
      (package-certificate domain path)

      :else
      (do
        (println "You must indicate which action to take with either --certbot-init or --package-cert.")
        (println (str "Usage:\n" summary))))))

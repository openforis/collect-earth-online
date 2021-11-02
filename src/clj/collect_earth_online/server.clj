(ns collect-earth-online.server
  (:require [clojure.java.io     :as io]
            [clojure.string      :as str]
            [clojure.core.server :refer [start-server]]
            [ring.adapter.jetty :refer [run-jetty]]
            [triangulum.cli     :refer [get-cli-options]]
            [triangulum.config  :refer [get-config]]
            [triangulum.logging :refer [log-str set-log-path!]]
            [collect-earth-online.sockets :refer [send-to-server!]]
            [collect-earth-online.handler :refer [create-handler-stack]]))

(defonce ^:private server           (atom nil))
(defonce ^:private repl-server      (atom nil))
(defonce ^:private clean-up-service (atom nil))

(def ^:private expires-in "1 hour in msecs" (* 1000 60 60))
(def ^:private keystore-scan-interval 60) ; seconds

(defn- expired? [last-mod-time]
  (> (- (System/currentTimeMillis) last-mod-time) expires-in))

(defn- delete-tmp []
  (log-str "Removing temp files.")
  (let [tmp-dir (System/getProperty "java.io.tmpdir")
        dirs    (filter #(and (.isDirectory %)
                              (str/includes? % "ceo-tmp")
                              (expired? (.lastModified %)))
                        (.listFiles (io/file tmp-dir)))]
    (doseq [d    dirs
            file (reverse (file-seq d))]
      (io/delete-file file))))

(defn- start-clean-up-service! []
  (log-str "Starting temp file removal service.")
  (future
    (while true
      (Thread/sleep expires-in)
      (try (delete-tmp)
           (catch Exception _)))))

(def ^:private cli-options
  {:port       ["-p" "--http-port PORT"   "Port for http, default 8080" :parse-fn #(if (int? %) % (Integer/parseInt %))]
   :https-port ["-P" "--https-port PORT"  "Port for https (e.g. 8443)"  :parse-fn #(if (int? %) % (Integer/parseInt %))]
   :repl       ["-r" "--repl"             "Starts a REPL server on port 5555"
                :default false]

   :mode       ["-m" "--mode MODE"        "Production (prod) or development (dev) mode, default prod"
                :default "prod"
                :validate [#{"prod" "dev"} "Must be \"prod\" or \"dev\""]]

   :output-dir ["-o" "--output-dir DIR" "Output directory for log files. When a directory is not provided, output will be to stdout."
                :default ""]})

(def ^:private cli-actions
  {:start  {:description "Starts the server."
            :requires    [:port]}
   :stop   {:description "Stops the server."}
   :reload {:description "Reloads a running server."}})

(defn start-server! [{:keys [port https-port mode output-dir repl]}]
  (when repl
    (println "Starting REPL server on port 5555")
    (reset! repl-server (start-server {:name :ceo-repl :port 5555 :accept 'clojure.core.server/repl})))
  (let [has-key?   (.exists (io/file "./.key/keystore.pkcs12"))
        ssl?       (and has-key? https-port)
        handler    (create-handler-stack ssl? (= mode "dev"))
        config     (merge
                     {:port  port
                      :join? false}
                     (when ssl?
                       {:ssl?                   true
                        :ssl-port               https-port
                        :keystore               "./.key/keystore.pkcs12"
                        :keystore-type          "pkcs12"
                        :keystore-scan-interval keystore-scan-interval
                        :key-password           "foobar"}))]
    (if (and (not has-key?) https-port)
      (println "ERROR:\n"
               "  An SSL key is required if an HTTPS port is specified.\n"
               "  Create an SSL key for HTTPS or run without the --https-port (-P) option.")
      (do
        (reset! server (run-jetty handler config))
        (reset! clean-up-service (start-clean-up-service!))
        (set-log-path! output-dir)))))

(defn stop-server! []
  (set-log-path! "")
  (when @clean-up-service
    (future-cancel @clean-up-service)
    (reset! clean-up-service nil))
  (when @server
    (.stop @server)
    (reset! server nil)
    (System/exit 0)))

(defn stop-running-server! []
  (send-to-server! "127.0.0.1" 5555 "(do (require '[collect-earth-online.server :as server]) (server/stop-server!))"))

(defn reload-running-server! []
  (send-to-server! "127.0.0.1" 5555 "(require 'collect-earth-online.server :reload-all)"))

(defn -main [& args]
  (let [{:keys [action options]} (get-cli-options args cli-options cli-actions "server" (get-config :server))]
    (case action
      :start  (start-server! options)
      :stop   (stop-running-server!)
      :reload (reload-running-server!)
      nil)))

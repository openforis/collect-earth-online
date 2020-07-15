(ns org.openforis.ceo.server
  (:require [clojure.java.io :as io]
            [org.openforis.ceo.handler :refer [development-app production-app]]
            [ring.adapter.jetty :refer [run-jetty]]))

(defonce server (atom nil))

(defn start-server! [& [port mode]]
  (let [mode     (or mode "prod")
        has-key? (.exists (io/file "./.key/keystore.pkcs12"))
        handler  (if (= mode "prod")
                   #'production-app
                   #'development-app)
        config   (merge
                  {:port  (cond
                            (integer? port) port
                            (string? port)  (Integer/parseInt port)
                            (nil? port)     8080
                            :else           8080)
                   :join? false}
                  (when (and has-key? (= mode "prod"))
                    {:ssl?          true
                     :ssl-port      8443
                     :keystore      "./.key/keystore.pkcs12"
                     :keystore-type "pkcs12"
                     :key-password  "foobar"}))]
    (if (and (not has-key?) (= mode "prod"))
      (println "ERROR: there is no SSL key for enabling HTTPS! Create a SSL key for HTTPS or run with the \"dev\" option.")
      (reset! server (run-jetty handler config)))))

(defn stop-server! []
  (when @server
    (.stop @server)
    (reset! server nil)))

(def -main start-server!)

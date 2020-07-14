(ns org.openforis.ceo.server
  (:require [org.openforis.ceo.handler :refer [development-app production-app]]
            [ring.adapter.jetty :refer [run-jetty]]))

(defonce server (atom nil))

(defn start-server! [& [port mode]]
  (let [handler (case mode
                  "dev"  #'development-app
                  "prod" #'production-app
                  #'production-app)
        config  {:port (cond
                         (integer? port) port
                         (string? port)  (Integer/parseInt port)
                         (nil? port)     8080
                         :else           8080)
                 :join? false}]
    (reset! server (run-jetty handler config))))

(defn stop-server! []
  (when @server
    (.stop @server)
    (reset! server nil)))

(def -main start-server!)

(ns org.openforis.ceo.handler
  (:require [clojure.data.json :as json]
            [clojure.edn :as edn]
            [clojure.string :as str]
            [org.openforis.ceo.database :refer [sql-handler]]
            [org.openforis.ceo.logging :refer [log-str]]
            [org.openforis.ceo.remote-api :refer [clj-handler]]
            [org.openforis.ceo.views :refer [render-page not-found-page data-response]]
            [ring.middleware.absolute-redirects :refer [wrap-absolute-redirects]]
            [ring.middleware.content-type :refer [wrap-content-type]]
            [ring.middleware.default-charset :refer [wrap-default-charset]]
            [ring.middleware.keyword-params :refer [wrap-keyword-params]]
            [ring.middleware.multipart-params :refer [wrap-multipart-params]]
            [ring.middleware.nested-params :refer [wrap-nested-params]]
            [ring.middleware.not-modified :refer [wrap-not-modified]]
            [ring.middleware.params :refer [wrap-params]]
            [ring.middleware.reload :refer [wrap-reload]]
            [ring.middleware.resource :refer [wrap-resource]]
            [ring.middleware.x-headers :refer [wrap-frame-options wrap-content-type-options wrap-xss-protection]]
            [ring.util.codec :refer [url-decode]]))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Routing Handler
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; FIXME: Fill these in as you make pages.
(def view-routes #{})

;; FIXME: Add any conditions you want for URLs you want to exclude up front.
(defn bad-uri? [uri] (str/includes? (str/lower-case uri) "php"))

(defn forbidden-response [_]
  {:status 403
   :body "Forbidden"})

(defn token-resp [{:keys [auth-token]} handler]
  (if (= auth-token "KJlkjhasduewlkjdyask-dsf")
    handler
    forbidden-response))

(defn routing-handler [{:keys [uri params] :as request}]
  (let [next-handler (cond
                       (bad-uri? uri)                  forbidden-response
                       (= uri "/")                     (render-page "/home")
                       (contains? view-routes uri)     (render-page uri)
                       (str/starts-with? uri "/clj/")  (token-resp params clj-handler)
                       (str/starts-with? uri "/sql/")  (token-resp params sql-handler)
                       :else                           not-found-page)]
    (next-handler request)))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Custom Middlewares
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn wrap-request-logging [handler]
  (fn [request]
    (let [{:keys [uri request-method params]} request
          param-str (pr-str (dissoc params :auth-token))]
      (log-str "Request(" (name request-method) "): \"" uri "\" " param-str)
      (handler request))))

(defn wrap-response-logging [handler]
  (fn [request]
    (let [{:keys [status headers body] :as response} (handler request)
          content-type (headers "Content-Type")]
      (log-str "Response(" status "): "
               (cond
                 (str/includes? content-type "text/html")
                 "<html>...</html>"

                 (= content-type "application/edn")
                 (binding [*print-length* 2] (print-str (edn/read-string body)))

                 (= content-type "application/json")
                 (binding [*print-length* 2] (print-str (json/read-str body)))

                 :else
                 body))
      response)))

(defn parse-query-string [query-string]
  (let [keyvals (-> (url-decode query-string)
                    (str/split #"&"))]
    (reduce (fn [params keyval]
              (->> (str/split keyval #"=")
                   (map edn/read-string)
                   (apply assoc params)))
            {}
            keyvals)))

(defn wrap-edn-params [handler]
  (fn [{:keys [content-type request-method query-string body params] :as request}]
    (if (= content-type "application/edn")
      (let [get-params (when (and (= request-method :get)
                                  (not (str/blank? query-string)))
                         (parse-query-string query-string))
            post-params (when (and (= request-method :post)
                                   (not (nil? body)))
                          (edn/read-string (slurp body)))]
        (handler (assoc request :params (merge params get-params post-params))))
      (handler request))))

(defn wrap-exceptions [handler]
  (fn [request]
    (try
      (handler request)
      (catch Exception e
        (let [{:keys [data cause]} (Throwable->map e)
              status (:status data)]
          (log-str "Error: " cause)
          (data-response (or status 500) cause))))))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Handler Stacks
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def production-app (-> routing-handler
                        wrap-request-logging
                        wrap-keyword-params
                        wrap-edn-params
                        wrap-nested-params
                        wrap-multipart-params
                        wrap-params
                        wrap-absolute-redirects
                        (wrap-resource "public")
                        wrap-content-type
                        (wrap-default-charset "utf-8")
                        wrap-not-modified
                        (wrap-xss-protection true {:mode :block})
                        (wrap-frame-options :sameorigin)
                        (wrap-content-type-options :nosniff)
                        wrap-response-logging
                        wrap-exceptions))

(def development-app (-> production-app
                         wrap-reload))

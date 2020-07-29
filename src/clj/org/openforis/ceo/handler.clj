(ns org.openforis.ceo.handler
  (:require [clojure.data.json :as json]
            [clojure.edn       :as edn]
            [clojure.string    :as str]
            [ring.middleware.absolute-redirects :refer [wrap-absolute-redirects]]
            [ring.middleware.content-type       :refer [wrap-content-type]]
            [ring.middleware.default-charset    :refer [wrap-default-charset]]
            [ring.middleware.gzip               :refer [wrap-gzip]]
            [ring.middleware.keyword-params     :refer [wrap-keyword-params]]
            [ring.middleware.nested-params      :refer [wrap-nested-params]]
            [ring.middleware.not-modified       :refer [wrap-not-modified]]
            [ring.middleware.multipart-params   :refer [wrap-multipart-params]]
            [ring.middleware.params             :refer [wrap-params]]
            [ring.middleware.resource           :refer [wrap-resource]]
            [ring.middleware.reload             :refer [wrap-reload]]
            [ring.middleware.session            :refer [wrap-session]]
            [ring.middleware.ssl                :refer [wrap-ssl-redirect]]
            [ring.middleware.x-headers          :refer [wrap-frame-options wrap-content-type-options wrap-xss-protection]]
            [ring.util.codec                    :refer [url-decode]]
            [org.openforis.ceo.logging          :refer [log-str]]
            [org.openforis.ceo.views            :refer [render-page not-found-page data-response]]))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Routing Handler
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; FIXME: Fill these in as you make pages.
(def view-routes #{"/"
                   "/about"
                   "/accout"
                   "/collection"
                   "/create-instituion"
                   "/create-project"
                   "/geo-dash"
                   "/geo-dash/geo-dash-help" ; TODO flatten url structure
                   "/home"
                   "/institution-dashboard"
                   "/login"
                   "/password-request"
                   "/password-reset"
                   "/project-dashboard"
                   "/register"
                   "/review-institution"
                   "/review-project"
                   "/support"
                   "/widget-layout-editor"
                   "/mailing-list"
                   "/unsubscribe-mailing-list"})

(def proxy-routes #{"/get-tile"
                    "/get-securewatch-dates"})

(def api-routes (set (concat
                 ;; Account API
                 #{"/account"
                   "/login"
                   "/logout"
                   "/register"
                   "/password-reset"
                   "/password-request"}
                 ;; Project API
                 #{"/dump-project-aggregate-data"
                   "/dump-project-raw-data"
                   "/get-all-projects"
                   "/get-project-by-id"
                   "/get-project-stats"
                   "/archive-project"
                   "/close-project"
                   "/create-project"
                   "/publish-project"
                   "/update-project"}
                 ;; Plots API
                 #{"/get-next-plot"
                   "/get-plot-by-id"
                   "/get-prev-plot"
                   "/get-project-plots"
                   "/get-proj-plot"
                   "/add-user-samples"
                   "/flag-plot"
                   "/release-plot-locks"
                   "/reset-plot-lock"}
                 ;; Users API
                 #{"/get-all-users"
                   "/get-institution-users"
                   "/get-user-details"
                   "/get-user-stats"
                   "/update-project-user-stats"
                   "/update-user-institution-role"
                   "/request-institution-membership"
                   "/send-to-mailing-list"
                   "/unsubscribe-mailing-list"}
                 ;; Institutions API
                 #{"/get-all-institutions"
                   "/get-institution-details"
                   "/archive-institution"
                   "/create-institution"
                   "/update-institution"}
                 ;; Imagery API
                 #{"/get-institution-imagery"
                   "/get-project-imagery"
                   "/get-public-imagery"
                   "/add-geodash-imagery"
                   "/add-institution-imagery"
                   "/update-institution-imagery"
                   "/archive-institution-imagery"}
                 ;; GeoDash API
                 ;; TODO flatten routes
                 #{"/geo-dash/get-by-projid"
                   "/geo-dash/create-widget"
                   "/geo-dash/delete-widget"
                   "/geo-dash/gateway-request"
                   "/geo-dash/update-widget"})))

;; FIXME: Add any conditions you want for URLs you want to exclude up front.
(defn bad-uri? [uri] (str/includes? (str/lower-case uri) "php"))

(defn forbidden-response [_]
  (data-response "Forbidden" {:status 403}))

(defn routing-handler [{:keys [uri request-method] :as request}]
  (let [next-handler (cond
                       (bad-uri? uri)                    forbidden-response
                       (= uri "/")                       (render-page "/home")
                       (and (contains? view-routes uri)
                            (= request-method :get))     (render-page uri)
                       (and (contains? api-routes uri)
                            (= request-method :post))    (data-response "")
                       (and (contains? proxy-routes uri)
                            (= request-method :get))     (data-response "")
                       :else                             not-found-page)]
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

(defn wrap-session-params [handler]
  (fn [{:keys [session] :as request}]
    (handler (update request :params merge session))))

(defn wrap-exceptions [handler]
  (fn [request]
    (try
      (handler request)
      (catch Exception e
        (let [{:keys [data cause]} (Throwable->map e)
              status (:status data)]
          (log-str "Error: " cause)
          (data-response cause {:status (or status 500)}))))))

(defn wrap-common [handler]
  (-> handler
      wrap-request-logging
      wrap-keyword-params
      wrap-edn-params
      wrap-nested-params
      wrap-multipart-params
      wrap-session-params
      wrap-params
      wrap-session
      wrap-absolute-redirects
      (wrap-resource "public")
      wrap-content-type
      (wrap-default-charset "utf-8")
      wrap-not-modified
      (wrap-xss-protection true {:mode :block})
      (wrap-frame-options :sameorigin)
      (wrap-content-type-options :nosniff)
      wrap-response-logging
      wrap-gzip
      wrap-exceptions))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Handler Stacks
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def production-app (-> routing-handler
                        wrap-ssl-redirect
                        wrap-common))

(def development-app (-> routing-handler
                         wrap-common
                         wrap-reload))

(ns org.openforis.ceo.handler
  (:require [clojure.data.json :as json]
            [clojure.edn       :as edn]
            [clojure.string    :as str]
            [ring.middleware.absolute-redirects :refer [wrap-absolute-redirects]]
            [ring.middleware.content-type       :refer [wrap-content-type]]
            [ring.middleware.default-charset    :refer [wrap-default-charset]]
            [ring.middleware.gzip               :refer [wrap-gzip]]
            [ring.middleware.json               :refer [wrap-json-params]]
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
            [org.openforis.ceo.remote-api       :refer [api-handler]]
            [org.openforis.ceo.views            :refer [render-page not-found-page data-response]]))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Routing Handler
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; FIXME: Fill these in as you make pages.
(def view-routes #{"/"
                   "/about"
                   "/account"
                   "/collection"
                   "/create-institution"
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

                 ;; Users API
(def api-routes {"/get-all-users"                  :get
                 "/get-institution-users"          :get
                 "/get-user-details"               :get
                 "/get-user-stats"                 :get
                 "/account"                        :post
                 "/login"                          :post
                 "/logout"                         :post
                 "/register"                       :post
                 "/password-reset"                 :post
                 "/password-request"               :post
                 "/update-user-institution-role"   :post
                 "/request-institution-membership" :post
                 "/send-to-mailing-list"           :post
                 "/unsubscribe-mailing-list"       :post
                 ;; Projects API
                 "/dump-project-aggregate-data" :get
                 "/dump-project-raw-data"       :get
                 "/get-all-projects"            :get
                 "/get-project-by-id"           :get
                 "/get-project-stats"           :get
                 "/archive-project"             :post
                 "/close-project"               :post
                 "/create-project"              :post
                 "/publish-project"             :post
                 "/update-project"              :post
                 ;; Plots API
                 "/get-next-plot"      :get
                 "/get-plot-by-id"     :get
                 "/get-prev-plot"      :get
                 "/get-project-plots"  :get
                 "/get-proj-plot"      :get
                 "/add-user-samples"   :post
                 "/flag-plot"          :post
                 "/release-plot-locks" :post
                 "/reset-plot-lock"    :post
                 ;; Institutions API
                 "/get-all-institutions"    :get
                 "/get-institution-details" :get
                 "/archive-institution"     :post
                 "/create-institution"      :post
                 "/update-institution"      :post
                 ;; Imagery API
                 "/get-institution-imagery"     :get
                 "/get-project-imagery"         :get
                 "/get-public-imagery"          :get
                 "/add-geodash-imagery"         :post
                 "/add-institution-imagery"     :post
                 "/update-institution-imagery"  :post
                 "/archive-institution-imagery" :post
                 ;; GeoDash API
                 ;; TODO flatten routes
                 "/geo-dash/get-by-projid"   :get
                 "/geo-dash/create-widget"   :post
                 "/geo-dash/delete-widget"   :post
                 "/geo-dash/gateway-request" :post
                 "/geo-dash/update-widget"   :post})

;; FIXME: Add any conditions you want for URLs you want to exclude up front.
(defn bad-uri? [uri] (str/includes? (str/lower-case uri) "php"))

(defn forbidden-response [_]
  (data-response "Forbidden" {:status 403}))

(defn routing-handler [{:keys [uri request-method] :as request}]
  (let [next-handler (cond
                       (bad-uri? uri)
                       forbidden-response

                       (= uri "/")
                       (render-page "/home")

                       (and (contains? view-routes uri)
                            (= request-method :get))
                       (render-page uri)

                       (= request-method (api-routes uri))
                       (api-handler uri)

                       (and (contains? proxy-routes uri)
                            (= request-method :get))
                       (data-response "") ; FIXME missing proxy implementation

                       :else
                       not-found-page)]
    (next-handler request)))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Custom Middlewares
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn wrap-request-logging [handler]
  (fn [request]
    (let [{:keys [uri request-method params]} request
          param-str (pr-str (dissoc params :password :passwordConfirmation :base64Image))]
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
      wrap-json-params
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

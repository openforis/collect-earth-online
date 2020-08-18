(ns org.openforis.ceo.handler
  (:require [clojure.data.json :as json]
            [clojure.edn       :as edn]
            [clojure.string    :as str]
            [clojure.set       :as set]
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
            [ring.util.response                 :refer [redirect]]
            [ring.util.codec                    :refer [url-decode]]
            [org.openforis.ceo.logging          :refer [log-str]]
            [org.openforis.ceo.routing          :refer [routes]]
            [org.openforis.ceo.views            :refer [not-found-page data-response]]
            [org.openforis.ceo.db.projects      :refer [can-collect? is-proj-admin?]]
            [org.openforis.ceo.db.institutions  :refer [is-inst-admin?]]))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Routing Handler
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; TODO: Add any conditions you want for URLs you want to exclude up front.
(defn- bad-uri? [uri] (str/includes? (str/lower-case uri) "php"))

(defn- forbidden-response [_]
  (data-response "Forbidden" {:status 403}))

(defn- redirect-auth [user-id]
  (fn [request]
    (let [{:keys [query-string uri]} request
          full-url (str uri
                        (when query-string (str "?" query-string)))]
      (if (pos? user-id)
        (redirect (str "/home?flash_message=You do not have permission to access "
                       full-url))
        (redirect (str "/login?returnurl="
                       full-url
                       "&flash_message=You must login to see "
                       full-url))))))

(defn- is-cross-traffic? [{:keys [headers]}]
  (not (str/includes? (get headers "referer" "") (get headers "host" ""))))

(defn- wrap-authentication [request auth-type auth-action handler]
  (let [user-id (get-in request [:params :userId] -1)]
    (if (condp = auth-type
          :user       (pos? user-id)
          :super      (= 1  user-id)
          :collect    (can-collect? request)
          :proj-admin (is-proj-admin? request)
          :inst-admin (is-inst-admin? request)
          :no-cross   (is-cross-traffic? request)
          true)
      handler
      (if (= :redirect auth-action)
        (redirect-auth user-id)
        forbidden-response))))

(defn routing-handler [{:keys [uri request-method] :as request}]
  (let [{:keys [auth-type auth-action handler] :as route} (get routes [request-method uri])
        next-handler (cond
                       (bad-uri? uri)
                       forbidden-response

                       route
                       (wrap-authentication request auth-type auth-action handler)

                       :else
                       not-found-page)]
    (next-handler request)))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Custom Middlewares
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn wrap-request-logging [handler]
  (fn [request]
    (let [{:keys [uri request-method params]} request
          param-str (pr-str (dissoc params :password :passwordConfirmation))]
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

(def updatable-session-keys [:tokenKey])

(defn wrap-persistent-session [handler]
  (fn [request]
    (let [{:keys [params session]} request
          to-update    (select-keys params updatable-session-keys)
          session      (apply dissoc session (keys to-update))
          intersection (set/intersection (set (keys params)) (set (keys session)))
          response     (handler (update request :params merge session))]
      (when-not (empty? intersection)
        (log-str "WARNING! The following params are being overwritten by session values: " intersection))
      (if (and (contains? response :session)
               (nil? (:session response)))
        response
        (update response :session #(merge session to-update %))))))

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
      wrap-persistent-session
      wrap-keyword-params
      wrap-edn-params
      wrap-json-params
      wrap-nested-params
      wrap-multipart-params
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

(defonce development-app (-> routing-handler
                             wrap-common
                             wrap-reload))

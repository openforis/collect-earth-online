(ns collect-earth-online.handler
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
            [ring.util.codec                    :refer [url-encode url-decode]]
            [triangulum.logging         :refer [log-str]]
            [triangulum.type-conversion :refer [val->int]]
            [triangulum.utils           :refer [data-response]]
            [collect-earth-online.routing          :refer [routes]]
            [collect-earth-online.views            :refer [not-found-page]]
            [collect-earth-online.db.projects      :refer [can-collect? is-proj-admin?]]
            [collect-earth-online.db.institutions  :refer [is-inst-admin?]]))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Routing Handler
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn- forbidden-response [_]
  (data-response "Forbidden" {:status 403}))

(defn- redirect-auth [user-id]
  (fn [request]
    (let [{:keys [query-string uri]} request
          full-url (url-encode (str uri (when query-string (str "?" query-string))))]
      (if (pos? user-id)
        (redirect (str "/home?flash_message=You do not have permission to access "
                       full-url))
        (redirect (str "/login?returnurl="
                       full-url
                       "&flash_message=You must login to see "
                       full-url))))))

(defn- no-cross-traffic? [{:strs [referer host]}]
  (and referer host (str/includes? referer host)))

(defn authenticated-routing-handler [{:keys [uri request-method params headers] :as request}]
  (let [{:keys [auth-type auth-action handler] :as route} (get routes [request-method uri])
        user-id        (:userId params -1)
        institution-id (val->int (:institutionId params))
        project-id     (val->int (:projectId params))
        next-handler   (if route
                         (if (condp = auth-type
                               :user     (pos? user-id)
                               :super    (= 1  user-id)
                               :collect  (can-collect? user-id project-id (:tokenKey params))
                               :token    (can-collect? -99 project-id (:tokenKey params))
                               :admin    (cond
                                           (pos? project-id)
                                           (is-proj-admin? user-id project-id (:tokenKey params))

                                           (pos? institution-id)
                                           (is-inst-admin? user-id institution-id))
                               :no-cross (no-cross-traffic? headers)
                               true)
                           handler
                           (if (= :redirect auth-action)
                             (redirect-auth user-id)
                             forbidden-response))
                         not-found-page)]
    (next-handler request)))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Custom Middlewares
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn wrap-bad-uri [handler]
  (fn [request]
    (if (str/includes? (str/lower-case (:uri request)) "php")
      (forbidden-response nil)
      (handler request))))

(defn wrap-request-logging [handler]
  (fn [request]
    (let [{:keys [uri request-method params]} request
          param-str (pr-str (dissoc params
                                    :password
                                    :passwordConfirmation
                                    :base64Image
                                    :plotFileBase64
                                    :sampleFileBase64))]
      (log-str "Request(" (name request-method) "): \"" uri "\" " param-str)
      (handler request))))

(defn wrap-response-logging [handler]
  (fn [request]
    (let [{:keys [status headers body] :as response} (handler request)
          content-type (headers "Content-Type")]
      (log-str "Response(" status "): "
               (cond
                 (instance? java.io.File body)
                 (str content-type " file")

                 (= content-type "application/edn")
                 (binding [*print-length* 2] (print-str (edn/read-string body)))

                 (= content-type "application/json")
                 (binding [*print-length* 2] (print-str (json/read-str body)))

                 :else
                 (str content-type " response")))
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

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Handler Stack
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn optional-middleware [handler mw use?]
  (if use?
    (mw handler)
    handler))

(defn create-handler-stack [ssl? reload?]
  (-> authenticated-routing-handler
      (optional-middleware wrap-ssl-redirect ssl?)
      wrap-bad-uri
      wrap-request-logging
      wrap-persistent-session
      wrap-keyword-params
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
      wrap-exceptions
      (optional-middleware wrap-reload reload?)))

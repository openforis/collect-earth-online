(ns collect-earth-online.handlers
  (:require [collect-earth-online.db.imagery :as imagery]
            [collect-earth-online.db.institutions :refer [is-inst-admin?]]
            [collect-earth-online.db.projects     :refer [can-collect? is-proj-admin?]]
            [collect-earth-online.db.metrics      :refer [show-metrics-user]]
            [ring.util.codec                      :refer [url-encode]]
            [ring.util.response                   :refer [redirect]]
            [triangulum.config                    :refer [get-config]]
            [triangulum.database                  :refer [call-sql]]
            [triangulum.response                  :refer [no-cross-traffic? data-response]]
            [triangulum.type-conversion           :refer [val->int]]))


(defn route-authenticator [{:keys [session params headers] :as _request} auth-type]
  (let [user-id        (:userId session -1)
        institution-id (val->int (:institutionId params))
        project-id     (val->int (:projectId params))
        token-key      (:tokenKey params)]

    (condp = auth-type
      :user    (pos? user-id)
      :super   (= 1 user-id)
      :collect (can-collect? user-id project-id token-key)
      :token   (can-collect? -99 project-id token-key)
      :admin   (cond
                 (pos? project-id)     (is-proj-admin? user-id project-id token-key)
                 (pos? institution-id) (is-inst-admin? user-id institution-id))
      :no-cross (no-cross-traffic? headers)
      :metrics (show-metrics-user user-id)
      true)))

(defn redirect-handler [{:keys [session query-string uri] :as _request}]
  (let [full-url (url-encode (str uri (when query-string (str "?" query-string))))]
    (if (:userId session)
      (redirect (str "/home?flash_message=You do not have permission to access "
                     full-url))
      (redirect (str "/login?returnurl="
                     full-url
                     "&flash_message=You must login to see "
                     full-url)))))

(defn crumb-data [{:keys [params session]}]
  (let [user-id        (:userId session -1)
        project        (when-let [project-id (-> params :project val->int)]
                         (-> (call-sql "select_project_by_id" project-id)
                             first :name))
        institution    (when-let [inst-id (-> params :institution val->int)]
                         (-> (call-sql "select_institution_by_id" inst-id user-id)
                             first :name))]
    (data-response {:project project
                    :institution institution})))

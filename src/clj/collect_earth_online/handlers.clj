(ns collect-earth-online.handlers
  (:require [collect-earth-online.db.imagery :as imagery]
            [collect-earth-online.db.institutions :refer [is-inst-admin?]]
            [collect-earth-online.db.projects     :refer [can-collect? is-proj-admin?]]
            [collect-earth-online.db.metrics      :refer [show-metrics-user]]
            [malli.core                           :as m]
            [malli.utils                          :as mu]
            [ring.util.codec                      :refer [url-encode]]
            [ring.util.response                   :refer [redirect]]
            [triangulum.config                    :refer [get-config]]
            [triangulum.response                  :refer [no-cross-traffic?]]
            [triangulum.type-conversion           :refer [val->int]]))

(def validation-map
  {:imagery/get-institution-imagery  [:map [:params [:map]]]
   :imagery/get-project-imagery      [:map [:session [:map
                                                      [:userId :int?]]
                                            :params [:map
                                                     [:tokenKey :string]
                                                     [:projectId :int]]]]
   :imagery/get-public-imagery [:map [:params [:map]]]
   :imagery/add-institution-imagery [:map [:params
                                           [:map
                                            [:institutionId :int]
                                            [:imageryTitle :string]
                                            [:imageryAttribution :string]
                                            [:sourceConfig :string] ;;json
                                            [:isProxied :boolean]
                                            [:addToAllProjects :boolean?]]]]
   :imagery/update-institution-imagery [:map [:params
                                              [:map
                                               [:imageryId :int]
                                               [:imageryTitle :string]
                                               [:imageryAttribution :string]
                                               [:sourceConfig :string] ;;json
                                               [:isProxied :boolean]
                                               [:addToAllProjects :boolean?]
                                               [:institutionId :int]]]]
   :imagery/update-imagery-visibility [:map [:params
                                             [:map
                                              [:imageryId :int]
                                              [:visibility :string]
                                              [:institutionId :int]]]]
   :imagery/archive-institution-imagery [:map [:params
                                               [:map
                                                [:imageryId :int]]]]
   :imagery/bulk-archive-institution-imagery [:map [:params
                                                    [:map
                                                     [:institutionId :int]
                                                     [:imageryIds [:vector :int]]]]]
   :imagery/bulk-update-imagery-visibility [:map [:params
                                                  [:map
                                                   [:imageryIds [:vector :int]]
                                                   [:visibility :string]
                                                   [:institutionId :int]]]]})

(defmacro payload [[query & [args]]]
  `(when (-> validation-map
             (get ~(keyword (str query)))
             mu/closed-schema
             (m/validate ~args))     
     (~query ~args)))

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

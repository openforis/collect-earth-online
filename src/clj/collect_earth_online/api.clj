(ns collect-earth-online.api
  (:require [collect-earth-online.db.imagery :as imagery]
            [malli.core :as m]
            [malli.util :as mu]
            [triangulum.response :refer [data-response]]
            [triangulum.logging :refer [log]]
            [malli.error :as me]))


(def validation-map
  {:imagery/get-institution-imagery  [:map
                                      [:params [:map
                                                [:institutionId :int]]]
                                      #_[:session [:map
                                                 [:userId :int]]]
                                      ]
   :imagery/get-project-imagery      [:map [:session [:map
                                                      [:userId :int]]
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
                                            [:addToAllProjects :boolean]]]]
   :imagery/update-institution-imagery [:map [:params
                                              [:map
                                               [:imageryId :int]
                                               [:imageryTitle :string]
                                               [:imageryAttribution :string]
                                               [:sourceConfig :string] ;;json
                                               [:isProxied :boolean]
                                               [:addToAllProjects :boolean]
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


(defmacro payload [query]
  `(fn [args#]
     (println (-> validation-map
             (get ~(keyword (str query)))
             ;; mu/closed-schema
             (m/explain args#)
             me/humanize))
     (if (-> validation-map
             (get ~(keyword (str query)))
             ;; mu/closed-schema
             (m/validate args#))
       (~query args#)       
       (data-response "Invalid Request Payload"  {:status 403
                                                  :body args#}))))

(ns collect-earth-online.api
  (:require [collect-earth-online.db.imagery :as imagery]
            [collect-earth-online.db.geodash :as geodash]
            [malli.core :as m]
            [malli.util :as mu]
            [triangulum.response :refer [data-response]]
            [triangulum.type-conversion :as tc]
            [malli.error :as me]))


(def Int [:fn {} #(let [input %
                        output (tc/val->int input)]
                    (or (int? input) (= input (str output))))])

(def Bool [:fn {} #(let [input %
                         output (tc/val->bool input)]
                     (or (boolean? input) (= input (str output))))])

(def Json [:fn {} #(= % (-> % tc/json->clj tc/clj->json))])

(def validation-map
  {:imagery/get-institution-imagery             [:map
                                                 [:params  [:map
                                                            [:institutionId      Int]]]
                                                 [:session [:map
                                                            [:userId
                                                             {:optional true}    Int]]]]
   :imagery/get-project-imagery                 [:map
                                                 [:session [:map
                                                            [:userId
                                                             {:optional true}    Int]]]
                                                 [:params  [:map
                                                            [:tokenKey           :string]
                                                            [:projectId          Int]]]]
   :imagery/get-public-imagery                  [:map]
   :imagery/add-institution-imagery             [:map
                                                 [:params  [:map
                                                            [:institutionId      Int]
                                                            [:imageryTitle       :string]
                                                            [:imageryAttribution :string]
                                                            [:sourceConfig       Json]
                                                            [:isProxied          Bool]
                                                            [:addToAllProjects
                                                             {:optional true}    Bool]]]]
   :imagery/update-institution-imagery          [:map
                                                 [:params  [:map
                                                            [:imageryId          Int]
                                                            [:imageryTitle       :string]
                                                            [:imageryAttribution :string]
                                                            [:sourceConfig       Json]
                                                            [:isProxied          Bool]
                                                            [:addToAllProjects
                                                             {:optional true}    Bool]
                                                            [:institutionId      Int]]]]
   :imagery/update-imagery-visibility           [:map
                                                 [:params  [:map
                                                            [:imageryId          Int]
                                                            [:visibility         :string]
                                                            [:institutionId      Int]]]]
   :imagery/archive-institution-imagery         [:map
                                                 [:params  [:map
                                                            [:imageryId          Int]]]]
   :imagery/bulk-archive-institution-imagery    [:map
                                                 [:params  [:map
                                                            [:institutionId      Int]
                                                            [:imageryIds [:vector Int]]]]]
   :imagery/bulk-update-imagery-visibility      [:map
                                                 [:params  [:map
                                                            [:imageryIds [:vector Int]]
                                                            [:visibility         :string]
                                                            [:institutionId      Int]]]]
   :geodash/gateway-request                     [:map
                                                 [:params [:map
                                                           [:path                :string]]]
                                                 [:json-params                   Json]]
   :geodash/get-project-widgets                 [:map
                                                 [:params [:map
                                                           [:projectId           Int]]]]
   :geodash/create-dashboard-widget-by-id       [:map
                                                 [:params [:map
                                                           [:projectId           Int]
                                                           [:widgetJSON          Json]]]]
   :geodash/update-dashboard-widget-by-id       [:map
                                                 [:params [:map
                                                           [:projectId           Int]
                                                           [:widgetJSON          Json]]]]
   :geodash/delete-dashboard-widget-by-id       [:map
                                                 [:params [:map
                                                           [:projectId           Int]
                                                           [:widgetJSON          Json]]]]   
   :geodash/copy-project-widgets                [:map
                                                 [:params [:map
                                                           [:projectId           Int]
                                                           [:templateId          Int]]]]
   :geodash/validate-vis-params                 [:map
                                                 [:params [:map
                                                           [:imgPath             :string]
                                                           [:visParams           Json]]]]
   })


(defmacro validate [query]
  `(fn [args#]
     (println (select-keys args# [:form-params :query-params :session]))
     (if (-> validation-map
             (get ~(keyword (str query)))
             ;; mu/closed-schema
             (m/validate args#))
       (~query args#)       
       (data-response "Invalid Request Payload"  {:status 403
                                                  :body args#}))))



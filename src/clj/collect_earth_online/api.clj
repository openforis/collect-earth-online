(ns collect-earth-online.api
  (:require [collect-earth-online.db.doi     :as doi]
            [collect-earth-online.db.geodash :as geodash]
            [collect-earth-online.db.imagery :as imagery]
            [malli.core :as m]
            [triangulum.response :refer [data-response]]
            [triangulum.type-conversion :as tc]
            
            [malli.error :as me]
            [clojure.pprint :refer [pprint]]))


(def Int [:fn {} #(let [input %
                        output (tc/val->int input)]
                    (or (int? input) (= input (str output))))])

(def Bool [:fn {} #(let [input %
                         output (tc/val->bool input)]
                     (or (boolean? input) (= input (str output))))])

(def Json [:fn {} #(= % (-> % tc/json->clj tc/clj->json))])

(def Coordinates [:vector {:min 2 :max 2} :float])

(def GatewayPath [:enum "timeSeriesByIndex"
                  "imageCollectionByIndex"
                  "image"
                  "degradationTimeSeries"
                  "filteredSentinel2"
                  "getPlanetTile"
                  "statistics"
                  "filteredSentinelSAR"
                  "imageCollection"
                  "filteredLandsat"
                  "degradationTileUrl"
                  "featureCollection"
                  "getAvailableBands"
                  "filteredNicfi"])

(def GatewayRequest
  [:map
   [:path GatewayPath]
   [:layout [:map
             [:h Int]
             [:w Int]
             [:x Int]
             [:y Int] ]]
   [:name :string]
   [:startDate #_ "YYYY-MM-DD" :string]
   [:endDate #_ "YYYY-MM-DD" :string]
   [:type :string]
   [:geometry [:vector Coordinates]]
   [:id Int]
   [:indexName :string]])

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
                                                            [:tokenKey
                                                             {:optional true}    :string]
                                                            [:projectId          Int]]]]
   :imagery/get-public-imagery                  [:map]
   :imagery/add-institution-imagery             [:map
                                                 [:params  [:map
                                                            [:institutionId      Int]
                                                            [:imageryTitle       :string]
                                                            [:imageryAttribution :string]
                                                            [:sourceConfig       :string]
                                                            [:isProxied          Bool]
                                                            [:addToAllProjects
                                                             {:optional true}    Bool]]]]
   :imagery/update-institution-imagery          [:map
                                                 [:params  [:map
                                                            [:imageryId          Int]
                                                            [:imageryTitle       :string]
                                                            [:imageryAttribution :string]
                                                            [:sourceConfig       :string]
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
                                                 [:params GatewayRequest]
                                                 
                                                 [:json-params {:optional true}  Json]]
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
   :doi/create-doi!                             [:map
                                                 [:session [:map
                                                            [:userId {:optional? true} Int]
                                                            ]]
                                                 [:params [:map
                                                             [:projectId Int]
                                                             [:projectName :string]
                                                             [:institution Int]
                                                             [:description :string]]]]
   :doi/publish-doi!                            [:map
                                                 [:params [:map
                                                           [:projectId Int]]]]
   :doi/get-doi-reference                       [:map
                                                 [:params [:map
                                                           [:projectId Int]]]]
   })

(defmacro validate [query]
  `(fn [args#]     
     (if (-> validation-map
             (get ~(keyword (str query)))
             (m/validate args#))
       (~query args#)
       (data-response "Invalid Request Payload"  {:status 403
                                                  :body args#}))))


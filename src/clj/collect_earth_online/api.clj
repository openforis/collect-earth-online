(ns collect-earth-online.api
  (:require [collect-earth-online.db.doi     :as doi]
            [collect-earth-online.db.geodash :as geodash]
            [collect-earth-online.db.imagery :as imagery]
            [malli.core :as m]
            [triangulum.response :refer [data-response]]
            [triangulum.type-conversion :as tc]
            
            [malli.error :as me]
            [clojure.pprint :refer [pprint]]))


(def Int
  [:fn {} #(let [input %
                 output (tc/val->int input)]
             (or (int? input) (= input (str output))))])

(def Bool
  [:fn {} #(let [input %
                 output (tc/val->bool input)]
             (or (boolean? input) (= input (str output))))])

(def Json
  [:fn {} #(= % (-> % tc/json->clj tc/clj->json))])

(def Coordinates [:vector {:min 2 :max 2} :float])

(def Date
  [:fn {} #(java.time.LocalDate/parse %)])

(def GatewayPath
  [:enum "timeSeriesByIndex"
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

(def Project
  [:map
   [:institutionId {:optional true} Int]
   [:projectTemplate {:optional true} Int]
   [:useTemplatePlots {:optional true} Bool]
   [:useTemplateWidgets {:optional true} Bool]
   [:imageryId int?]
   [:projectImageryList [:vector any?]]
   [:aoiFeatures [:vector any?]]
   [:aoiFileName [:maybe string?]]
   [:description string?]
   [:name string?]
   [:type [:enum "regular" "simplified"]]
   [:plotDistribution [:enum "random" "grid" "shp" "csv" "json"]]
   [:plotShape [:maybe [:enum "square" "circle"]]]
   [:plotSize [:maybe Int]]
   [:plotSpacing [:maybe Int]]
   [:shufflePlots [:maybe Bool]]
   [:sampleDistribution [:enum "random" "grid" "center" "shp" "csv" "json"]]
   [:samplesPerPlot [:maybe Int]]
   [:sampleResolution  [:maybe Int]]
   [:allowDrawnSamples {:optional true} Bool]
   [:surveyQuestions map?]
   [:surveyRules [:vector any?]]])

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
  {:imagery/get-institution-imagery          [:map
                                              [:params  [:map
                                                         [:institutionId      Int]]]
                                              [:session [:map
                                                         [:userId
                                                          {:optional true}    Int]]]]
   :imagery/get-project-imagery              [:map
                                              [:session [:map
                                                         [:userId
                                                          {:optional true}    Int]]]
                                              [:params  [:map
                                                         [:tokenKey
                                                          {:optional true}    :string]
                                                         [:projectId          Int]]]]
   :imagery/get-public-imagery               [:map]
   :imagery/add-institution-imagery          [:map
                                              [:params  [:map
                                                         [:institutionId      Int]
                                                         [:imageryTitle       :string]
                                                         [:imageryAttribution :string]
                                                         [:sourceConfig       :string]
                                                         [:isProxied          Bool]
                                                         [:addToAllProjects
                                                          {:optional true}    Bool]]]]
   :imagery/update-institution-imagery       [:map
                                              [:params  [:map
                                                         [:imageryId          Int]
                                                         [:imageryTitle       :string]
                                                         [:imageryAttribution :string]
                                                         [:sourceConfig       :string]
                                                         [:isProxied          Bool]
                                                         [:addToAllProjects
                                                          {:optional true}    Bool]
                                                         [:institutionId      Int]]]]
   :imagery/update-imagery-visibility        [:map
                                              [:params  [:map
                                                         [:imageryId          Int]
                                                         [:visibility         :string]
                                                         [:institutionId      Int]]]]
   :imagery/archive-institution-imagery      [:map
                                              [:params  [:map
                                                         [:imageryId          Int]]]]
   :imagery/bulk-archive-institution-imagery [:map
                                              [:params  [:map
                                                         [:institutionId      Int]
                                                         [:imageryIds [:vector Int]]]]]
   :imagery/bulk-update-imagery-visibility   [:map
                                              [:params  [:map
                                                         [:imageryIds [:vector Int]]
                                                         [:visibility         :string]
                                                         [:institutionId      Int]]]]
   :geodash/gateway-request                  [:map
                                              [:params GatewayRequest]

                                              [:json-params {:optional true}  Json]]
   :geodash/get-project-widgets           [:map
                                           [:params [:map
                                                     [:projectId           Int]]]]
   :geodash/create-dashboard-widget-by-id [:map
                                           [:params [:map
                                                     [:projectId           Int]
                                                     [:widgetJSON          Json]]]]
   :geodash/update-dashboard-widget-by-id [:map
                                           [:params [:map
                                                     [:projectId           Int]
                                                     [:widgetJSON          Json]]]]
   :geodash/delete-dashboard-widget-by-id [:map
                                           [:params [:map
                                                     [:projectId           Int]
                                                     [:widgetJSON          Json]]]]
   :geodash/copy-project-widgets          [:map
                                           [:params [:map
                                                     [:projectId           Int]
                                                     [:templateId          Int]]]]
   :geodash/validate-vis-params           [:map
                                           [:params [:map
                                                     [:imgPath             :string]
                                                     [:visParams           Json]]]]
   :projects/create-project!               [:map
                                            [:params Project]]
   :projects/update-project!               [:map [:params Project]]
   :projects/create-project-draft!         [:map [:params Project]]
   :projects/update-project-draft!         [:map [:params Project]]
   :projects/close-project!               [:map
                                           [:params [:map [:projectId Int]]]
                                           [:session [:map [:userId Int]]]]
   :projects/archive-project!             [:map
                                            [:params [:map [:projectId Int]]]]
   :projects/delete-projects-bulk!        [:map
                                           [:params
                                            [:map
                                             [:projectIds [:vector Int]]
                                             [:institutionId Int]]]]
   :projects/edit-projects-bulk!           [:map
                                            [:params
                                             [:map
                                              [:projectIds [:vector Int]]
                                              [:institutionId Int]
                                              [:visibility [:enum "institution" "public" "private" "users"]]]]]
   :projects/publish-project!              [:map
                                            [:params
                                             [:map
                                              [:projectId Int]
                                              [:clearSaved Bool]]]
                                            [:session [:map [:userId Int]]]]
   :projects/check-plot-csv               [:map
                                           [:params
                                            [:map
                                             [:projectId Int]
                                             [:plotFileName [:maybe string?]]
                                             [:plotFileBase64 [:maybe string?]]]]]
   :projects/import-ce-project            [:map
                                           [:params
                                            [:map
                                             [:fileName string?]
                                             [:fileb64 string?]]]]
   :#'doi/create-doi!                     [:map
                                           [:session [:map
                                                      [:userId {:optional? true} Int]]]
                                           [:params [:map
                                                     [:projectId Int]
                                                     [:projectName :string]
                                                     [:institution Int]
                                                     [:description :string]]]]
   :#'doi/publish-doi!                    [:map
                                           [:params [:map
                                                     [:projectId Int]]]]
   :#'doi/get-doi-reference               [:map
                                           [:params [:map
                                                     [:projectId Int]]]]
   :metrics/get-imagery-access          [:map
                                           [:params [:map
                                                     [:startDate Date]
                                                     [:endDate Date]]]]
   :metrics/get-projects-with-gee       [:map
                                           [:params [:map
                                                     [:startDate Date]
                                                     [:endDate Date]]]]
   :metrics/get-sample-plots-counts     [:map
                                           [:params [:map
                                                     [:startDate Date]
                                                     [:endDate Date]]]]
   :metrics/get-project-count           [:map
                                           [:params [:map
                                                     [:startDate Date]
                                                     [:endDate Date]]]]})

(defmacro validate [query]
  `(fn [args#]
     (if (-> validation-map
             (get ~(keyword (str query)))
             (m/validate args#))
       (~query args#)
       (data-response "Invalid Request Payload"  {:status 403
                                                  :body args#}))))

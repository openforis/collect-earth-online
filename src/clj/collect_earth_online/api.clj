(ns collect-earth-online.api
  (:require [collect-earth-online.db.doi     :as doi]
            [collect-earth-online.db.geodash :as geodash]
            [collect-earth-online.db.imagery :as imagery]
            [malli.core :as m]
            [malli.util :as mu]
            [triangulum.response :refer [data-response]]
            [triangulum.type-conversion :as tc]
            [triangulum.config :refer [get-config]]
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
                                              [:uri [:= "/get-institution-imagery"]]
                                              [:params  [:map
                                                         [:institutionId       Int]]]
                                              [:session [:map
                                                         [:userId
                                                          {:optional true}     Int]]]]
   :imagery/get-project-imagery              [:map
                                              [:uri [:= "/get-project-imagery"]]
                                              [:session [:map
                                                         [:userId
                                                          {:optional true}    Int]]]
                                              [:params  [:map
                                                         [:tokenKey
                                                          {:optional true}     :string]
                                                         [:projectId          Int]]]]
   :imagery/get-public-imagery               [:map [:uri [:= "/get-public-imagery"]]]
   :imagery/add-institution-imagery          [:map
                                              [:uri [:= "/add-institution-imagery"]]
                                              [:json-params Json]
                                              [:params  [:map
                                                         [:institutionId      Int]
                                                         [:imageryTitle       :string]
                                                         [:imageryAttribution :string]
                                                         [:sourceConfig       :string]
                                                         [:isProxied          Bool]
                                                         [:addToAllProjects
                                                          {:optional true}     Bool]]]]
   :imagery/update-institution-imagery       [:map
                                              [:uri [:= "/update-institution-imagery"]]
                                              [:json-params Json]
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
                                              [:uri [:= "/update-imagery-visibility"]]
                                              [:json-params Json]
                                              [:params  [:map
                                                         [:imageryId          Int]
                                                         [:visibility         :string]
                                                         [:institutionId      Int]]]]
   :imagery/archive-institution-imagery      [:map
                                              [:uri [:= "/archive-institution-imagery"]]
                                              [:json-params Json]
                                              [:params  [:map
                                                         [:imageryId          Int]]]]
   :imagery/bulk-archive-institution-imagery [:map
                                              [:uri [:= "/bulk-archive-institution-imagery"]]
                                              [:json-params Json]
                                              [:params  [:map
                                                         [:institutionId      Int]
                                                         [:imageryIds [:vector Int]]]]]
   :imagery/bulk-update-imagery-visibility   [:map
                                              [:uri [:= "/edit-imagery-bulk"]]
                                              [:json-params Json]
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
 
(def Session
  [:map 
   [:userId        {:optional true} Int]
   [:userName      {:optional true} :string]
   [:acceptedTerms {:optional true} Bool]
   [:userRole      {:optional true} :string]])

(def request-wrapper #_[host port]
  [:map
   {:closed true}
   [:ssl-client-cert    :any] ;;can we do better than this?
   [:protocol           [:enum "HTTP/1.1" "HTTP/2" "h2c"]]
   [:cookies            [:map-of :string :any]]
   [:remote-addr #_ "127.0.0.1" :string]
   #_   [:uri                :string]
   [:session            Session]
   [:params             [:map]] ;;do we need to see all four?
   [:form-params        [:map]#_[:map-of :string :any]] ;;or just one per request?
   [:multipart-params   [:map]#_[:map-of :string :any]] ;;how do we stipulate that?
   [:query-params       [:map]#_[:map-of :string :any]] ;;seriously   
   ;; aren't all of the above -params keys merged due to triangulum?
   [:headers            [:map-of :string :string]   
    #_{"connection" "close",
       "user-agent" "Apache-HttpClient/4.5.13 (Java/17.0.15)",
       "host" "local.collect.earth:8080",
       "accept-encoding" "gzip, deflate"}]
   [:server-port        [:= (get-config :triangulum.server/http-port)]] 
   [:server-name        [:= (get-config :triangulum.server/http-host)]]
   [:content-length     [:maybe Int]]
   [:session/key        [:maybe :any]] ;;can we do better than this?
   [:content-type       [:maybe [:enum "application/json"
                                 "text/html"

                                 "application/x-www-form-urlencoded"
                                 "multipart/form-data"]]]
   [:character-encoding [:maybe [:enum "UTF-8" "iso-8859-1"]]]   
   [:query-string       [:maybe :string]]
   [:body               [:any]] ;; stumped on how to desdcribe a ReadableStream
   [:scheme             [:enum :http :https]]
   [:request-method     [:enum :get :post :put :delete :path :head :options]]])


(defmacro validate
  "all middlewares will have wrapped by the time this is applied to route"
  [query]
  `(fn [args#]
     (if (m/validate
          (->> ~(keyword (str query))
               (get validation-map)
               (mu/merge request-wrapper))
          args#)
       (~query args#)       
       (data-response "Invalid Request Payload"  {:status 481
                                                  :body args#}))))

(comment
  (->
   (->> ~(keyword (str query))
        (get validation-map)
        (mu/merge request-wrapper))
   (m/explain  args#)
   me/humanize
   pprint)
  )

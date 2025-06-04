(ns collect-earth-online.api
  (:require [collect-earth-online.db.imagery :as imagery]
            [collect-earth-online.db.geodash :as geodash]
            [collect-earth-online.db.projects :as projects]
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

(def Dbl [:fn {} #(let [input %
                        output (tc/val->double input)]
                    (or (double? input) (= input (str output))))])

(def Coordinates [:vector {:min 2 :max 2} [:or Int Dbl]])

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

(comment
{:params
 {:description
  "This project is a default project for development testing.",
  :shufflePlots nil,
  :aoiFileName "",
  :plotSize 200,
  :aoiFeatures
  [{:type "Polygon",
    :coordinates
    [[[95 10.5] [95 22.5] [107 22.5] [107 10.5] [95 10.5]]]}],
  :designSettings
  {:sampleGeometries {:points true, :lines true, :polygons true},
   :userAssignment {:userMethod "none", :users [], :percents []},
   :qaqcAssignment
   {:qaqcMethod "none", :percent 0, :smes [], :timesToReview 2}},
  :name "Test Projecto",
  :projectImageryList [1],
  :plotSpacing nil,
  :numPlots 3,
  :type "regular",
  :sampleFileName nil,
  :privacyLevel "public",
  :surveyRules
  [{:id 0,
    :ruleType "incompatible-answers",
    :answerId1 2,
    :answerId2 0,
    :questionId1 1,
    :questionId2 5}],
  :plotDistribution "random",
  :imageryId 1,
  :plotFileName nil,
  :plotFileBase64 nil,
  :plotShape "circle",
  :learningMaterial nil,
  :allowDrawnSamples false,
  :projectId 1,
  :projectOptions
  {:showGEEScript false,
   :showPlotInformation false,
   :collectConfidence true,
   :autoLaunchGeoDash false},
  :sampleFileBase64 nil,
  :surveyQuestions
  {"1"
   {:answers
    {"1" {:color "#1527f6", :answer "water"},
     "2" {:color "#3b8736", :answer "forest"},
     "3" {:color "#f6132a", :answer "developed"},
     "4" {:color "#f6ef13", :answer "grassland"},
     "5" {:color "#d6b824", :answer "agriculture"}},
    :dataType "text",
    :question "Land cover",
    :cardOrder 1,
    :componentType "button",
    :parentAnswerIds [],
    :parentQuestionId -1},
   "2"
   {:answers
    {"1" {:color "#f613e3", :answer "Yes"},
     "2" {:color "#66676b", :answer "No"}},
    :dataType "text",
    :question "land cover change?",
    :cardOrder 2,
    :componentType "button",
    :parentAnswerIds [],
    :parentQuestionId -1},
   "3"
   {:answers
    {"9" {:color "#30ad2e", :answer "2008"},
     "3" {:color "#a5abee", :answer "2002"},
     "4" {:color "#e7e8f9", :answer "2003"},
     "8" {:color "#6ef772", :answer "2007"},
     "7" {:color "#b8f5bf", :answer "2006"},
     "5" {:color "#fcfcfd", :answer "2004"},
     "6" {:color "#dbf5de", :answer "2005"},
     "1" {:color "#1527f6", :answer "2000"},
     "11" {:color "#040620", :answer "2010"},
     "2" {:color "#4f5ce8", :answer "2001"},
     "10" {:color "#136728", :answer "2009"}},
    :dataType "text",
    :question "Year of change",
    :componentType "button",
    :parentAnswerIds [1],
    :parentQuestionId 2},
   "4"
   {:answers
    {"1" {:color "#1527f6", :answer "water"},
     "2" {:color "#1c7d2c", :answer "forest"},
     "3" {:color "#b82350", :answer "developed"},
     "4" {:color "#e7f613", :answer "grassland"},
     "5" {:color "#f6ae13", :answer "agriculture"}},
    :dataType "text",
    :question "Transition from:",
    :componentType "button",
    :parentAnswerIds [1],
    :parentQuestionId 2},
   "5"
   {:answers
    {"0" {:hide false, :color "#00ff4c", :answer "yes"},
     "1" {:hide false, :color "#f61313", :answer "no"}},
    :dataType "text",
    :question "Is it desert?",
    :cardOrder 3,
    :hideQuestion false,
    :componentType "button",
    :parentAnswerIds [],
    :parentQuestionId -1}},
  :sampleResolution nil,
  :sampleDistribution "random",
  :samplesPerPlot 10},
 :session
 {:userId 1,
  :userName "admin@ceo.dev",
  :acceptedTerms false,
  :userRole "admin"}}


{:params
 {:shufflePlots ["unknown error"],
  :institutionId ["missing required key"],
  :aoiFeatures ["invalid type"],
  :plotSpacing ["should be a string" "should be an int"],
  :projectTemplate ["missing required key"],
  :useTemplatePlots ["missing required key"],
  :sampleResolution ["should be a string" "should be an int"],
  :useTemplateWidgets ["missing required key"]}}

  )

(def Project [:map
              [:institutionId {:optional true} Int]
              [:projectTemplate {:optional true} Int]
              [:useTemplatePlots {:optional true} Bool]
              [:useTemplateWidgets {:optional true} Bool]
              [:imageryId int?]
              [:projectImageryList [:vector any?]]
              [:aoiFeatures
               [:maybe Json]
               [:maybe [:vector [:map
                                 [:type [:enum "Polygon"]]
                                 [:coordinates [:vector [:vector Coordinates]]]]]]
               [:maybe [:map [:aoiFileName string?]]]]
              [:description string?]
              [:name string?]
              [:type [:enum "regular" "simplified"]]
              [:privacyLevel [:enum "institution" "public" "private"]]
              [:projectOptions
               [:map
                [:showGEEScript Bool]
                [:showPlotInformation Bool]
                [:collectConfidence Bool]
                [:autoLaunchGeoDash Bool]]]
              [:designSettings map?]
              [:numPlots int?]
              [:plotDistribution [:enum "random" "grid" "shp" "csv" "json"]]
              [:plotShape [:maybe [:enum "square" "circle"]]]
              [:plotSize [:maybe int?]]
              [:plotSpacing  [:or string? int? :nil]]
              [:shufflePlots [:or :nil Bool]]
              [:sampleDistribution [:enum "random" "even"]]
              [:samplesPerPlot int?]
              [:sampleResolution  [:or string? int? :nil]]
              [:allowDrawnSamples {:optional true} Bool]
              [:surveyQuestions map?]
              [:surveyRules [:vector any?]]])


#_(def Project [:map
                [:institutionId int?]
                [:projectTemplate int?]
                [:useTemplatePlots Bool]
                [:useTemplateWidgets Bool]
                [:imageryId int?]
                [:projectImageryList [:vector any?]]
                [:aoiFeatures
                 [:maybe Json]
                 [:maybe [:map [:aoiFileName string?]]]]
                [:description string?]
                [:name string?]
                [:type [:enum "regular" "simplified"]]
                [:privacyLevel [:enum "institution" "public" "private"]]
                [:projectOptions
                 [:map
                  [:showGEEScript Bool]
                  [:showPlotInformation Bool]
                  [:collectConfidence Bool]
                  [:autoLaunchGeoDash Bool]]]
                [:designSettings map?]
                [:numPlots int?]
                [:plotDistribution [:enum "random" "grid" "shp" "csv" "json"]]
                [:plotShape [:maybe [:enum "square" "circle"]]]
                [:plotSize [:maybe int?]]
                [:plotSpacing [:or string? int?]]
                [:shufflePlots Bool]
                [:sampleDistribution [:enum "random" "even"]]
                [:samplesPerPlot int?]
                [:sampleResolution [:or string? int?]]
                [:allowDrawnSamples Bool]
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
   :projects/close-project                [:map
                                           [:params [:projectId string?]]
                                           [:session [:userId Int]]]
   :projects/archive-project!              [:map

                                           [:params [:projectId]]]
   :projects/delete-projects-bulk!         [:map
                                           [:params
                                            [:projectIds vector?]
                                            [:institutionId string?]]]
   :projects/edit-projects-bulk!           [:map
                                           [:params
                                            [:projectIds vector?]
                                            [:institutionId string?]
                                            [:visibility [:enum "institution" "public" "private"]]]]
   :projects/publish-project!              [:map
                                           [:params
                                            [:projectId string?]
                                            [:clearSaved Bool]]
                                           [:session [:userId Int]]]
   :projects/check-plot-csv               [:map
                                           [:params
                                            [:projectId string?]
                                            [:maybe [:plotFileName string?]]
                                            [:maybe [:plotFileBase64 string?]]]]
   :projects/import-ce-project            [:map
                                           [:params
                                            [:fileName string?]
                                            [:fileb64 string?]]]})

(defmacro validate [query]
  `(fn [args#]     
     (if (-> validation-map
             (get ~(keyword (str query)))
             (m/validate args#))
       (~query args#)

       (do
         #_(pprint (select-keys args# [:params :session]))
         #_(pprint (->> args# :params :aoiFeatures first :coordinates first first (map type)))
         (-> validation-map
             (get ~(keyword (str query)))
             (m/explain args#)
             me/humanize
             pprint)
         (data-response "Invalid Request Payload"  {:status 403
                                                    :body args#})))))


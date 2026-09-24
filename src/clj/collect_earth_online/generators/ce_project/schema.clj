(ns collect-earth-online.generators.ce-project.schema
  (:require [malli.core  :as m]
            [malli.error :as me]))

;;;
;;; Survey model
;;;

(def NodeKind
  [:enum :entity :text :number :code :boolean :date :time :coordinate :taxon :range :file])

(def CodeItem
  [:schema {:registry {::code-item [:map
                                    [:code        :string]
                                    [:label       :string]
                                    [:description {:optional true} [:maybe :string]]
                                    [:color       {:optional true} [:maybe :string]]
                                    [:level       :int]
                                    [:children    [:vector [:ref ::code-item]]]]}}
   ::code-item])

(def CodeList
  [:map
   [:name      :string]
   [:label     {:optional true} [:maybe :string]]
   [:levels    [:vector :string]]
   [:external? :boolean]
   [:items     [:vector CodeItem]]])

(def AttributeDefault
  [:map
   [:value {:optional true} [:maybe :string]]
   [:expr  {:optional true} [:maybe :string]]
   [:if    {:optional true} [:maybe :string]]])

(def Check
  [:map
   [:type    [:enum :compare :pattern :custom :distance :unique]]
   [:flag    [:enum :error :warning]]
   [:if      {:optional true} [:maybe :string]]
   [:expr    {:optional true} [:maybe :string]]
   [:regex   {:optional true} [:maybe :string]]
   [:bounds  {:optional true} [:map-of [:enum :gt :gte :lt :lte :eq] :string]]
   [:message {:optional true} [:maybe :string]]])

(def Node
  [:schema {:registry
            {::node [:map
                     [:id          :int]
                     [:kind        NodeKind]
                     [:name        :string]
                     [:path        :string]
                     [:label       :string]
                     [:description {:optional true} [:maybe :string]]
                     [:multiple?   :boolean]
                     [:key?        :boolean]
                     [:required?   :boolean]
                     [:required-if {:optional true} [:maybe :string]]
                     [:relevant    {:optional true} [:maybe :string]]
                     [:calculated? :boolean]
                     [:hidden?     :boolean]
                     [:from-csv?   :boolean]
                     [:defaults    [:vector AttributeDefault]]
                     [:checks      [:vector Check]]
                     [:list        {:optional true} [:maybe :string]]
                     [:parent-code {:optional true} [:maybe :string]]
                     [:layout-type {:optional true} [:maybe :string]]
                     [:text-type   {:optional true} [:maybe :string]]
                     [:number-type {:optional true} [:maybe :string]]
                     [:unit        {:optional true} [:maybe :string]]
                     [:enumerate?  {:optional true} :boolean]
                     [:children    {:optional true} [:vector [:ref ::node]]]]}}
   ::node])

(def SurveyModel
  [:map
   [:default-lang  :string]
   [:languages     [:vector :string]]
   [:project-name  {:optional true} [:maybe :string]]
   [:description   {:optional true} [:maybe :string]]
   [:code-lists    [:map-of :string CodeList]]
   [:root          Node]
   [:collect-earth [:map-of :keyword :string]]])

;;;
;;; Question planning
;;;

(def Visibility
  [:map
   [:fidelity     [:enum :always :exact :unconditional]]
   [:parent-path  {:optional true} [:maybe :string]]
   [:parent-codes {:optional true} [:maybe [:set :string]]]
   [:reason       {:optional true} [:maybe :string]]])

(def PlannedAnswer
  [:map
   [:code   {:optional true} [:maybe :string]]
   [:answer [:or :string number?]]
   [:color  :string]])

(def QuestionPlan
  [:map
   [:source        [:map [:path :string] [:variant {:optional true} [:maybe :map]]]]
   [:kind          NodeKind]
   [:question      :string]
   [:label         :string]
   [:componentType [:enum "button" "input" "radiobutton" "dropdown"]]
   [:dataType      [:enum "text" "number" "boolean"]]
   [:answers       [:vector PlannedAnswer]]
   [:required?     :boolean]
   [:visibility    {:optional true} Visibility]])

(def QuestionIndex
  [:map-of [:tuple :string [:maybe :map]]
   [:map
    [:id         :int]
    [:kind       NodeKind]
    [:answer-ids [:map-of :string :int]]]])

;;;
;;; CEO output
;;;

(def CeoAnswer
  [:map
   [:answer   [:or :string number?]]
   [:color    :string]
   [:hide     {:optional true} :boolean]
   [:required {:optional true} :boolean]])

(def CeoQuestion
  [:map
   [:question         :string]
   [:questionLabel    :string]
   [:componentType    [:enum "button" "input" "radiobutton" "dropdown"]]
   [:dataType         [:enum "text" "number" "boolean"]]
   [:answers          [:map-of :int CeoAnswer]]
   [:parentQuestionId :int]
   [:parentAnswerIds  [:vector :int]]
   [:cardOrder        [:maybe :int]]
   [:required         :boolean]
   [:hideQuestion     {:optional true} :boolean]])

(def CeoRule
  [:multi {:dispatch :ruleType}
   ["text-match"
    [:map [:id :int] [:ruleType [:= "text-match"]] [:questionId :int] [:regex :string]]]
   ["numeric-range"
    [:map [:id :int] [:ruleType [:= "numeric-range"]] [:questionId :int] [:min number?] [:max number?]]]
   ["incompatible-answers"
    [:map [:id :int] [:ruleType [:= "incompatible-answers"]]
     [:questionId1 :int] [:answerId1 :int] [:questionId2 :int] [:answerId2 :int]]]
   ["multiple-incompatible-answers"
    [:map [:id :int] [:ruleType [:= "multiple-incompatible-answers"]]
     [:answers [:map-of :int :int]] [:incompatQuestionId :int] [:incompatAnswerId :int]]]])

;;;
;;; Report
;;;

(def Outcome
  [:enum :imported :exact :widened :unconditional :approximated :skipped])

(def ReportEntry
  [:map
   [:level   [:enum :info :warning :error]]
   [:area    [:enum :project :plots :questions :relevance :rules]]
   [:subject :string]
   [:message :string]
   [:outcome {:optional true} Outcome]])

(def ImportReport
  [:map
   [:summary [:map-of :keyword :int]]
   [:entries [:vector ReportEntry]]])

;;;
;;; Response
;;;

(def ProjectOptions
  [:map
   [:showGEEScript       :boolean]
   [:showPlotInformation :boolean]
   [:collectConfidence   :boolean]
   [:autoLaunchGeoDash   :boolean]])

(def ImportResponse
  [:map
   [:name             :string]
   [:description      :string]
   [:plotDistribution [:= "geojson"]]
   [:plotFileName     :string]
   [:plotFileBase64   :string]
   [:numPlots         :int]
   [:aoiFeatures      [:vector :map]]
   [:aoiFileName      :string]
   [:projectOptions   ProjectOptions]
   [:surveyQuestions  [:map-of :int CeoQuestion]]
   [:surveyRules      [:vector CeoRule]]
   [:importReport     ImportReport]])

;;;
;;; Helpers
;;;

(defn explain
  "Readable validation errors, or nil when the value conforms."
  [schema value]
  (some-> (m/explain schema value) me/humanize))

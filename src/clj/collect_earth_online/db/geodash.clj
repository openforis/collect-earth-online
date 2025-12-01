(ns collect-earth-online.db.geodash
  (:require [libpython-clj2.require :refer [require-python]]
            [libpython-clj2.python  :refer [py. get-attr] :as py]
            [libpython-clj2.python.copy :refer [*item-tuple-cutoff*]]
            [triangulum.database :refer [call-sql]]
            [triangulum.type-conversion :as tc]
            [triangulum.config :refer [get-config]]
            [triangulum.response :refer [data-response]]
            [clojure.string :as str]))

;;; Constants

(def ^:private max-age (* 24 60 60 1000)) ; Once a day

;;; GEE Python interface

(require-python '[sys :bind-ns])
(py. (get-attr sys "path") "append" "src/py")
(require-python '[gee.routes :as gee :reload]
                '[gee.utils :as utils :reload])

(defonce last-initialized (atom 0))

(defn- check-initialized []
  (when (> (- (System/currentTimeMillis) @last-initialized) max-age)
    (let [{:keys [ee-account ee-key-path]} (get-config :py-interop)]
      (utils/initialize ee-account ee-key-path)
      (reset! last-initialized (System/currentTimeMillis)))))

(defn- parse-py-errors [e]
  (let [error-parts (as-> e %
                      (ex-message %)
                      (str/split % #"\n")
                      (last %)
                      (str/split % #": "))]
    {:errType  (first error-parts)
     :errMsg   (->> error-parts
                    (rest)
                    (str/join ": "))}))

(def path->python
  {"degradationTimeSeries"  gee/degradationTimeSeries
   "degradationTileUrl"     gee/degradationTileUrl
   "featureCollection"      gee/featureCollection
   "filteredLandsat"        gee/filteredLandsat
   "filteredNicfi"          gee/filteredNicfi
   "filteredSentinel2"      gee/filteredSentinel2
   "filteredSentinelSAR"    gee/filteredSentinelSAR
   "getAvailableBands"      gee/getAvailableBands
   "getPlanetTile"          gee/getPlanetTile
   "image"                  gee/image
   "imageCollection"        gee/imageCollection
   "imageCollectionByIndex" gee/imageCollectionByIndex
   "statistics"             gee/statistics
   "timeSeriesByIndex"      gee/timeSeriesByIndex
   "dynamicWorld"           gee/dynamicWorld})

(defn gateway-request [{:keys [params json-params]}]
  (check-initialized)
  (data-response (if-let [py-fn (some-> params :path path->python)]
                   (binding [*item-tuple-cutoff* 0]
                     (try (py-fn json-params)
                          (catch Exception e (parse-py-errors e))))
                   {:errMsg (str "No GEE function defined for path " (:path params) ".")})))

;;; Widget Routes

(defn- return-widgets [project-id]
  (mapv (fn [{:keys [widget_id widget]}]
          (-> widget
              (tc/jsonb->clj)
              (assoc :id widget_id)))
        (call-sql "get_project_widgets_by_project_id" project-id)))

(defn- split-widget-json [widget-json]
  (let [widget (tc/json->clj widget-json)]
    [(:id widget) (-> widget (dissoc :id) (tc/clj->jsonb))]))

(defn get-project-widgets [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))]
    (data-response (return-widgets project-id))))

(defn create-dashboard-widget-by-id [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        widget     (tc/json->jsonb (:widgetJSON params))]
    (call-sql "add_project_widget"
              project-id
              widget)
    (data-response (return-widgets project-id))))

(defn update-dashboard-widget-by-id [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        [widget-id widget] (split-widget-json (:widgetJSON params))]
    (call-sql "update_project_widget_by_widget_id" widget-id widget)
    (data-response (return-widgets project-id))))

(defn delete-dashboard-widget-by-id [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        [widget-id _] (split-widget-json (:widgetJSON params))]
    (call-sql "delete_project_widget_by_widget_id" widget-id)
    (data-response (return-widgets project-id))))

(defn copy-project-widgets [{:keys [params]}]
  (let [project-id  (tc/val->int (:projectId params))
        template-id (tc/val->int (:templateId params))]
    (call-sql "delete_project_widgets" project-id)
    (call-sql "copy_project_widgets" template-id project-id)
    (data-response (return-widgets project-id))))

(defn validate-vis-params [{:keys [params]}]
  (check-initialized)
  (let [img-path (:imgPath params)
        vis-params (tc/json->clj (:visParams params))
        vis-errors (utils/validateJSON img-path vis-params)]
    (data-response "" {:status 200})))

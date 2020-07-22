(ns org.openforis.ceo.db.geodash
  (:import java.util.UUID)
  (:require [clojure.data.json :as json]
            [org.openforis.ceo.database :refer [call-sql]]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.views :refer [data-response]]))


;;; FIXME, we no longer need dashboardID, projectId should be sufficient

;; FIXME, this function name is not clear
(defn geodash-id [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        dashboard  (call-sql "get_project_widgets_by_project_id" project-id)]
    ;; FIXME, we should not need to pass back projectId
    (data-response {:projectId   project-id
                    :dashboardID (if (seq dashboard) (:dashboard_id (first dashboard)) (str (UUID/randomUUID)))
                    :widgets     (mapv :widget dashboard)})))

(defn create-dashboard-widget-by-id [{:keys [params]}]
  (let [project-id         (tc/str->int (:projectId params))
        dashboard-id       (UUID/fromString (:dashboardId params))
        widget-json-string (json/read-str (:widgetJsonString params))]
    (call-sql "add_project_widget"
              project-id
              dashboard-id
              widget-json-string)
    (data-response "")))

(defn update-dashboard-widget-by-id [{:keys [params]}]
  (let [widget-id          (tc/str->int (:widgetId params))
        dashboard-id       (UUID/fromString (:dashboardId params))
        widget-json-string (json/read-str (:widgetJsonString params))]
    (call-sql "update_project_widget_by_widget_id"
              widget-id
              dashboard-id
              widget-json-string)
    (data-response "")))

(defn delete-dashboard-widget-by-id [{:keys [params]}]
  (let [widget-id    (tc/str->int (:widgetId params))
        dashboard-id (UUID/fromString (:dashboardId params))]
    (call-sql "delete_project_widget_by_widget_id"
              widget-id
              dashboard-id)
    (data-response "")))

(defn gateway-request [request])

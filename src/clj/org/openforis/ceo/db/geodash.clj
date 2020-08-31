(ns org.openforis.ceo.db.geodash
  (:import java.util.UUID)
  (:require [clojure.string  :as str]
            [clj-http.client :as client]
            [org.openforis.ceo.database :refer [call-sql]]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.views :refer [data-response]]))

;;; TODO, we no longer need dashboardID, projectId should be sufficient

;; TODO, this function name is not clear
(defn geodash-id [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        dashboard  (call-sql "get_project_widgets_by_project_id" project-id)]
    ;; TODO, we should not need to pass back projectId
    (data-response {:projectId   project-id
                    :dashboardID (if (seq dashboard)
                                   (str (:dashboard_id (first dashboard)))
                                   (str (UUID/randomUUID)))
                    :widgets     (mapv #(tc/jsonb->clj (:widget %)) dashboard)})))

(defn create-dashboard-widget-by-id [{:keys [params]}]
  (let [project-id         (tc/str->int (:projectId params))
        dashboard-id       (tc/str->pg-uuid (:dashID params))
        widget-json-string (tc/json->jsonb (:widgetJSON params))]
    (call-sql "add_project_widget"
              project-id
              dashboard-id
              widget-json-string)
    (data-response "")))

;; TODO this route is called way too many times from the front end.
;;      Preferred for me is to change the workflow to have a save button save
;;      the entire layout at once. If we keep the same workflow, limit the live edit
;;      calls by only updating the one widget that moves.
(defn update-dashboard-widget-by-id [{:keys [params]}]
  (let [widget-id          (tc/str->int (:widgetId params))
        dashboard-id       (tc/str->pg-uuid (:dashID params))
        widget-json-string (tc/json->jsonb (:widgetJSON params))]
    (call-sql "update_project_widget_by_widget_id"
              widget-id
              dashboard-id
              widget-json-string)
    (data-response "")))

(defn delete-dashboard-widget-by-id [{:keys [params]}]
  (let [widget-id    (tc/str->int (:widgetId params))
        dashboard-id (tc/str->pg-uuid (:dashID params))]
    (call-sql "delete_project_widget_by_widget_id"
              widget-id
              dashboard-id)
    (data-response "")))

(defn gateway-request [{:keys [params json-params server-name]}]
  (let [path (:path params)
        url  (if (str/includes? server-name "local")
               "https://ceodev.servirglobal.net"
               "https://localhost")]
    (client/post (str url ":8888/" path)
                 {:body (tc/clj->json json-params)
                  :content-type :json
                  :accept :json})))

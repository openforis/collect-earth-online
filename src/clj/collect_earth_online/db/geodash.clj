(ns collect-earth-online.db.geodash
  (:require [clojure.string  :as str]
            [clj-http.client :as client]
            [triangulum.database :refer [call-sql]]
            [triangulum.type-conversion :as tc]
            [collect-earth-online.views :refer [data-response]]))

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

(defn gateway-request [{:keys [params json-params server-name]}]
  (let [path (:path params)]
    (client/post (str "http://" server-name ":8888/" path)
                 {:body (tc/clj->json json-params)
                  :content-type :json
                  :accept :json})))

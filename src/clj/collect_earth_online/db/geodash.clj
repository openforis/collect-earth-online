(ns collect-earth-online.db.geodash
  (:require [clojure.string  :as str]
            [clj-http.client :as client]
            [triangulum.database :refer [call-sql]]
            [triangulum.type-conversion :as tc]
            [collect-earth-online.views :refer [data-response]]))

(defn- return-widgets [project-id]
  {:widgets (mapv #(-> % (:widget) (tc/jsonb->clj))
                  (call-sql "get_project_widgets_by_project_id" project-id))})

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
        widget-id  (tc/val->int (:widgetId params))
        widget     (tc/json->jsonb (:widgetJSON params))]
    (call-sql "update_project_widget_by_widget_id"
              project-id
              widget-id
              widget)
    (data-response (return-widgets project-id))))

(defn delete-dashboard-widget-by-id [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        widget-id  (tc/val->int (:widgetId params))]
    (call-sql "delete_project_widget_by_widget_id"
              project-id
              widget-id)
    (data-response (return-widgets project-id))))

(defn gateway-request [{:keys [params json-params server-name]}]
  (let [path (:path params)
        url  (if (str/starts-with? server-name "local")
               "https://ceodev.servirglobal.net:8888/"
               "http://localhost:8881/")]
    (client/post (str url path)
                 {:body (tc/clj->json json-params)
                  :content-type :json
                  :accept :json})))

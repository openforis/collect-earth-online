(ns org.openforis.ceo.views
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [hiccup.page :refer [html5 include-css include-js]]))

(defn head []
  [:head
   [:title "My Project"]
   [:meta {:charset "utf-8"}]
   [:meta {:name "viewport" :content "width=device-width, initial-scale=1"}]
   [:meta {:name "description" :content "DESCRIBE YOUR NEW SITE."}]
   [:meta {:name "keywords" :content "some keywords about your project"}]
   (include-css "/css/style.css")
   (include-js "/cljs/app.js")])

(defn kebab->snake [kebab-str]
  (str/replace kebab-str "-" "_"))

(defn uri->ns [uri]
  (->> (str/split uri #"/")
       (remove str/blank?)
       (str/join "-")
       (str "org.openforis.ceo.pages.")))

(defn cljs-init [uri params]
  (let [js-module (-> uri uri->ns kebab->snake)
        js-params (json/write-str params)]
    [:script {:type "text/javascript"}
     (str "window.onload = function () { " js-module ".init(" js-params "); };")]))

(defn render-page [uri]
  (fn [request]
    {:status  200
     :headers {"Content-Type" "text/html"}
     :body    (html5
               (head)
               [:body
                [:div#app]
                (cljs-init uri (:params request))])}))

(defn not-found-page [request]
  (-> request
      ((render-page "/not-found"))
      (assoc :status 404)))

(defn data-response
  ([status body]
   (data-response status body true))
  ([status body edn?]
   {:status  status
    :headers {"Content-Type" (if edn? "application/edn" "application/json")}
    :body    (if edn? (pr-str body) (json/write-str body))}))

(ns org.openforis.ceo.views
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [hiccup.page :refer [html5 include-css include-js]]))

(defn head [additional-js additional-css]
  [:head
   [:title "Collect Earth Online"]
   [:meta {:charset "utf-8"}]
   [:meta {:name "viewport"     :content "width=device-width, initial-scale=1.0"}]
   [:meta {:name "description"  :content "Collect Earth Online is an Image Analysis Crowdsourcing Platform by OpenForis and Spatial Informatics Group"}]
   [:meta {:name "keywords"     :content "collect earth online image analysis crowdsourcing platform openforis SIG spatial informatics group"}]
   [:link {:rel "shortcut icon" :href "favicon.ico"}]
   (apply include-css (conj additional-css
                            ["/css/cssreset-min.css"
                             "/css/ie10-viewport-bug-workaround.css" ; TODO remove support for IE 10
                             "/css/jquery-ui.css" ; TODO remove jquery as a dependency
                             "/css/datepicker.css" ; TODO remove jquery-ui as a dependency
                             "/css/bootstrap.min.css"
                             "/css/custom.css"]))
   (apply include-js  (conj additional-js
                            ["/js/ie-emulation-modes-warning.js" ; TODO remove support for IE 10
                             "/js/html5shiv.js" ; TODO remove support for IE 9
                             "/js/bootstrap.min.js"]))]) ; TODO remove bootstrap.min.js as a dependency. Only used in header, find a react method.

(defn getPage [coll]
  (if (= 1 (count coll)) (first coll) (second coll)))

(defn kebab->camel [kebab]
  (let [pieces (str/split kebab #"-")]
    (str/join (conj (first pieces)
                    (map str/capitalize pieces)))))

(defn uri->page [uri]
  (->> (str/split uri #"/")
       (remove str/blank?)
       (getPage)
       (kebab->camel)))

(def page->js
  {"geo-dash"             ["js/highcharts.js" ; TODO use the npm version
                           "/js/respond.min.js" ; TODO I dont think this is used. Billy imports a grid manager now instead.
                           "/js/jquery-3.4.1.min.js" ; TODO remove jquery as a dependency
                           "/js/jquery-ui.min.js"]   ; TODO remove jquery-ui as a dependency
   "widget-layout-editor" ["/js/jquery-3.4.1.min.js" ; TODO remove jquery as a dependency
                           "/js/jquery-ui.min.js"]}) ; TODO remove jquery-ui as a dependency

(def page->css
  {"geo-dash"             ["/css/geo-dash.css"]
   "widget-layout-editor" ["/css/geo-dash.css"]})


(defn cljs-init [page params]
  (let [js-params (json/write-str params)]
    [:script {:type "text/javascript"}
     (str "window.onload = function () { " (kebab->camel page) ".pageInit(" js-params "); };")]))

(defn render-page [uri]
  (fn [request]
    (let [page (uri->page uri)]
      {:status  200
       :headers {"Content-Type" "text/html"}
       :body    (html5
                 (head (page->js page) (page->css page))
                 [:body
                  (when-let [flash-message (get-in request [:params :flash_message])]
                    [:p {:class "alert"} flash-message]) ; TODO this will be moved to the front end for better UX
                  (when-let [announcement nil] [:p announcement]) ; TODO slurp announcement text from announcement.edn
                  [:secton {:id "content" :class "container-fluid"} ; TODO, why do all the pages need the same section tag
                   [:div#app]]
                  (cljs-init uri (:params request))])})))

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

(ns org.openforis.ceo.views
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [clojure.java.io :as io]
            [hiccup.page :refer [html5 include-css include-js]]))

(defn head [additional-js additional-css]
  [:head
   [:title "Collect Earth Online"]
   [:meta {:charset "utf-8"}]
   [:meta {:name "viewport"     :content "width=device-width, initial-scale=1.0"}]
   [:meta {:name "description"  :content "Collect Earth Online is an Image Analysis Crowdsourcing Platform by OpenForis and Spatial Informatics Group"}]
   [:meta {:name "keywords"     :content "collect earth online image analysis crowdsourcing platform openforis SIG spatial informatics group"}]
   [:link {:rel "shortcut icon" :href "favicon.ico"}]
   (apply include-css (concat additional-css
                              ["/css/cssreset-min.css"
                               "/css/jquery-ui.css"  ; TODO Remove jquery-ui as a dependency.
                               "/css/datepicker.css" ; TODO Remove jquery-ui as a dependency.
                               "/css/bootstrap.min.css"
                               "/css/custom.css"]))
   (apply include-js  (concat additional-js
                              ["/js/bootstrap.min.js"]))]) ; TODO Remove bootstrap.min.js as a dependency. Only used in header, find a react method.

;; TODO This wont be needed if we can flatten the route names for geo-dash (geo-dash/geo-dash -> geo-dash).
(defn getPage [coll]
  (if (= 1 (count coll)) (first coll) (second coll)))

(defn kebab->camel [kebab]
  (let [pieces (str/split kebab #"-")]
    (str/join (concat (first pieces)
                      (map str/capitalize pieces)))))

(defn uri->page [uri]
  (->> (str/split uri #"/")
       (remove str/blank?)
       (getPage)))

(defn page->js [page]
  (let [webpack-files (->> (io/file "target/classes/public/js")
                           (file-seq)
                           (map #(str "/js/" (.getName %)))
                           (filter #(and (str/includes? % (kebab->camel page))
                                         (not (str/ends-with? % ".map"))))
                           (sort-by #(cond
                                       (str/includes? % "common") -1
                                       (str/includes? % "~")      0
                                       :else                      1)))]
    (concat webpack-files
            ({"geo-dash"             ["/js/highcharts.js"       ; TODO Use the npm version.
                                      "/js/jquery-3.4.1.min.js" ; TODO Remove jquery as a dependency.
                                      "/js/jquery-ui.min.js"]   ; TODO Remove jquery-ui as a dependency.
              "widget-layout-editor" ["/js/jquery-3.4.1.min.js"
                                      "/js/jquery-ui.min.js"]} page))))

;; TODO Can we just import these from inside each page with import "../css/geo-dash.css"?
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
                    [:p {:class "alert"} flash-message])            ; TODO This will be moved to the front end for better UX.
                  (when-let [announcement nil] [:p announcement])   ; TODO Slurp announcement text from announcement.txt.
                  [:secton {:id "content" :class "container-fluid"} ; TODO This seems out of order with the app div, should the container class be inside each page?
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

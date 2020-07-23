(ns org.openforis.ceo.views
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [clojure.java.io :as io]
            [cognitect.transit :as transit]
            [hiccup.page :refer [html5 include-js]])
  (:import java.io.ByteArrayOutputStream))

(defn page->js [page]
  (let [webpack-files (->> (io/file "target/public/js")
                           (file-seq)
                           (map #(str "/js/" (.getName %)))
                           (filter #(and (str/includes? % page)
                                         (not (str/ends-with? % ".map"))))
                           (sort-by #(cond
                                       (str/includes? % "common") -1
                                       (str/includes? % "~")      0
                                       :else                      1)))]
    (concat webpack-files
            (case page
              "geoDash"            ["/js/highcharts.js"       ; TODO Use the npm version.
                                    "/js/jquery-3.4.1.min.js" ; TODO Remove jquery as a dependency.
                                    "/js/jquery-ui.min.js"]   ; TODO Remove jquery-ui as a dependency.
              "widgetLayoutEditor" ["/js/jquery-3.4.1.min.js"
                                    "/js/jquery-ui.min.js"]
              []))))

(defn head [page]
  [:head
   [:title "Collect Earth Online"]
   [:meta {:charset "utf-8"}]
   [:meta {:name "viewport"    :content "width=device-width, initial-scale=1.0"}]
   [:meta {:name "description" :content "Collect Earth Online is an Image Analysis Crowdsourcing Platform by OpenForis and Spatial Informatics Group"}]
   [:meta {:name "keywords"    :content "collect earth online image analysis crowdsourcing platform openforis SIG spatial informatics group"}]
   [:link {:rel "shortcut icon" :href "favicon.ico"}]
   (apply include-js "/js/bootstrap.min.js" (page->js page))]) ; TODO Remove bootstrap.min.js as a dependency. Only used in header, find a react method.

(defn kebab->camel [kebab]
  (let [pieces (str/split kebab #"-")]
    (apply str (first pieces) (map str/capitalize (rest pieces)))))

;; TODO There will be no part two if we can flatten the route names for geo-dash (geo-dash/geo-dash -> geo-dash).
(defn uri->page [uri]
  (let [[part1 part2] (->> (str/split uri #"/")
                           (remove str/blank?)
                           (map kebab->camel))]
    (or part2 part1)))

(defn js-init [page params]
  (let [js-params (json/write-str params)]
    [:script {:type "text/javascript"}
     (str "window.onload = function () { " page ".pageInit(" js-params "); };")]))

(defn render-page [uri]
  (fn [request]
    (let [page (uri->page uri)]
      {:status  200
       :headers {"Content-Type" "text/html"}
       :body    (html5
                 (head page)
                 [:body {:style {:padding-top "60px"}}
                  [:section {:id "content" :class "container-fluid"} ; TODO This seems out of order with the app div, should the container class be inside each page?
                   (when-let [flash-message (get-in request [:params :flash_message])]
                     [:p {:class "alert"} flash-message])            ; TODO This will be moved to the front end for better UX.
                   (let [announcement (slurp "/announcement.txt")]
                     (when (pos? (count announcement))
                       [:p {:style {:color "#eec922" :background-color "#e63232" :text-align "center" :padding "5px" :margin "0px"}}
                        announcement]))
                   [:div#app]]
                  (js-init page (:params request))])})))

(defn not-found-page [request]
  (-> request
      ((render-page "/not-found"))
      (assoc :status 404)))

(defn body->transit [body]
  (let [out    (ByteArrayOutputStream. 4096)
        writer (transit/writer out :json)]
    (transit/write writer body)
    (.toString out)))

(defn data-response
  "Create a response object.
   Body is required. Status, type, and session are optional.
   When a type keyword is passed, the body is converted to that type,
   otherwise the body and type are passed through."
  ([body]
   (data-response body {}))
  ([body {:keys [status type session]
          :or {status 200 type :json}
          :as params}]
   (merge (when (contains? params :session) {:session session})
          {:status  status
           :headers {"Content-Type" (condp = type
                                      :edn     "application/edn"
                                      :transit "application/transit+json"
                                      :json    "application/json"
                                      type)}
           :body    (condp = type
                      :edn     (pr-str         body)
                      :transit (body->transit  body)
                      :json    (json/write-str body)
                      body)})))

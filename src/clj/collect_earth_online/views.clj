(ns collect-earth-online.views
  (:require [clojure.data.json :as json]
            [clojure.string    :as str]
            [clojure.java.io   :as io]
            [cognitect.transit :as transit]
            [hiccup.page :refer [html5 include-js include-css]]
            [collect-earth-online.git :refer [current-version]]
            [triangulum.config  :refer [get-config]])
  (:import java.io.ByteArrayOutputStream))

(defn kebab->camel [kebab]
  (let [pieces (str/split kebab #"-")]
    (apply str (first pieces) (map str/capitalize (rest pieces)))))

(defn head [extra-js]
  [:head
   [:title "Collect Earth Online"]
   [:meta {:charset "utf-8"}]
   [:meta {:name "viewport"    :content "width=device-width, initial-scale=1.0"}]
   [:meta {:name "description" :content "Collect Earth Online is an Image Analysis Crowdsourcing Platform by OpenForis and Spatial Informatics Group"}]
   [:meta {:name "keywords"    :content "collect earth online image analysis crowdsourcing platform openforis SIG spatial informatics group"}]
   [:meta {:name "viewport"    :content "width=device-width, user-scalable=no"}] ; prevent touch zoom on mobile
   [:link {:rel "shortcut icon" :href "favicon.ico"}]
   (when-let [ga-id (get-config :ga-id)]
     [:script {:async true :src (str "https://www.googletagmanager.com/gtag/js?id=" ga-id)}]
     [:script (str "window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '" ga-id "');")])
   (include-css "/css/bootstrap.min.css")
   (apply include-js
          "/js/jquery-3.5.1.slim.min.js"
          "/js/bootstrap.min.js" ; TODO Remove bootstrap.min.js as a dependency. Only used in header, find a react method.
          extra-js)])

;; TODO There will be no part two if we can flatten the route names for geo-dash (geo-dash/geo-dash -> geo-dash).
(defn uri->page [uri]
  (let [[part1 part2] (->> (str/split uri #"/")
                           (remove str/blank?)
                           (map kebab->camel))]
    (or part2 part1)))

(defn js-init [page params]
  (let [js-params (json/write-str params)]
    [:script {:type "text/javascript"}
     (str "window.onload = function () {
           setTimeout (function () {document.getElementById ('banner') .style.display='none'}, 10000);
           " page ".pageInit(" js-params "); };")]))

(defn find-webpack-files [page]
  (as-> (slurp "target/entry-points.json") wp
    (json/read-str wp)
    (get wp page)))

(defn- announcement-banner []
  (let [announcement (slurp "announcement.txt")] ; TODO This will be moved to the front end for better UX.
    [:div#banner {:style {:background-color "#f96841"
                          :box-shadow       "3px 1px 4px 0 rgb(0, 0, 0, 0.25)"
                          :color            "#ffffff"
                          :display          (if (pos? (count announcement)) "block" "none")
                          :margin           "0px"
                          :padding          "5px"
                          :position         "fixed"
                          :text-align       "center"
                          :top              "0"
                          :right            "0"
                          :left             "0"
                          :width            "100vw"
                          :z-index          "10000"}}
     [:p {:style {:font-size   "18px"
                  :font-weight "bold"
                  :margin      "0 30px 0 0"}}
      announcement]
     [:button {:style   {:background-color "transparent"
                         :border-color     "#ffffff"
                         :border-radius    "50%"
                         :border-style     "solid"
                         :border-width     "2px"
                         :cursor           "pointer"
                         :display          "flex"
                         :height           "25px"
                         :padding          "0"
                         :position         "fixed"
                         :right            "10px"
                         :top              "5px"
                         :width            "25px"}
               :onClick "document.getElementById('banner').style.display='none'"}
      [:svg {:viewBox "0 0 48 48" :fill "#ffffff"}
       [:path {:d "M38 12.83l-2.83-2.83-11.17 11.17-11.17-11.17-2.83 2.83 11.17 11.17-11.17 11.17 2.83 2.83
                     11.17-11.17 11.17 11.17 2.83-2.83-11.17-11.17z"}]]]]))

(defn render-page [uri]
  (fn [request]
    (let [page          (uri->page uri)
          webpack-files (find-webpack-files page)]
      {:status  200
       :headers {"Content-Type" "text/html"}
       :body    (html5
                 (head webpack-files)
                 [:body {:style {:padding-top "60px"}}
                  (if (seq webpack-files)
                    [:section {:id "content" :class "container-fluid"}
                     ;; TODO These will be moved to the front end for better UX.
                     (when-let [flash-message (get-in request [:params :flash_message])]
                       [:p {:class "alert"} flash-message])
                     (when (.exists (io/as-file "announcement.txt"))
                       (announcement-banner))
                     [:div#app]]
                    [:label "No webpack files found. Check if webpack is running, or wait for it to finish compiling."])
                  (js-init page (assoc (:params request)
                                       :version (current-version)))])})))

(defn not-found-page [request]
  (-> request
      ((render-page "/page-not-found"))
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

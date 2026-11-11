(ns collect-earth-online.utils.rss
  (:require [clojure.data.xml    :as xml]
            [clj-http.client     :as client]
            [triangulum.config   :refer [get-config]]
            [triangulum.response :refer [data-response]]))


(defn- get-xml-items [xml] (filter (fn [{tag :tag}] (= tag :item)) xml))
 
(defn- format-xml-item [{xml-item :content}]
  (let [img-regex #"<img(.*?) />"
        src-regex #"src=\"(.*?)\""
        img-src (when-let [img (->> xml-item (filter #(= :description (:tag %))) first :content first (re-seq img-regex) first second)] (->> img (re-seq src-regex) first second))]    
    (reduce 
     (fn [m {:keys [tag content]}] 
       (if-let [tag-content (get m tag)] 
         (assoc m tag (conj (flatten [tag-content]) (first content)))
         (assoc m tag (first content))))
     {:img img-src} (remove (fn [{:keys [tag]}] (= tag :encoded)) xml-item))))

(defn get-blog-feed [_]
  (let [url   (get-config :blog :url)
        limit 7
        blogs (->> url client/get
                   :body xml/parse-str
                   :content first :content
                   get-xml-items
                   (map format-xml-item))]
    (data-response (if limit
                     (take limit blogs)
                     blogs))))



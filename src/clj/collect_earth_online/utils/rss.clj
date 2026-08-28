(ns collect-earth-online.utils.rss
  (:require [clojure.data.xml :as xml]
            [clj-http.client :as client]
            [triangulum.type-conversion :as tc]
            [triangulum.response :refer [data-response]]))


(defn- get-xml-items [xml] (filter (fn [{tag :tag}] (= tag :item)) xml))

(defn- format-xml-item [{xml-item :content}]
  (reduce 
   (fn [m {:keys [tag content]}] 
     (if-let [tag-content (get m tag)]
       (assoc m tag (conj (flatten [tag-content]) (first content)))
       (case tag :description
             (assoc m tag (->> content first (re-seq #"<p>(.*?)</p>") first second) )
             (assoc m tag (first content))))
     ) {} xml-item))

(defn- format-xml-item [{xml-item :content}]
  (let [img-regex #"<img(.*?) />"
        src-regex #"src=\"(.*?)\""
        img-src (when-let [img (->> xml-item (filter (fn [{:keys [tag]}] (= tag :encoded)))
                                    first :content first (re-seq img-regex) first second)]
                  (->> img (re-seq src-regex) first second))]
    (reduce 
     (fn [m {:keys [tag content]}] 
       (if-let [tag-content (get m tag)] 
         (assoc m tag (conj (flatten [tag-content]) (first content)))
         (assoc m tag (first content)))
       ) {:img img-src} (remove (fn [{:keys [tag]}] (= tag :encoded)) xml-item))))


(defn get-blog-feed [{:keys [query-params]}]
  (let [url (get query-params "url")
        limit (tc/val->int (get query-params "limit" 3))
        blogs (->> url client/get
                   :body xml/parse-str
                   :content first :content
                   get-xml-items
                   (map format-xml-item))]
    (data-response (if limit
                     (take limit blogs)
                     blogs))))



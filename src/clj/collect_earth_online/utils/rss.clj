(ns collect-earth-online.utils.rss
  (:require [clojure.data.xml :as xml]
            [clj-http.client :as client]
            [clojure.string :refer [split]]
            [triangulum.type-conversion :as tc]
            [triangulum.response :refer [data-response]]))


(defn- get-xml-items [xml] (filter (fn [{tag :tag}] (= tag :item)) xml))

(defn- get-featured-image
  "takes a blog item as an argument. parses through supplied blog argument for blog guid, then fetches for that blog post from the wordpress API. parses through the returned blog post for the featured image's guid and makes a second request to get the image source url for that image. this is bad because it makes two separate client/get requests for each blog post, making the 'limit' param CRUCIAL. would be way better if there were a way to get featured image source url from the /posts/ requests, but even more ideal would be its presence in the RSS feed"
  [blog]
  (let [[url guid] (split blog #"\?p=")
        post-url (str url "wp-json/wp/v2/posts/" guid "?_embed-true")
        post (-> post-url client/get :body tc/json->clj)
        featured-media (:featured_media post)
        img-url (str url "wp-json/wp/v2/media/" featured-media)]
    (-> img-url client/get :body tc/json->clj :source_url)))

(defn- format-xml-item [{xml-item :content}]
  (reduce 
   (fn [m {:keys [tag content]}] 
     (if-let [tag-content (get m tag)]
       (assoc m tag (conj (flatten [tag-content]) (first content)))
       (case tag
         :guid (assoc m :img (->> content first get-featured-image))
         :description (assoc m tag (->> content first (re-seq #"<p>(.*?)</p>") first second) )
         (assoc m tag (first content))))
     ) {} xml-item))
 
#_(defn- format-xml-item [{xml-item :content}]
  (let [img-regex #"<img(.*?) />"
        src-regex #"src=\"(.*?)\""
        img-src (when-let [img (->> xml-item (filter (fn [{:keys [tag]}] (= tag :encoded))) first :content first (re-seq img-regex) first second)] (->> img (re-seq src-regex) first second))
        ]
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



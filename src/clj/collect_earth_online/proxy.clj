(ns collect-earth-online.proxy
  (:require [clojure.data.json :as json]
            [clojure.string    :as str]
            [clojure.xml       :as xml]
            [clj-http.client   :as client]
            [triangulum.type-conversion :as tc]
            [triangulum.database        :refer [call-sql]]
            [triangulum.utils           :as u]
            [triangulum.config          :refer [get-config]]
            [collect-earth-online.db.imagery :refer [get-imagery-source-config]]
            [triangulum.response        :refer [data-response]]))

;;; Cache options

(def ^:private cache-max-age     (* 24 60 60 1000)) ; Once a day
(def ^:private tfo-layer-cache (atom nil))
(def ^:private cached-time       (atom nil))
(def ^:private wmts-cache-max-age (* 60 60 1000)) ; one hour
(def ^:private wmts-capabilities-cache (atom {})) ; {imagery-id {:raw xml :public xml :time ms}}
(def ^:private wmts-tile-source-cache (atom {}))
(def ^:private secret-param-names ["api_key" "apikey" "access_token" "connectid"])


(defn- cached-capabilities [imagery-id]
  (let [{:keys [raw time] :as entry} (get @wmts-capabilities-cache imagery-id)]
    (when (and (some? raw)
               (< (- (System/currentTimeMillis) time) wmts-cache-max-age))
      entry)))

(defn- cache-capabilities! [imagery-id raw public]
  (let [entry {:raw raw :public public :time (System/currentTimeMillis)}]
    (swap! wmts-capabilities-cache assoc imagery-id entry)
    entry))

(defn clear-wmts-capabilities-cache!
  "Call this when imagery config is edited so stale layer lists are not served."
  ([]
   (reset! wmts-capabilities-cache {})
   (reset! wmts-tile-source-cache {}))
  ([imagery-id]
   (swap! wmts-capabilities-cache dissoc imagery-id)
   (swap! wmts-tile-source-cache dissoc imagery-id)))


(defn- reset-cache! [layers]
  (reset! cached-time (System/currentTimeMillis))
  (reset! tfo-layer-cache layers))

(defn- valid-cache? []
  (and (some? @tfo-layer-cache)
       (< (- (System/currentTimeMillis) @cached-time) cache-max-age)))

(defn tfo-dates []
  (as-> (client/get (str "https://api.planet.com/basemaps/v1/mosaics?_page_size=150&api_key=" (get-config :proxy :nicfi-key))) $
    (:body $)
    (json/read-str $ :key-fn keyword)
    (:mosaics $)
    (map :name $)
    (filterv #(str/includes? % "normalized") $)
    (reverse $)))


;;; URL Helpers
(defn- append-query
  "Append a query string to a URL that may or may not already have one."
  [url query]
  (str url
       (cond
         (str/blank? query)       ""
         (str/ends-with? url "?") ""
         (str/ends-with? url "&") ""
         (str/includes? url "?")  "&"
         :else                    "?")
       query))

(defn- query-string [params]
  (->> params
       (remove (fn [[_ v]] (nil? v)))
       (map (fn [[k v]] (str (name k) "=" v)))
       (str/join "&")))

(defn- credential-params [source-config]
  (merge (when-let [token (:accessToken source-config)]
           {:api_key token})
         (when-let [connect-id (get-in source-config [:geoserverParams :CONNECTID])]
           {:CONNECTID connect-id})))

;;; GET /get-wmts-capabilities?imageryId=N
(defn- remove-secrets [xml]
  (reduce (fn [s param]
            (str/replace s
                         (re-pattern (str "(?i)" param "=[^&\"'<>\\s]*"))
                         (str param "=REDACTED")))
          xml
          secret-param-names))

(defn- capabilities-url [source-config]
  (append-query (:geoserverUrl source-config)
                (query-string
                 (merge {:SERVICE "WMTS" :REQUEST "GetCapabilities" :VERSION "1.0.0"}
                        (credential-params source-config)
                        (when-let [proc (get-in source-config [:geoserverParams :proc])]
                          {:proc proc})))))

(defn- fetch-capabilities! [imagery-id source-config]
  (let [{:keys [status body]} (client/get (capabilities-url source-config)
                                          {:throw-exceptions false})]
    (if (= 200 status)
      (cache-capabilities! imagery-id body (remove-secrets body))
      (println "WMTS GetCapabilities failed for imagery" imagery-id "status" status))))

(defn- capabilities-entry [imagery-id source-config]
  (let [cached (cached-capabilities imagery-id)]
    (if (map? cached)
      cached
      (let [entry (fetch-capabilities! imagery-id source-config)]
        (when (map? entry) entry)))))

(defn get-wmts-capabilities [{:keys [query-params]}]
  (let [imagery-id (tc/val->int (get query-params "imageryId"))]
    (if-let [cached (cached-capabilities imagery-id)]
      {:status 200 :headers {"Content-Type" "application/xml"} :body (:public cached)}
      (let [source-config (get-imagery-source-config imagery-id)]
        (if (not= "WMTS" (:type source-config))
          (data-response "Imagery source is not WMTS." {:status 400})
          (if-let [entry (capabilities-entry imagery-id source-config)]
            {:status  200
             :headers {"Content-Type" "application/xml"}
             :body    (:public entry)}
            (data-response "Unable to load WMTS capabilities." {:status 502})))))))


;;; Routes

(defn- planet-url [source-config query-params]
  (let [{:strs [year month tile x y z]} query-params]
    (str "https://tiles" tile
         ".planet.com/basemaps/v1/planet-tiles/global_monthly_"
         year "_" month
         "_mosaic/gmap/" z "/" x "/" y ".png?api_key="
         (:accessToken source-config))))

(defn- apply-default-styles [params]
  (update params :STYLES #(if (= "" %)
                            (str/join "," (map (constantly "") (str/split (:LAYERS params) #",")))
                            %)))

(defn- remove-extra-params [params]
  (cond-> params
    (= "" (:FEATUREPROFILE params)) (dissoc :FEATUREPROFILE) ; TODO verify that this is no longer needed and remove.
    :always (dissoc :IMAGERYID)))

(defn upcase-key [[key val]]
  [(keyword (str/upper-case (name key))) val])

(defn- wms-url [source-config query-params]
  (let [geoserver-params (u/mapm upcase-key (:geoserverParams source-config))
        source-url       (:geoserverUrl source-config)]
    (str source-url
         (when-not (str/ends-with? source-url "?") "?")
         (as-> (u/mapm upcase-key query-params) new-query-params
           (remove-extra-params new-query-params)
           (merge new-query-params geoserver-params)
           (apply-default-styles new-query-params)
           (map (fn [[key val]]
                  (str (name key) "=" val))
                new-query-params)
           (str/join "&" new-query-params)))))

;;; WMTS tiles

(defn- parse-xml [s]
  (xml/parse (java.io.ByteArrayInputStream. (.getBytes s "UTF-8"))))

(defn- local-name [tag]
  (when tag (-> tag name (str/split #":") last)))

(defn- descendants-named [node tag-name]
  (->> (tree-seq :content :content node)
       (filter #(= tag-name (local-name (:tag %))))))

(defn- child-named [node tag-name]
  (first (filter #(and (map? %) (= tag-name (local-name (:tag %)))) (:content node))))

(defn- text-of [node]
  (when node (first (filter string? (:content node)))))

(defn- attr-named [node attr-name]
  (some (fn [[k v]] (when (= attr-name (local-name k)) v)) (:attrs node)))

(defn- find-layer [caps layer-id]
  (->> (descendants-named caps "Layer")
       (filter #(= layer-id (text-of (child-named % "Identifier"))))
       (first)))

(defn- resource-template [layer-node]
  (let [resources (->> (descendants-named layer-node "ResourceURL")
                       (filter #(= "tile" (attr-named % "resourceType"))))]
    (attr-named (or (first (filter #(= "image/png" (attr-named % "format")) resources))
                    (first resources))
                "template")))

(defn- kvp-get-tile-url [caps]
  (->> (descendants-named caps "Operation")
       (filter #(= "GetTile" (attr-named % "name")))
       (mapcat #(descendants-named % "Get"))
       (filter #(->> (descendants-named % "Value")
                     (some (fn [v] (= "KVP" (text-of v))))))
       (map #(attr-named % "href"))
       (remove nil?)
       (first)))

(defn- layer-defaults [layer-node]
  {:style      (or (->> (descendants-named layer-node "Style")
                        (filter #(= "true" (attr-named % "isDefault")))
                        (first)
                        (#(text-of (child-named % "Identifier"))))
                   (some-> (child-named layer-node "Style")
                           (child-named "Identifier")
                           (text-of))
                   "default")
   :format     (or (text-of (first (descendants-named layer-node "Format"))) "image/png")
   :matrix-set (some-> (first (descendants-named layer-node "TileMatrixSetLink"))
                       (child-named "TileMatrixSet")
                       (text-of))})

(defn- layer-dimensions [layer-node]
  (->> (descendants-named layer-node "Dimension")
       (keep (fn [d]
               (when-let [id (text-of (child-named d "Identifier"))]
                 [id (text-of (child-named d "Default"))])))
       (into {})))

(defn- resolve-tile-source [capabilities-xml layer-id]
  (let [caps  (parse-xml capabilities-xml)
        layer (find-layer caps layer-id)]
    (if (nil? layer)
      (println "Layer not found in WMTS capabilities:" layer-id)
      (merge {:layer layer-id :dimensions (layer-dimensions layer)}
             (layer-defaults layer)
             (if-let [template (resource-template layer)]
               {:encoding :rest :template template}
               {:encoding :kvp :url (kvp-get-tile-url caps)})))))

(defn- tile-source [imagery-id source-config]
  (or (get @wmts-tile-source-cache imagery-id)
      (when-let [entry (capabilities-entry imagery-id source-config)]
        (let [resolved (resolve-tile-source (:raw entry)
                                            (get-in source-config [:geoserverParams :LAYERS]))]
          (when (map? resolved)
            (swap! wmts-tile-source-cache assoc imagery-id resolved)
            resolved)))))

(defn- tile-coords [params]
  (let [matrix (str (:TILEMATRIX params))
        col    (tc/val->int (:TILECOL params) nil)
        row    (tc/val->int (:TILEROW params) nil)]
    (when (and col row (re-matches #"[A-Za-z0-9_:.\-]{1,64}" matrix))
      {:TileMatrix matrix :TileCol col :TileRow row})))

(defn- config-dimension [source-config id]
  (some (fn [[k v]]
          (when (= (str/upper-case (name k)) (str/upper-case id)) v))
        (:geoserverParams source-config)))

(defn- resolve-dimensions [declared source-config params]
  (reduce-kv (fn [acc id default]
               (let [value (str (or (config-dimension source-config id)
                                    (get params (keyword (str/upper-case id)))
                                    default))]
                 (if (re-matches #"[A-Za-z0-9_:.\-]{1,64}" value)
                   (assoc acc id value)
                   (reduced nil))))
             {}
             (or declared {})))

(defn- fill-template [template values]
  (reduce (fn [s [k v]]
            (str/replace s
                         (re-pattern (str "(?i)\\{" (name k) "\\}"))
                         (str/re-quote-replacement (str v))))
          template
          values))

(defn- rest-tile-url [{:keys [template layer style matrix-set]} source-config coords dims]
  (let [filled (fill-template template
                              (merge dims
                                     {"Layer" layer "Style" style "TileMatrixSet" matrix-set}
                                     coords))
        token  (:accessToken source-config)]
    (cond
      (re-find #"\{[^}]+\}" filled)
      (println "Unsubstituted placeholder in WMTS tile template:" filled)

      (or (str/blank? token) (str/includes? filled "api_key="))
      filled

      :else
      (append-query filled (str "api_key=" token)))))

(defn- kvp-tile-url [{:keys [url layer style matrix-set format]} source-config coords dims]
  (append-query (or url (:geoserverUrl source-config))
                (query-string
                 (merge {:SERVICE       "WMTS"
                         :REQUEST       "GetTile"
                         :VERSION       "1.0.0"
                         :LAYER         layer
                         :STYLE         style
                         :TILEMATRIXSET matrix-set
                         :FORMAT        format}
                        dims
                        {:TILEMATRIX (:TileMatrix coords)
                         :TILECOL    (:TileCol coords)
                         :TILEROW    (:TileRow coords)}
                        (credential-params source-config)))))

(defn- wmts-url [source-config query-params]
  (let [imagery-id (tc/val->int (get query-params "imageryId"))
        params     (-> (u/mapm upcase-key query-params) (dissoc :IMAGERYID))
        coords     (tile-coords params)
        source     (when coords (tile-source imagery-id source-config))
        dims       (when source (resolve-dimensions (:dimensions source) source-config params))]
    (cond
      (nil? coords) ""
      (nil? source) ""
      (nil? dims)   ""
      (= :rest (:encoding source)) (rest-tile-url source source-config coords dims)
      :else                        (kvp-tile-url source source-config coords dims))))

(defn get-wmts-tiles [{:keys [query-params]}]
  (let [imagery-id    (tc/val->int (get query-params "imageryId"))
        source-config (get-imagery-source-config imagery-id)
        url           (when (= "WMTS" (:type source-config))
                        (wmts-url source-config query-params))]
    (if (str/blank? url)
      (data-response "Invalid WMTS tile request." {:status 400})
      (let [{:keys [status headers body]} (client/get url {:as               :byte-array
                                                           :throw-exceptions false})]
        (if (= 200 status)
          {:status  200
           :headers {"Content-Type"  (get headers "Content-Type" "image/jpeg")
                     "Cache-Control" "public, max-age=86400"}
           :body    (java.io.ByteArrayInputStream. body)}
          (do
            (println "WMTS tile request failed for imagery" imagery-id
                     "status" status "url" url "body" (String. body "UTF-8"))
            (data-response "Tile unavailable."
                           {:status (if (<= 400 status 499) 404 502)})))))))

(defn- build-url [{:keys [query-params]}]
  (let [source-config (get-imagery-source-config (tc/val->int (get query-params "imageryId")))
        source-type   (:type source-config "")]
    (cond
      (= "Planet" source-type)
      (planet-url source-config query-params)

      (#{"GeoServer", "SecureWatch"} source-type)
      (wms-url source-config query-params)
      :else
      "")))

(defn proxy-imagery [req]
  (client/get (build-url req) {:as :stream}))

(defn get-securewatch-dates [{:keys [query-params]}]
  (let [source-config (get-imagery-source-config (tc/val->int (get query-params "imageryId")))
        base-url      (:geoserverUrl source-config)
        url           (str base-url
                           (when-not (str/ends-with? base-url "?") "?")
                           (->> (dissoc query-params "imageryId")
                                (map #(str/join "=" %))
                                (str/join "&"))
                           "&CONNECTID="
                           (get-in source-config [:geoserverParams :CONNECTID]))]
    ;; TODO check JSON for errors and parse (front end) using "&EXCEPTIONS=application/json"
    (client/get url)))

(defn get-tfo-dates [& _]
  (when-not (valid-cache?)
    (reset-cache! (tfo-dates)))
  (data-response @tfo-layer-cache))

(defn get-tfo-tiles [{:keys [params]}]
  (let [{:keys [x y z dataLayer band]} params
        institution-id (tc/val->int (:institutionId params))
        access-token   (->> institution-id
                            (call-sql "get_tfo_imagery_by_institution")
                            (first)
                            (:source_config)
                            (tc/jsonb->clj)
                            (:access_token))]
    (client/get (format "https://tiles0.planet.com/basemaps/v1/planet-tiles/%s/gmap/%s/%s/%s.png?proc=%s&api_key=%s"
                        dataLayer z x y band access-token)
                {:as :stream})))

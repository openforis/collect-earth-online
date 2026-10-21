(ns collect-earth-online.proxy
  (:require [clojure.data.json :as json]
            [clojure.string    :as str]
            [clojure.xml       :as xml]
            [clj-http.client   :as client]
            [triangulum.type-conversion :as tc]
            [triangulum.utils           :as u]
            [collect-earth-online.db.imagery :refer [get-imagery-source-config]]
            [triangulum.response        :refer [data-response]]))

;;; Cache options

(def ^:private tfo-cache-max-age  (* 60 60 1000))
(def ^:private tfo-layer-cache    (atom {}))
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


(def ^:private tfo-mosaics-url   "https://api.planet.com/basemaps/v1/mosaics")
(def ^:private tfo-tiles-url     "https://tiles.planet.com/basemaps/v1/planet-tiles")
(def ^:private tfo-mosaic-prefix "planet_medres_normalized_analytic_")
(def ^:private tfo-page-size     100)
(def ^:private tfo-max-pages     20)

(defn- tfo-error [status message]
  (ex-info message {:status status}))

(defn- fetch-tfo-mosaics
  "Returns every normalized analytic mosaic the access token can see, following all result pages."
  [access-token]
  (loop [page 1
         acc  []]
    (let [{:keys [status body]} (client/get tfo-mosaics-url
                                            {:query-params     {:name__contains (str/replace tfo-mosaic-prefix #"_$" "")
                                                                :_page_size     tfo-page-size
                                                                :_page          page
                                                                :api_key        access-token}
                                             :throw-exceptions false})]
      (cond
        (contains? #{401 403} status)
        (throw (tfo-error 403 (str "Planet rejected the access token saved with this imagery. "
                                   "Check that it belongs to an active Tropical Forest Observatory subscription.")))

        (not= 200 status)
        (throw (tfo-error 502 (str "Planet returned an unexpected response (HTTP " status
                                   ") while listing TFO mosaics.")))

        :else
        (let [{:keys [mosaics _links]} (json/read-str body :key-fn keyword)
              acc                      (into acc mosaics)]
          (if (and (seq (:_next _links)) (< page tfo-max-pages))
            (recur (inc page) acc)
            acc))))))

(defn- tfo-mosaic-names
  "Mosaic names, newest first. Planet does not document the order of its list, so sort by date."
  [mosaics]
  (->> mosaics
       (filter #(str/starts-with? (str (:name %)) tfo-mosaic-prefix))
       (sort-by (juxt #(str (:last_acquired %)) #(str (:first_acquired %)) #(str (:name %)))
                #(compare %2 %1))
       (map :name)
       (distinct)
       (vec)))

(defn- tfo-dates
  "Mosaic names (newest first) visible to the access token. Cached per token for an hour.
  Concurrent callers share one request to Planet and failures are never cached."
  [access-token]
  (let [now   (System/currentTimeMillis)
        entry (-> (swap! tfo-layer-cache
                         (fn [cache]
                           (let [cached (get cache access-token)]
                             (if (and cached (< (- now (:time cached)) tfo-cache-max-age))
                               cache
                               (assoc cache access-token
                                      {:time   now
                                       :layers (delay
                                                 (let [names (tfo-mosaic-names (fetch-tfo-mosaics access-token))]
                                                   (if (empty? names)
                                                     (throw (tfo-error 404 (str "No TFO mosaics are available for the access token "
                                                                                "saved with this imagery.")))
                                                     names)))})))))
                  (get access-token))]
    (try
      @(:layers entry)
      (catch Exception e
        (swap! tfo-layer-cache
               (fn [cache]
                 (if (identical? entry (get cache access-token))
                   (dissoc cache access-token)
                   cache)))
        (throw e)))))

(defn- tfo-mosaic-name
  "Turns the dataLayer sent by the client into a Planet mosaic name. A blank dataLayer or \"newest\"
  resolves to the newest mosaic the token can see. Short names that older versions of CEO saved
  (2021-09, 2015-12_2016-05) are expanded to the full mosaic name."
  [access-token data-layer]
  (cond
    (or (str/blank? data-layer) (contains? #{"newest" "undefined" "null"} data-layer))
    (first (tfo-dates access-token))

    (re-matches #"\d{4}-\d{2}(_\d{4}-\d{2})?" data-layer)
    (str tfo-mosaic-prefix data-layer "_mosaic")

    :else
    data-layer))

;;; Utils

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
                           {:status 500})))))))

;;; Routes

(defn- planet-url [source-config query-params]
  (let [{:strs [year month tile x y z]} query-params]
    (str "https://tiles" tile
         ".planet.com/basemaps/v1/planet-tiles/global_monthly_"
         year "_" month
         "_mosaic/gmap/" z "/" x "/" y ".png?api_key="
         (:accessToken source-config))))

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

(defn- tfo-access-token
  "The accessToken saved in source_config of a PlanetTFO imagery, or nil."
  [imagery-id]
  (let [{:keys [type accessToken]} (get-imagery-source-config imagery-id)]
    (when (and (= "PlanetTFO" type) (not (str/blank? accessToken)))
      accessToken)))

(defn- tfo-error-response [e]
  (if-let [status (:status (ex-data e))]
    (data-response (ex-message e) {:status status})
    (do (println "Planet TFO request failed:" (ex-message e))
        (data-response "Unable to reach Planet to load TFO imagery." {:status 502}))))

(def ^:private no-tfo-token-message
  "This imagery does not have a Planet TFO access token.")

(defn get-tfo-dates [{:keys [params]}]
  (if-let [access-token (tfo-access-token (tc/val->int (:imageryId params)))]
    (try
      (data-response (tfo-dates access-token))
      (catch Exception e
        (tfo-error-response e)))
    (data-response no-tfo-token-message {:status 400})))

(defn get-tfo-tiles [{:keys [params]}]
  (let [{:keys [x y z dataLayer band]} params
        access-token (tfo-access-token (tc/val->int (:imageryId params)))
        proc         (when-not (contains? #{"" "undefined" "null"} (str band)) (str band))]
    (cond
      (nil? access-token)
      (data-response no-tfo-token-message {:status 400})

      (not (and (every? #(re-matches #"\d+" (str %)) [x y z])
                (re-matches #"[\w-]*" (str dataLayer))
                (or (nil? proc) (re-matches #"\w+" proc))))
      (data-response "Invalid TFO tile request." {:status 400})

      :else
      (try
        (let [mosaic                        (tfo-mosaic-name access-token (str dataLayer))
              {:keys [status headers body]} (client/get (str tfo-tiles-url "/" mosaic "/gmap/" z "/" x "/" y ".png")
                                                        {:query-params     (cond-> {:api_key access-token}
                                                                             proc (assoc :proc proc))
                                                         :as               :stream
                                                         :throw-exceptions false})]
          (if (= 200 status)
            {:status  200
             :headers (cond-> {"Content-Type" (get headers "Content-Type" "image/png")}
                        (get headers "Cache-Control") (assoc "Cache-Control" (get headers "Cache-Control")))
             :body    body}
            (do (when body (.close ^java.io.Closeable body))
                (data-response "TFO tile unavailable." {:status status}))))
        (catch Exception e
          (tfo-error-response e))))))

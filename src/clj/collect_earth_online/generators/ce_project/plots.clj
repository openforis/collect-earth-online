(ns collect-earth-online.generators.ce-project.plots
  (:require [clojure.data.csv  :as csv]
            [clojure.data.json :as json]
            [clojure.java.io   :as io]
            [clojure.string    :as str]
            [collect-earth-online.generators.ce-project.report :as report]
            [collect-earth-online.utils.geom :refer [EPSG:3857->4326
                                                     EPSG:4326->3857
                                                     epsg3857-point-resolution
                                                     make-geo-json-polygon]])
  (:import [java.io File]
           [java.util Base64 Properties]))

(def properties-file-name "project_definition.properties")

;;;
;;; Properties
;;;

(defn read-properties
  "Contents of project_definition.properties as a keyword map."
  [dir]
  (let [file (io/file dir properties-file-name)]
    (if (.isFile file)
      (with-open [in (io/input-stream file)]
        (let [props (Properties.)]
          (.load props in)
          (into {} (map (fn [[k v]] [(keyword (str k)) (str/trim (str v))])) props)))
      {})))

(defn- numeric-property
  "Property as a double, default when blank, fatal when not a number."
  [props k default]
  (let [v (get props k)]
    (if (str/blank? v)
      default
      (or (parse-double v)
          (throw (report/fatal (str "Invalid " (name k) " in " properties-file-name ": " v)))))))

(defn- check-crs!
  "Rejects projects whose coordinates aren't WGS84 lat/lon."
  [props]
  (let [crs (get props :coordinates_reference_system)]
    (when-not (or (str/blank? crs) (re-matches #"(?i)(EPSG:)?4326" crs))
      (throw (report/fatal (str "Plot coordinates use " crs "; only EPSG:4326 is supported."))))))

;;;
;;; Grid CSV
;;;

(defn- csv-property-name
  "File name given by the csv property, if any."
  [props]
  (some-> (get props :csv) (str/split #"[/\\]") last))

(defn- grid-csv-file
  "Grid CSV named by the csv property, else the first CSV in grid/."
  ^File [dir props]
  (let [named (csv-property-name props)
        csvs  (->> (.listFiles (io/file dir "grid"))
                   (filter #(and (.isFile ^File %)
                                 (str/ends-with? (str/lower-case (.getName ^File %)) ".csv")))
                   (sort-by #(.getName ^File %)))]
    (or (some #(when (= named (.getName ^File %)) %) csvs)
        (first csvs)
        (throw (report/fatal "No plot CSV was found in the project's grid folder.")))))

(defn- read-rows
  "Non-blank CSV rows with trimmed values and no byte order mark."
  [^File file]
  (let [rows (with-open [reader (io/reader file :encoding "UTF-8")]
               (->> (csv/read-csv reader)
                    (map (fn [row] (mapv str/trim row)))
                    (remove #(every? str/blank? %))
                    (vec)))]
    (when (empty? rows)
      (throw (report/fatal (str "The plot CSV " (.getName file) " is empty."))))
    (update-in rows [0 0] #(str/trim (str/replace % "\uFEFF" "")))))

(defn- parse-coordinate
  "Coordinate cell as a double, accepting a decimal comma like Collect Earth."
  [s]
  (some-> s (str/replace "," ".") parse-double))

(defn- dedupe-headers
  "Header names made unique by suffixing repeats with _2, _3..."
  [headers]
  (first (reduce (fn [[out seen] h]
                   (let [h (if (str/blank? h) "column" h)
                         n (inc (get seen h 0))]
                     [(conj out (if (= 1 n) h (str h "_" n))) (assoc seen h n)]))
                 [[] {}]
                 headers)))

(defn- default-headers
  "Header names for a CSV without a header row."
  [key-attributes width]
  (let [base (concat (map :name key-attributes) ["YCoordinate" "XCoordinate"])]
    (vec (take width (concat base (map #(str "column_" %) (iterate inc (inc (count base)))))))))

;;;
;;; Polygons in CSV cells
;;;

(defn- close-ring
  "Ring with its first position repeated at the end."
  [ring]
  (if (and (seq ring) (not= (first ring) (peek ring)))
    (conj ring (first ring))
    ring))

(defn- valid-position?
  "True for a [lon lat] pair inside WGS84 bounds."
  [[lon lat :as position]]
  (and (= 2 (count position))
       (number? lon)
       (number? lat)
       (<= -180 lon 180)
       (<= -90 lat 90)))

(defn- polygon-geometry
  "GeoJSON Polygon or MultiPolygon from a list of polygons, or nil if invalid."
  [polygons]
  (let [polygons (->> polygons
                      (map (fn [rings]
                             (mapv (fn [ring] (close-ring (mapv #(vec (take 2 %)) ring))) rings)))
                      (filter seq)
                      (vec))]
    (when (and (seq polygons)
               (every? (fn [rings]
                         (every? #(and (<= 4 (count %)) (every? valid-position? %)) rings))
                       polygons))
      (if (= 1 (count polygons))
        {:type "Polygon" :coordinates (first polygons)}
        {:type "MultiPolygon" :coordinates polygons}))))

(defn- kml-coordinates
  "Positions from a KML coordinates string."
  [s]
  (mapv (fn [tuple] (mapv parse-double (take 2 (str/split tuple #","))))
        (str/split (str/trim s) #"\s+")))

(defn- kml-rings
  "Rings inside the given boundary elements of a KML Polygon block."
  [block boundary]
  (->> (re-seq (re-pattern (str "(?is)<(?:\\w+:)?" boundary "\\b.*?"
                                "<(?:\\w+:)?coordinates[^>]*>(.*?)</(?:\\w+:)?coordinates>"))
               block)
       (map (comp kml-coordinates second))))

(defn- kml-geometry
  "Geometry of the KML Polygons in a cell."
  [v]
  (->> (re-seq #"(?is)<(?:\w+:)?Polygon\b.*?</(?:\w+:)?Polygon>" v)
       (map (fn [block]
              (concat (take 1 (kml-rings block "outerBoundaryIs"))
                      (kml-rings block "innerBoundaryIs"))))
       (polygon-geometry)))

(defn- parse-wkt-list
  "Parses a parenthesized WKT list into nested vectors, returning [tree remaining-tokens]."
  [tokens]
  (loop [ts       (rest tokens)
         elements []]
    (let [[element ts] (if (= "(" (first ts))
                         (parse-wkt-list ts)
                         (let [[numbers more] (split-with #(not (#{"," ")"} %)) ts)]
                           [(mapv parse-double numbers) more]))
          elements     (conj elements element)]
      (case (first ts)
        "," (recur (rest ts) elements)
        ")" [elements (rest ts)]
        (throw (ex-info "Malformed WKT" {}))))))

(defn- wkt-geometry
  "Geometry of a WKT POLYGON or MULTIPOLYGON cell."
  [v]
  (try
    (when-let [[_ multi body] (re-matches #"(?is)\s*(multi)?polygon\s*(?:zm|z|m)?\s*(\(.*\))\s*" v)]
      (let [[tree _] (parse-wkt-list (re-seq #"[(),]|[^\s(),]+" body))]
        (polygon-geometry (if multi tree [tree]))))
    (catch Exception _ nil)))

(defn- geojson-cell
  "{:geometry ...} for a GeoJSON Polygon or MultiPolygon cell, else nil."
  [v]
  (let [data     (try (json/read-str v :key-fn keyword) (catch Exception _ nil))
        geometry (if (= "Feature" (:type data)) (:geometry data) data)]
    (case (when (map? geometry) (:type geometry))
      "Polygon"      {:geometry (polygon-geometry [(:coordinates geometry)])}
      "MultiPolygon" {:geometry (polygon-geometry (:coordinates geometry))}
      nil)))

(defn- polygon-cell
  "Nil if the cell isn't a polygon, else {:geometry g} with g nil when it can't be read."
  [v]
  (cond
    (str/includes? (str/lower-case v) "<polygon") {:geometry (kml-geometry v)}
    (re-find #"(?i)^\s*(multi)?polygon\b" v)     {:geometry (wkt-geometry v)}
    (str/starts-with? (str/triml v) "{")         (geojson-cell v)
    :else                                        nil))

;;;
;;; Plots drawn from the center point
;;;

(defn- plot-design
  "Collect Earth plot design from the properties, with Collect Earth's defaults."
  [props]
  {:shape    (str/upper-case (or (not-empty (get props :sample_shape)) "SQUARE"))
   :points   (long (numeric-property props :number_of_sampling_points_in_plot 25))
   :distance (numeric-property props :distance_between_sample_points 0.0)
   :margin   (numeric-property props :distance_to_plot_boundaries 0.0)})

(defn- square-side
  "Side of Collect Earth's square plot in meters."
  [{:keys [points distance margin]}]
  (+ (* distance (dec (long (Math/sqrt points)))) (* 2 margin)))

(defn- square-offsets
  "Corner offsets of a square, counter-clockwise from the top-left."
  [side]
  (let [h (/ side 2.0)]
    [[(- h) h] [(- h) (- h)] [h (- h)] [h h]]))

(defn- circle-offsets
  "Collect Earth's circle vertices: radius plus 5 m, offsets rounded to whole meters."
  [radius vertices]
  (let [r (double (+ radius 5.0))]
    (mapv (fn [i]
            (let [t (Math/toRadians (* i (/ 360.0 vertices)))]
              [(double (Math/round (double (* r (Math/cos t)))))
               (double (Math/round (double (* r (Math/sin t)))))]))
          (range vertices))))

(defn- design-offsets
  "Outline offsets in meters for the plot design, or nil if it isn't drawn from the center."
  [{:keys [shape distance] :as design}]
  (case shape
    ("SQUARE" "SQUARE_WITH_LARGE_CENTRAL_PLOT")
    (let [side (square-side design)]
      (when-not (pos? side)
        (throw (report/fatal (str "The plot design gives a square side of " side " m; check "
                                  properties-file-name "."))))
      (square-offsets side))

    "CIRCLE"  (circle-offsets distance 130)
    "HEXAGON" (circle-offsets distance 6)
    nil))

(defn- offset-ring
  "Closed ring around a [lon lat] center, using CEO's web mercator scaling."
  [[lon lat] offsets]
  (let [[x y] (EPSG:4326->3857 [lon lat])
        k     (epsg3857-point-resolution [x y])]
    (close-ring (mapv (fn [[dx dy]] (EPSG:3857->4326 [(+ x (/ dx k)) (+ y (/ dy k))]))
                      offsets))))

(defn- design-description
  "Short description of the drawn plot outline for the report."
  [{:keys [shape distance] :as design}]
  (case shape
    ("SQUARE" "SQUARE_WITH_LARGE_CENTRAL_PLOT") (str "squares of " (square-side design) " m")
    "CIRCLE"                                    (str "circles of radius " (+ distance 5.0) " m")
    "HEXAGON"                                   (str "hexagons of radius " (+ distance 5.0) " m")
    nil))

;;;
;;; Plots
;;;

(defn- row->plot
  "Plot from a CSV row as {:ce-id :geometry :properties}, or {:ce-id :error}."
  [headers key-count design offsets row]
  (let [lat-i               key-count
        lon-i               (inc key-count)
        [polygon-i polygon] (first (keep-indexed (fn [i v]
                                                   (when-not (contains? (hash-set lat-i lon-i) i)
                                                     (when-let [p (polygon-cell v)] [i p])))
                                                 row))
        excluded            (hash-set lat-i lon-i polygon-i)
        ce-id               (str/join "," (take key-count row))
        properties          (into {}
                                  (keep-indexed (fn [i v]
                                                  (when-not (contains? excluded i)
                                                    [(get headers i (str "column_" (inc i))) v])))
                                  row)
        position            [(parse-coordinate (get row lon-i)) (parse-coordinate (get row lat-i))]]
    (cond
      polygon
      (if-let [geometry (:geometry polygon)]
        {:ce-id ce-id :geometry geometry :properties properties}
        {:ce-id ce-id :error :invalid-polygon})

      (not (valid-position? position))
      {:ce-id ce-id :error :invalid-coordinates}

      @offsets
      {:ce-id      ce-id
       :geometry   {:type "Polygon" :coordinates [(offset-ring position @offsets)]}
       :properties properties}

      (str/ends-with? (:shape design) "_POLYGON")
      {:ce-id ce-id :error :missing-polygon}

      :else
      (throw (report/fatal (str "Plot design " (:shape design) " isn't supported yet. Supported: "
                                "SQUARE, SQUARE_WITH_LARGE_CENTRAL_PLOT, CIRCLE, HEXAGON, "
                                "or polygons in the plot CSV."))))))

(defn- positive-int
  "Value as a long if it's a positive integer without leading zeros, else nil."
  [s]
  (when (re-matches #"[1-9]\d{0,8}" s)
    (parse-long s)))

(defn- assign-plot-ids
  "Plots with PLOTID set, and whether they had to be renumbered."
  [plots key-count]
  (let [ids (map #(positive-int (:ce-id %)) plots)]
    (if (and (= 1 key-count) (every? some? ids) (apply distinct? ids))
      [(map (fn [plot id] (assoc-in plot [:properties "PLOTID"] id)) plots ids) false]
      [(map-indexed (fn [i plot]
                      (update plot :properties assoc "PLOTID" (inc i) "ce_plot_id" (:ce-id plot)))
                    plots)
       true])))

(defn- bounding-box
  "AOI polygon covering every plot geometry."
  [geometries]
  (let [positions (mapcat (fn [{:keys [type coordinates]}]
                            (if (= "Polygon" type)
                              (apply concat coordinates)
                              (apply concat (apply concat coordinates))))
                          geometries)
        lons      (map first positions)
        lats      (map second positions)]
    (make-geo-json-polygon (apply min lons) (apply min lats) (apply max lons) (apply max lats))))

(def ^:private error-messages
  {:invalid-coordinates "latitude/longitude missing or out of range"
   :invalid-polygon     "polygon couldn't be read"
   :missing-polygon     "no polygon in the row"})

(defn- skipped-entries
  "One report entry per kind of skipped row."
  [csv-name failures]
  (for [[error rows] (group-by :error failures)]
    (report/entry :warning :plots csv-name
                  (str (count rows) " rows skipped (" (error-messages error) "), e.g. plot "
                       (str/join ", " (map :ce-id (take 5 rows))) ".")
                  :outcome :skipped)))

(defn- data-url
  "GeoJSON string as a base64 data URL."
  [^String s]
  (str "data:application/geo+json;base64,"
       (.encodeToString (Base64/getEncoder) (.getBytes s "UTF-8"))))

(defn plot-file
  "GeoJSON plot file built from the grid CSV, with its report entries."
  [dir props key-attributes]
  (check-crs! props)
  (let [file                (grid-csv-file dir props)
        csv-name            (.getName file)
        rows                (read-rows file)
        key-count           (count key-attributes)
        header?             (and (nil? (parse-coordinate (get (first rows) key-count)))
                                 (not-any? polygon-cell (first rows)))
        headers             (if header?
                              (dedupe-headers (first rows))
                              (default-headers key-attributes (apply max (map count rows))))
        design              (plot-design props)
        offsets             (delay (design-offsets design))
        results             (mapv #(row->plot headers key-count design offsets %)
                                  (if header? (rest rows) rows))
        {plots nil}         (group-by :error results)
        _                   (when (empty? plots)
                              (throw (report/fatal (str "None of the rows in " csv-name " has a usable plot."))))
        [plots renumbered?] (assign-plot-ids plots key-count)
        collection          {:type     "FeatureCollection"
                             :features (mapv (fn [{:keys [geometry properties]}]
                                               {:type "Feature" :geometry geometry :properties properties})
                                             plots)}
        drawn               (when (realized? offsets) (design-description design))
        named-csv           (csv-property-name props)]
    {:plotDistribution "geojson"
     :plotFileName     (str (or (not-empty (get props :survey_name))
                                (str/replace csv-name #"\.[^.]*$" ""))
                            ".geojson")
     :plotFileBase64   (data-url (json/write-str collection))
     :numPlots         (count plots)
     :aoiFeatures      [(bounding-box (map :geometry plots))]
     :extra-columns    (->> plots
                            (mapcat (comp keys :properties))
                            (distinct)
                            (remove (set (concat (take key-count headers) ["PLOTID" "ce_plot_id"])))
                            (vec))
     :entries          (concat
                        [(report/entry :info :plots csv-name
                                       (str "Imported " (count plots) " plots from grid/" csv-name
                                            (when drawn (str ", drawn as " drawn)) ".")
                                       :outcome :imported)]
                        (when (and named-csv (not= named-csv csv-name))
                          [(report/entry :warning :plots csv-name
                                         (str "The project names " named-csv
                                              ", which isn't in grid/; used " csv-name " instead."))])
                        (when renumbered?
                          [(report/entry :info :plots csv-name
                                         (str "Collect Earth plot ids aren't unique positive integers, so plots "
                                              "are numbered 1 to " (count plots) "; the original ids are in ce_plot_id."))])
                        (skipped-entries csv-name (filter :error results)))}))

;;;
;;; Project options
;;;

(defn project-options
  "CEO project options implied by the Collect Earth project."
  [props plot-file]
  {:showGEEScript       (= "true" (some-> (get props :open_gee_app) str/lower-case))
   :showPlotInformation (boolean (seq (:extra-columns plot-file)))
   :collectConfidence   false
   :autoLaunchGeoDash   false})

(ns collect-earth-online.generators.external-file
  (:require [clojure.string     :as str]
            [clojure.set        :as set]
            [clojure.java.io    :as io]
            [clojure.java.shell :as sh]
            [clojure.data.json  :as json]
            [flatland.ordered.map                  :refer [ordered-map]]
            [triangulum.config                     :refer [get-config]]
            [triangulum.type-conversion            :as tc]
            [triangulum.utils                      :refer [parse-as-sh-cmd]]
            [collect-earth-online.utils.part-utils :as pu]
            [collect-earth-online.utils.geom       :refer [make-wkt-point]]))

;;;
;;; Constants
;;;

(def tmp-dir  (System/getProperty "java.io.tmpdir"))
(def path-env (System/getenv "PATH"))

;;;
;;; Helper Functions
;;;

(defn- find-file-by-ext [folder-name ext]
  (->> (io/file folder-name)
       (file-seq)
       (map #(.getName %))
       (remove #(= folder-name %))
       (filter #(= ext (peek (str/split % #"\."))))
       (first)))

(defn- sh-wrapper [dir env & commands]
  (sh/with-sh-dir dir
    (sh/with-sh-env (merge {:PATH path-env} env)
      (doseq [cmd commands]
        (let [{:keys [exit err]} (apply sh/sh (parse-as-sh-cmd cmd))]
          (when-not (= 0 exit)
            (pu/init-throw  err)))))))

(defn- sh-wrapper-stdout [dir env cmd]
  (sh/with-sh-dir dir
    (sh/with-sh-env (merge {:PATH path-env} env)
      (let [{:keys [exit err out]} (apply sh/sh (parse-as-sh-cmd cmd))]
        (if (= 0 exit)
          out
          (pu/init-throw  err))))))

(defn- sh-wrapper-quoted [dir env & commands]
  (sh/with-sh-dir dir
    (sh/with-sh-env (merge {:PATH path-env} env)
      (doseq [cmd commands]
        (let [{:keys [exit err]} (sh/sh "bash" "-c" cmd)]
          (when-not (= 0 exit)
            (pu/init-throw err)))))))

;;;
;;; Load Information
;;;

(defmulti get-file-data (fn [distribution _ _ _] (keyword distribution)))

(defmethod get-file-data :shp [_ design-type ext-file folder-name]
  (sh-wrapper folder-name {} (str "7z e -y " ext-file " -o" design-type))
  (let [[info body-text _] (-> (sh-wrapper-stdout (str folder-name design-type)
                                                  {}
                                                  (str "shp2pgsql -s 4326 -t 2D -D "
                                                       (find-file-by-ext (str folder-name design-type) "shp")))
                               (str/split #"stdin;\n|\n\\\."))
        geom-key    (keyword (str design-type "_geom"))
        header-keys (as-> info i
                      (str/replace i #"\n" "")
                      (re-find #"(?<=CREATE TABLE.*gid serial,).*?(?=\);)" i)
                      (str/replace i #"\"" "")
                      (str/lower-case i)
                      (str/split i #",")
                      (mapv (fn [col] (first (str/split col #" "))) i)
                      (conj i geom-key)
                      (map (fn [h]
                             (keyword (if (= (str design-type "id") h)
                                        "visible_id"
                                        h)))
                           i))
        body        (map (fn [row]
                           (as-> row r
                             (str/split r #"\t")
                             (zipmap header-keys r)
                             (update r geom-key tc/str->pg "geometry")
                             (update r :visible_id tc/val->int)))
                         (str/split body-text #"\r\n|\n|\r"))]
    (if (apply distinct? header-keys)
      [header-keys body]
      (pu/init-throw (str "The provided "
                          design-type
                          " SHP file must not contain duplicate column titles.")))))

(defmethod get-file-data :geojson [_ design-type ext-file folder-name]
  (let [features (:features (tc/json->clj (slurp (str folder-name ext-file))))
        geom-key (keyword (str design-type "_geom"))
        plots (reduce (fn [acc feature]
                        (let [{:keys [geometry properties]} feature
                              visible-id (condp = design-type
                                           "plot" (:PLOTID properties)
                                           "sample" (:SAMPLEID properties))]
                          (condp = design-type
                            "plot" (conj acc {geom-key (tc/str->pg (json/write-str geometry) "geometry")
                                              :visible_id (tc/val->int visible-id)
                                              :extra_plot_info properties})
                            "sample" (conj acc {geom-key (tc/str->pg (json/write-str geometry) "geometry")
                                                :visible_id (tc/val->int visible-id)
                                                :plotid     (:PLOTID properties)
                                                :extra_plot_info properties}))))
                      [] features)]
    [(keys (first plots)) plots]))

(defmethod get-file-data :csv [_ design-type ext-file folder-name]
  (let [rows       (str/split (slurp (str folder-name ext-file)) #"\r\n|\n|\r")
        header-row (first rows)]
    (when (not (str/includes? header-row ","))
      (pu/init-throw  (str "The provided "
                           design-type
                           " CSV file must use commas for the delimiter. This error may indicate that the csv file contains only one column.")))
    (let [geom-key    (keyword (str design-type "_geom"))
          header-keys (as-> header-row hr
                        (str/split hr #",")
                        (mapv #(-> %
                                   (str/lower-case)
                                   (str/replace "\uFEFF" "")
                                   (str/replace #"^\"|\"$" "")
                                   (str/replace #"-| |\"" "_")
                                   (str/replace #"^(x|longitude|long|center_x)$" "lon")
                                   (str/replace #"^(y|latitude|center_y)$" "lat")
                                   (str/replace (re-pattern (str "^" design-type "id$")) "visible_id")
                                   (keyword))
                              hr))
          split-row   (fn [row] (if (str/includes? row "\"")
                                  (->> (str/split row #"\"")
                                       (map #(if (or (str/ends-with? % ",") (str/starts-with? % ","))
                                               (str/split % #",")
                                               %))
                                       flatten)
                                  (str/split row #",")))
          body        (map (fn [row]
                             (as-> row r
                               (split-row r)
                               (into (ordered-map) (map vector header-keys r))
                               (assoc r geom-key (tc/str->pg (make-wkt-point (:lon r) (:lat r)) "geometry"))
                               (update r :visible_id tc/val->int)
                               (dissoc r :lon :lat)))
                           (rest rows))]
      (if (and (some #(= % :lon) header-keys)
               (some #(= % :lat) header-keys))
        (if (apply distinct? header-keys)
          [(pu/remove-vector-items header-keys [:lon :lat]) body]
          (pu/init-throw (str "The provided "
                              design-type
                              " CSV file must not contain duplicate column titles.")))
        (pu/init-throw  (str "The provided "
                             design-type
                             " CSV file must contain a LAT and LON column."))))))

(defmethod get-file-data :default [distribution _ _ _]
  (throw (str "No such distribution (" distribution ") defined for collect-earth-online.db.projects/get-file-data")))

(defn- clean-header-text [s design-type]
  (-> s
      (name)
      (str/replace #"visible_" design-type)
      (str/upper-case)))

(defn- check-headers [headers primary-key design-type]
  (let [header-diff     (set/difference (set primary-key) (set headers))
        invalid-headers (seq (remove #(re-matches #"^[a-zA-Z_][a-zA-Z0-9_]*$" (name %)) headers))]
    (when (seq header-diff)
      (pu/init-throw  (str "The required header field(s) "
                           (as-> header-diff h
                             (map #(clean-header-text % design-type) h)
                             (str/join "', '" h)
                             (str/replace h #"visible_" design-type)
                             (str "'" h "'"))
                           " are missing.")))
    (when invalid-headers
      (pu/init-throw  (str "One or more headers contains invalid characters: '"
                           (str/join "', '" (map #(clean-header-text % design-type) invalid-headers))
                           "'")))))

(defn load-external-data! [project-id distribution file-name file-base64 design-type primary-key]
  (when (#{"csv" "shp" "geojson"} distribution)
    (let [folder-name (str tmp-dir "/ceo-tmp-" project-id "/")
          saved-file  (pu/write-file-part-base64 file-name
                                                 file-base64
                                                 folder-name
                                                 (str "project-" project-id "-" design-type))]
      (pu/try-catch-throw #(let [[headers body] (get-file-data distribution design-type saved-file folder-name)]
                             (when-not (seq body)
                               (pu/init-throw  (str "The " design-type " file contains no rows of data.")))

                             (check-headers headers primary-key design-type)

                             (let [duplicates (->> body
                                                   (group-by (apply juxt primary-key))
                                                   (filter (fn [[_ v]] (> (count v) 1))))]
                               (when (seq duplicates)
                                 (pu/init-throw  (str "The " design-type " file contains duplicate primary keys. "
                                                      (count duplicates)
                                                      " duplicates exists. The first 10 are:\n"
                                                      (->> duplicates
                                                           (map (fn [[k _]]
                                                                  (str "["
                                                                       (str/join ", "
                                                                                 (->> k
                                                                                      (zipmap primary-key)
                                                                                      (map (fn [[k2 v2]]
                                                                                             (str (name k2) ": " v2)))))
                                                                       "]")))
                                                           (take 10)
                                                           (str/join "\n"))))))
                             body)
                          (str (str/capitalize design-type) " " distribution " file failed to load.")))))

(defn- clj->pg-json
  [clj]
  (-> clj tc/clj->json (tc/str->pg "json")))

(defn- split-ext [row ext-key main-keys]
  (let [extra-info-map (into (ordered-map) (apply dissoc row main-keys))]
    (assoc (select-keys row main-keys)
           ext-key
           (clj->pg-json (select-keys extra-info-map (keys (apply dissoc row main-keys)))))))

(defn generate-file-samples [plots
                             plot-count
                             project-id
                             sample-distribution
                             sample-file-name
                             sample-file-base64]
  (let [ext-samples  (load-external-data! project-id
                                          sample-distribution
                                          sample-file-name
                                          sample-file-base64
                                          "sample"
                                          [:plotid :visible_id])
        sample-count (count ext-samples)
        plot-keys    (persistent!
                      (reduce (fn [acc {:keys [plot_id visible_id]}]
                                (assoc! acc (str visible_id) plot_id))
                              (transient {})
                              plots))]
    ;; TODO check for samples with no plots - OR - ensure that PG errors pass through.
    (map (fn [s]
           (-> s
               (assoc :plot_rid (or
                                 (get plot-keys (str (:plotid s)))
                                 (get plot-keys (:plotid s))))
               (dissoc :plotid)
               (split-ext :extra_sample_info [:plot_rid :visible_id :sample_geom])))
         ext-samples)))

(defn generate-file-plots [project-id
                           plot-distribution
                           plot-file-name
                           plot-file-base64]
  (let [ext-plots (load-external-data! project-id
                                       plot-distribution
                                       plot-file-name
                                       plot-file-base64
                                       "plot"
                                       [:visible_id])]
    (map (fn [p]
           (-> p
               (assoc :project_rid project-id)
               (split-ext :extra_plot_info [:project_rid :visible_id :plot_geom])))
         ext-plots)))

(defn pgsql2shp-string
  [db-config file-name query]
  (let [db-name (:dbname db-config)
        db-user (:user db-config)]
    (str "pgsql2shp -f " file-name " -u " db-user " " db-name " " query)))

(defn export-table-to-file
  [folder-name project-id table-name db-config]
  (sh-wrapper-quoted folder-name {}
                         (pgsql2shp-string db-config
                                           (str project-id "-" table-name)
                                           (str "\"SELECT * FROM get_" table-name "_shapes(" project-id ")\""))))

(defn create-shape-files
  [folder-name table-name project-id]
  (let [shape-folder-name (str folder-name table-name "-shape-files/")
        db-config         (get-config :database)]
    (sh-wrapper folder-name {} (str "rm -rf " shape-folder-name) (str "mkdir " shape-folder-name))
    (export-table-to-file shape-folder-name project-id table-name db-config)))

(defn create-data-file
  [folder-name json-data]
  (spit (str folder-name "data.json")
        json-data))

(defn create-and-zip-files-for-doi
  [project-id project-data]
    (let [folder-name (str tmp-dir "/ceo-tmp-" project-id "-files/")]
    (sh-wrapper tmp-dir {} (str "rm -rf " folder-name) (str "mkdir " folder-name))
    (create-shape-files folder-name "plot" project-id)
    (create-shape-files folder-name "sample" project-id)
    (create-data-file folder-name project-data)
    (sh-wrapper tmp-dir {}
                (str "7z a " folder-name "files" ".zip " folder-name "*"))
    (str folder-name "files.zip")))

(defn zip-shape-files
  [project-id]
  (let [folder-name (str tmp-dir "/ceo-tmp-" project-id "-files/")]
    (sh-wrapper tmp-dir {} (str "rm -rf " folder-name) (str "mkdir " folder-name))
    (create-shape-files folder-name "plot" project-id)
    (create-shape-files folder-name "sample" project-id)
    (sh-wrapper tmp-dir {}
                (str "7z a " folder-name "/files" ".zip " folder-name "/*"))
    (str folder-name "files.zip")))


(defn remove-old-dir
  [dir-name]
  (try
    (sh-wrapper tmp-dir {} (str "rm -rf ceo-tmp-" dir-name))
    (catch Exception e
      (println "Directory doesn't exist"))))

(defn unzip-project
  "Unzips a zip file on /tmp folder."
  [file-name file-base64]
  (let [file-without-ext (first (clojure.string/split file-name #"\."))
        _                (remove-old-dir file-without-ext)
        output-dir       (str tmp-dir
                              "/ceo-tmp-"
                              file-without-ext
                              "/")
        saved-file       (pu/write-file-part-base64 file-name
                                                    file-base64
                                                    output-dir
                                                    file-without-ext)]
    (sh-wrapper tmp-dir {} (str "unzip " (str output-dir file-name) " -d " output-dir))
    output-dir))

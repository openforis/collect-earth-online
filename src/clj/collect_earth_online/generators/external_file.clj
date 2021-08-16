(ns collect-earth-online.generators.external-file
  (:require [clojure.string     :as str]
            [clojure.set        :as set]
            [clojure.java.io    :as io]
            [clojure.java.shell :as sh]
            [collect-earth-online.utils.type-conversion :as tc]
            [collect-earth-online.utils.part-utils      :as pu]
            [collect-earth-online.utils.geom    :refer [make-wkt-point]]
            [collect-earth-online.utils.project :refer [check-plot-limits check-sample-limits]]))

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

(defn- parse-as-sh-cmd
  "Split string into an array for use with clojure.java.shell/sh."
  [s]
  (loop [chars (seq s)
         acc   []]
    (if (empty? chars)
      acc
      (if (= \` (first chars))
        (recur (->> chars (rest) (drop-while #(not= \` %)) (rest))
               (->> chars (rest) (take-while #(not= \` %)) (apply str) (str/trim) (conj acc)))
        (recur (->> chars (drop-while #(not= \` %)))
               (->> chars (take-while #(not= \` %)) (apply str) (str/trim) (#(str/split % #" ")) (remove str/blank?) (into acc)))))))

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
    [header-keys body]))

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
                                   (str/replace #"-| " "_")
                                   (str/replace #"^(x|longitude|long|center_x)$" "lon")
                                   (str/replace #"^(y|latitude|center_y)$" "lat")
                                   (str/replace (re-pattern (str "^" design-type "id$")) "visible_id")
                                   (keyword))
                              hr))
          body        (map (fn [row]
                             (as-> row r
                               (str/split r #",")
                               (zipmap header-keys r)
                               (assoc r geom-key (tc/str->pg (make-wkt-point (:lon r) (:lat r)) "geometry"))
                               (update r :visible_id tc/val->int)
                               (dissoc r :lon :lat)))
                           (rest rows))]
      (if (and (some #(= % :lon) header-keys)
               (some #(= % :lat) header-keys))
        [(pu/remove-vector-items header-keys [:lon :lat]) body]
        (pu/init-throw  (str "The provided "
                             design-type
                             " CSV file must contain a LAT and LON column."))))))

(defmethod get-file-data :default [distribution _ _ _]
  (throw (str "No such distribution (" distribution ") defined for collect-earth-online.db.projects/get-file-data")))

(defn- check-headers [headers primary-key design-type]
  (let [header-diff     (set/difference (set primary-key) (set headers))
        invalid-headers (seq (remove #(re-matches #"^[a-zA-Z_][a-zA-Z0-9_]*$" (name %)) headers))]
    (when (seq header-diff)
      (pu/init-throw  (str "The required header field(s) "
                           (as-> header-diff h
                             (map #(-> % name str/upper-case) h)
                             (str/join "', '" h)
                             (str/replace h #"visible_" design-type)
                             (str "'" h "'"))
                           " are missing.")))
    (when invalid-headers
      (pu/init-throw  (str "One or more headers contains invalid characters: '"
                           (str/join "', '" (map #(-> % name str/upper-case) invalid-headers))
                           "'")))))

(defn- load-external-data! [project-id distribution file-name file-base64 design-type primary-key]
  (when (#{"csv" "shp"} distribution)
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

(defn- split-ext [row ext-key main-keys]
  (assoc (select-keys row main-keys)
         ext-key
         (tc/clj->jsonb (apply dissoc row main-keys))))

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
    (check-sample-limits sample-count
                         350000.0
                         (/ sample-count plot-count)
                         200.0)
    ;; TODO check for samples with no plots - OR - ensure that PG errors pass through.
    (map (fn [s]
           (-> s
               (assoc :plot_rid (get plot-keys (:plotid s)))
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
    (check-plot-limits (count ext-plots)
                       50000.0)
    (map (fn [p]
           (-> p
               (assoc :project_rid project-id)
               (split-ext :extra_plot_info [:project_rid :visible_id :plot_geom])))
         ext-plots)))

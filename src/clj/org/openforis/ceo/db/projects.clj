(ns org.openforis.ceo.db.projects
  (:import java.text.SimpleDateFormat
           java.util.Date
           java.util.UUID)
  (:require [clojure.string     :as str]
            [clojure.set        :as set]
            [clojure.java.io    :as io]
            [clojure.java.shell :as sh]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.utils.part-utils      :as pu]
            [org.openforis.ceo.database :refer [call-sql sql-primitive]]
            [org.openforis.ceo.views    :refer [data-response]]))

;;; Constants

(def tmp-dir  (System/getProperty "java.io.tmpdir"))
(def path-env (System/getenv "PATH"))

;;; Auth Functions

(defn- check-auth-common [user-id project-id token-key sql-query]
  (or (and token-key
           (= token-key (:token_key (first (call-sql "select_project_by_id" {:log? false} project-id)))))
      (sql-primitive (call-sql sql-query {:log? false} user-id project-id))))

(defn can-collect? [user-id project-id token-key]
  (check-auth-common user-id project-id token-key "can_user_collect_project"))

(defn is-proj-admin? [user-id project-id token-key]
  (check-auth-common user-id project-id token-key "can_user_edit_project"))

;;; Data Functions

(def default-options {:showGEEScript       false
                      :showPlotInformation false
                      :autoLaunchGeoDash   true})

(defn- get-project-list [sql-results]
  (mapv (fn [project]
          {:id            (:project_id project)
           :institution   (:institution_id project) ; TODO legacy variable name, update to institutionId
           :imageryId     (:imagery_id project)
           :availability  (:availability project)
           :name          (:name project)
           :description   (:description project)
           :privacyLevel  (:privacy_level project)
           :numPlots      (:num_plots project)
           :boundary      (:boundary project)
           :editable      (:editable project)
           :validBoundary (:valid_boundary project)}) ; TODO set the visibility or availability for projects with invalid bounds so they dont show in the list in the first place
        sql-results))

;; TODO These long project lists do not need all of those values returned.
;; TODO Match the SQL function and returned values for each query separately
(defn get-all-projects [{:keys [params]}]
  (let [user-id        (:userId params -1)
        institution-id (tc/val->int (:institutionId params))]
    (data-response (get-project-list (cond
                                       (= -1 user-id institution-id)
                                       (call-sql "select_all_projects")

                                       (and (neg? user-id) (pos? institution-id))
                                       (call-sql "select_all_institution_projects" institution-id)

                                       (and (pos? user-id) (neg? institution-id))
                                       (call-sql "select_all_user_projects" user-id)

                                       :else
                                       (call-sql "select_institution_projects_with_roles"
                                                 user-id
                                                 institution-id))))))

(defn get-template-projects [{:keys [params]}]
  (let [user-id (:userId params -1)]
    (data-response (mapv (fn [{:keys [project_id name]}]
                           {:id   project_id
                            :name name})
                         (call-sql "select_template_projects" user-id)))))

(defn get-project-by-id [{:keys [params]}]
  (let [user-id    (:userId params -1)
        project-id (tc/val->int (:projectId params))
        project    (first (call-sql "select_project_by_id" project-id))]
    (data-response {:id                 (:project_id project) ; TODO dont return known values
                    :institution        (:institution_id project) ; TODO legacy variable name, update to institutionId
                    :imageryId          (:imagery_id project)
                    :availability       (:availability project)
                    :name               (:name project)
                    :description        (:description project)
                    :privacyLevel       (:privacy_level project)
                    :boundary           (:boundary project)
                    :plotDistribution   (:plot_distribution project)
                    :numPlots           (:num_plots project)
                    :plotSpacing        (:plot_spacing project)
                    :plotShape          (:plot_shape project)
                    :plotSize           (:plot_size project)
                    :sampleDistribution (:sample_distribution project)
                    :samplesPerPlot     (:samples_per_plot project)
                    :sampleResolution   (:sample_resolution project)
                    :allowDrawnSamples  (:allow_drawn_samples project)
                    :sampleValues       (tc/jsonb->clj (:survey_questions project)) ; TODO why don't these names match
                    :surveyRules        (tc/jsonb->clj (:survey_rules project))
                    :projectOptions     (merge default-options (tc/jsonb->clj (:options project)))
                    :createdDate        (str (:created_date project))
                    :publishedDate      (str (:published_date project))
                    :closedDate         (str (:closed_date project))
                    :isProjectAdmin     (is-proj-admin? user-id project-id nil)})))

(defn get-template-by-id [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        project (first (call-sql "select_project_by_id" project-id))]
    (data-response {:imageryId          (:imagery_id project)
                    :name               (:name project)
                    :description        (:description project)
                    :boundary           (:boundary project)
                    :plotDistribution   (:plot_distribution project)
                    :numPlots           (:num_plots project)
                    :plotSpacing        (:plot_spacing project)
                    :plotShape          (:plot_shape project)
                    :plotSize           (:plot_size project)
                    :sampleDistribution (:sample_distribution project)
                    :samplesPerPlot     (:samples_per_plot project)
                    :sampleResolution   (:sample_resolution project)
                    :allowDrawnSamples  (:allow_drawn_samples project)
                    :sampleValues       (tc/jsonb->clj (:survey_questions project)) ; TODO why don't these names match
                    :surveyRules        (tc/jsonb->clj (:survey_rules project))
                    :projectOptions     (merge default-options (tc/jsonb->clj (:options project)))})))

(defn get-project-stats [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        stats      (first (call-sql "select_project_statistics" project-id))]
    (data-response {:flaggedPlots    (:flagged_plots stats)
                    :analyzedPlots   (:assigned_plots stats) ;TODO why don't these variable match? unanalyzed is not a word, but unassigned is.
                    :unanalyzedPlots (:unassigned_plots stats)
                    :members         (:members stats)
                    :contributors    (:contributors stats)
                    :createdDate     (str (:created_date stats))
                    :publishedDate   (str (:published_date stats))
                    :closedDate      (str (:closed_date stats))
                    :userStats       (tc/jsonb->clj (:user_stats stats))})))

;;; Create/Update Common

(defn- get-first-public-imagery []
  (sql-primitive (call-sql "select_first_public_imagery")))

;; TODO use bulk insert statement
(defn- insert-project-imagery [project-id imagery-list]
  (doseq [imagery imagery-list]
    (call-sql "insert_project_imagery" project-id imagery)))

;;; Create Project

(defn- init-throw [message]
  (throw (ex-info message {:causes [message]})))

(defn- try-catch-throw [try-fn message]
  (try (try-fn)
       (catch Exception e
         (let [causes (conj (:causes (ex-data e) []) message)]
           (throw (ex-info message {:causes causes}))))))

;; Check plot limits

(defn- count-gridded-points [left bottom right top spacing]
  (let [x-range (- right left)
        y-range (- top bottom)
        x-steps (+ (Math/floor (/ x-range spacing)) 1)
        y-steps (+ (Math/floor (/ y-range spacing)) 1)]
    (* x-steps y-steps)))

(defn- count-gridded-sample-set [plot-size sample-resolution]
  (Math/pow (Math/floor (/ plot-size sample-resolution)) 2))

(defn- check-plot-limits [plots plot-limit samples-per-plot per-plot-limit sample-limit]
  (cond
    (= 0 plots)
    (init-throw "You cannot create a project with 0 plots.")

    (= 0 samples-per-plot)
    (init-throw "You cannot create a project with 0 samples per plot.")

    (> plots plot-limit)
    (init-throw (str "This action will create "
                     plots
                     " plots. The maximum allowed for the selected plot distribution is "
                     plot-limit
                     "."))

    (> samples-per-plot per-plot-limit)
    (init-throw (str "This action will create "
                     samples-per-plot
                     " samples per plot. The maximum allowed for the selected sample distribution is "
                     per-plot-limit
                     "."))

    (> (* plots samples-per-plot) sample-limit)
    (init-throw (str "This action will create "
                     (* plots samples-per-plot)
                     " total samples. The maximum allowed for the selected distribution types is "
                     sample-limit
                     "."))))

;; Geo JSON

(defn- make-geo-json-point [lon lat]
  (tc/clj->jsonb {:type        "Point"
                  :coordinates [lon lat]}))

(defn- make-geo-json-polygon [lon-min lat-min lon-max lat-max]
  (tc/clj->jsonb {:type        "Polygon"
                  :coordinates [[[lon-min lat-min]
                                 [lon-min lat-max]
                                 [lon-max lat-max]
                                 [lon-max lat-min]
                                 [lon-min lat-min]]]}))

;; Create random and gridded points

(defn- random-with-buffer [side size buffer]
  (+ side
     (* (Math/floor (* (Math/random) size (/ buffer))) buffer)
     (/ buffer 2.0)))

(defn- distance [x1 y1 x2 y2]
  (Math/sqrt (+ (Math/pow (- x2 x1) 2.0)
                (Math/pow (- y2 y1) 2.0))))

(defn- pad-bounds [left bottom right top buffer]
  [(+ left buffer) (+ bottom buffer) (- right buffer) (- top buffer)])

;; TODO Use postGIS so arbitrary bounds can be uploaded
(defn- create-random-points-in-bounds [left bottom right top num-points]
  (let [x-range (- right left)
        y-range (- top bottom)
        buffer  (/ x-range 50.0)]
    (->> (repeatedly (fn [] [(random-with-buffer left x-range buffer) (random-with-buffer bottom y-range buffer)]))
         (take num-points)
         (map #(pu/EPSG:3857->4326 %)))))

;; TODO Use postGIS so arbitrary bounds can be set
(defn- create-gridded-points-in-bounds [left bottom right top spacing]
  (let [x-range   (- right left)
        y-range   (- top bottom)
        x-steps   (Math/floor (/ x-range spacing))
        y-steps   (Math/floor (/ y-range spacing))
        x-padding (/ (- x-range (* x-steps spacing)) 2.0)
        y-padding (/ (- y-range (* y-steps spacing)) 2.0)]
    (->> (for [x (range (+ 1 x-steps))
               y (range (+ 1 y-steps))]
           [(+ (* x spacing) left x-padding) (+ (* y spacing) bottom y-padding)])
         (map #(pu/EPSG:3857->4326 %)))))

;; TODO Use postGIS so can be done with shp files
(defn- create-random-sample-set [plot-center plot-shape plot-size samples-per-plot]
  (let [[center-x center-y] (pu/EPSG:4326->3857 plot-center)
        radius (/ plot-size 2.0)
        left   (- center-x radius)
        right  (+ center-x radius)
        top    (+ center-y radius)
        bottom (- center-y radius)
        buffer (/ radius 50.0)]
    (if (= "circle" plot-shape)
      (->> (repeatedly (fn [] [(random-with-buffer left plot-size buffer) (random-with-buffer bottom plot-size buffer)]))
           (take (* 10 samples-per-plot)) ; just as a safety net, so no thread can get stuck
           (filter (fn [[x y]]
                     (< (distance center-x center-y x y)
                        (- radius (/ buffer 2.0)))))
           (take samples-per-plot)
           (map #(pu/EPSG:3857->4326 %)))
      (create-random-points-in-bounds left bottom right top samples-per-plot))))

(defn- create-gridded-sample-set [plot-center plot-shape plot-size sample-resolution]
  (if (>= sample-resolution plot-size)
    [plot-center]
    (let [[center-x center-y] (pu/EPSG:4326->3857 plot-center)
          radius  (/ plot-size 2.0)
          left    (- center-x radius)
          bottom  (- center-y radius)
          steps   (Math/floor (/ plot-size sample-resolution))
          padding (/ (- plot-size (* steps sample-resolution)) 2.0)]
      (->> (for [x (range (+ 1 steps))
                 y (range (+ 1 steps))]
             [(+ (* x sample-resolution) left padding) (+ (* y sample-resolution) bottom padding)])
           (filter (fn [[x y]] (or (= "square" plot-shape)
                                   (< (distance center-x center-y x y) radius))))
           (map #(pu/EPSG:3857->4326 %))))))

;; Upload files

(defn find-file-by-ext [folder-name ext]
  (->> (io/file folder-name)
       (file-seq)
       (map #(.getName %))
       (remove #(= folder-name %))
       (filter #(= ext (peek (str/split % #"\."))))
       (first)))

(defn format-simple
  "Use any char after % for format."
  [f-str & args]
  (apply format (str/replace f-str #"(%[^ ])" "%s") args))

(defn parse-as-sh-cmd
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

(defn sh-wrapper [dir env & commands]
  (sh/with-sh-dir dir
    (sh/with-sh-env (merge {:PATH path-env} env)
      (doseq [cmd commands]
        (let [{:keys [exit err]} (apply sh/sh (parse-as-sh-cmd cmd))]
          (when-not (= 0 exit)
            (init-throw err)))))))

(defn sh-wrapper-pipe
  ([dir env cmd1 cmd2]
   (sh/with-sh-dir dir
     (sh/with-sh-env (merge {:PATH path-env} env)
       (let [{:keys [exit err]} (apply sh/sh (conj (parse-as-sh-cmd cmd2)
                                                   :in
                                                   (:out (apply sh/sh (parse-as-sh-cmd cmd1)))))]
         (when-not (= 0 exit)
           (init-throw err)))))))

(defn- type-columns [headers]
  (->> headers
       (map #(str % (cond
                      (#{"LON" "LAT"} %)         " float"
                      (#{"PLOTID" "SAMPLEID"} %) " integer"
                      :else                      " text")))
       (str/join ",")))

(defn- get-csv-headers [ext-file must-include]
  (let [data (slurp ext-file)]
    (if-let [header-row (re-find #".+(?=\n)" data)]
      (let [headers (as-> header-row hr
                      (str/split hr #",")
                      (mapv #(-> %
                                 (str/upper-case)
                                 (str/replace #"-| |," "_")
                                 (str/replace #"X|LONGITUDE|LONG|CENTER_X" "LON")
                                 (str/replace #"Y|LATITUDE|CENTER_Y" "LAT"))
                            hr))]
        (if (every? (set headers) must-include)
          (do
            (spit ext-file (str/replace-first data header-row (str/join "," headers)))
            (type-columns headers))
          (init-throw (str "Error while checking headers. Fields must include LON,LAT,"
                           (str/join "," must-include)
                           ".\n"))))
      (init-throw "CSV File is empty.\n"))))

(defn- load-external-data [distribution project-id ext-file type must-include]
  (let [folder-name (str tmp-dir "/ceo-tmp-" project-id "/")]
    (try-catch-throw #(if (= "shp" distribution)
                        (do (sh-wrapper folder-name {} (str "7z e -y " ext-file " -o" type))
                            (let [table-name (str "project_" project-id "_" type "_shp")
                                  shp-name   (find-file-by-ext (str folder-name type) "shp")]
                              (sh-wrapper-pipe (str folder-name type)
                                               {:PASSWORD "ceo"}
                                               (format-simple "shp2pgsql -s 4326 -t 2D %1 ext_tables.%2"
                                                              shp-name table-name)
                                               (format-simple "psql -h localhost -U ceo -d ceo"))
                              table-name))
                        ;; TODO Explore loading CSVs with a bulk insert
                        (let [table-name (str "project_" project-id "_" type "_csv")]
                          (call-sql "create_new_table"
                                    table-name
                                    (get-csv-headers ext-file must-include))
                          (sh-wrapper folder-name
                                      {:PASSWORD "ceo"}
                                      (format-simple "psql -h localhost -U ceo -d ceo -c `\\copy ext_tables.%1 FROM %2 DELIMITER ',' CSV HEADER`"
                                                     table-name ext-file))
                          (call-sql "add_index_col" table-name) ; Add index for reference
                          table-name))
                     "Error importing file into SQL.\n")))

(defn- check-load-ext [distribution project-id ext-file type must-include]
  (when (#{"csv" "shp"} distribution)
    (try-catch-throw (fn []
                       (let [table (load-external-data distribution
                                                       project-id
                                                       ext-file
                                                       type
                                                       must-include)]
                         (try-catch-throw #(if (= "plots" type)
                                             (call-sql "select_partial_table_by_name" table)
                                             (call-sql "select_partial_sample_table_by_name" table))
                                          (str (str/capitalize type) " " distribution " file failed to load.\n"))
                         table))
                     (if (= "csv" distribution)
                       (str "Malformed " type " CSV. Fields must include LON,LAT," (str/join "," must-include) " columns.\n")
                       (str "Malformed "
                            type
                            " Shapefile. All features must be of type polygon and include "
                            (str/join "," must-include)
                            " field(s).\n")))))

(defn- create-project-samples [plot-id
                               sample-distribution
                               plot-center
                               plot-shape
                               plot-size
                               samples-per-plot
                               sample-resolution]
  ;; TODO Right now you have to have a sample shape or csv file if you have a plot shape file.
  ;;      Update create random / gridded to work on boundary so any plot type can have random and gridded.
  (doseq [[x y] (case sample-distribution
                  "center"
                  [plot-center]

                  "random"
                  (create-random-sample-set plot-center plot-shape plot-size samples-per-plot)

                  "gridded"
                  (create-gridded-sample-set plot-center plot-shape plot-size sample-resolution)

                  [])]
    (call-sql "create_project_plot_sample"
              {:log? false}
              plot-id
              (make-geo-json-point x y))))

(defn- create-project-plots [project-id
                             lon-min
                             lat-min
                             lon-max
                             lat-max
                             plot-distribution
                             num-plots
                             plot-spacing
                             plot-shape
                             plot-size
                             sample-distribution
                             samples-per-plot
                             sample-resolution
                             plots-file
                             samples-file
                             allow-drawn-samples?]
  (if (#{"csv" "shp"} plot-distribution)
    (do (try-catch-throw  #(call-sql "update_project_tables"
                                     project-id
                                     (check-load-ext plot-distribution project-id plots-file "plots" ["PLOTID"])
                                     (check-load-ext sample-distribution project-id samples-file "samples" ["PLOTID" "SAMPLEID"]))
                          "SQL Error: cannot update project table.")
        (try-catch-throw #(call-sql "cleanup_project_tables" project-id plot-size)
                         "SQL Error: cannot clean external tables.")
        (let [counts           (try-catch-throw #(first (call-sql "ext_table_count" project-id))
                                                "SQL Error: cannot count data.")
              ext-plot-count   (:plot_count counts)
              ext-sample-count (:sample_count counts)]
          (check-plot-limits ext-plot-count
                             50000.0
                             (case sample-distribution
                               "gridded" (count-gridded-sample-set plot-size sample-resolution)
                               "random"  samples-per-plot
                               "center"  1.0
                               "none"    1.0
                               (/ ext-sample-count ext-plot-count))
                             200.0
                             350000.0))
        (if (#{"csv" "shp"} sample-distribution)
          (try-catch-throw #(call-sql "samples_from_plots_with_files" project-id)
                           "Error importing samples file after importing plots file.")
          (try-catch-throw #(doseq [plot (call-sql "add_file_plots" project-id)]
                              (create-project-samples (:plot_uid plot)
                                                      sample-distribution
                                                      [(:lon plot) (:lat plot)]
                                                      plot-shape
                                                      plot-size
                                                      samples-per-plot
                                                      sample-resolution))
                           "Error adding plot file with generated samples."))
        ;; The SQL function only checks against plots with external tables.
        (when (not allow-drawn-samples?)
          (let [bad-plots (map :plot_id (call-sql "plots_missing_samples" project-id))]
            (when (seq bad-plots)
              (init-throw (str "The uploaded plot and sample files do not have correctly overlapping data. "
                               (count bad-plots)
                               " plots have no samples. The first 10 are: ["
                               (str/join "," (take 10 bad-plots))
                               "]"))))))
    (let [[[left bottom] [top right]] (pu/EPSG:4326->3857 [lon-min lat-min] [lon-max lat-max])
          [left bottom right top] (pad-bounds left bottom top right (/ 2.0 plot-size))]
      (check-plot-limits (if (= "gridded" plot-distribution)
                           (count-gridded-points left bottom right top plot-spacing)
                           num-plots)
                         5000.0
                         (case sample-distribution
                           "gridded" (count-gridded-sample-set plot-size sample-resolution)
                           "random"  samples-per-plot
                           "center"  1.0
                           "none"    1.0)
                         200.0
                         50000.0)
      ;; TODO use bulk insert, or use postGIS to generate points.
      (doseq [plot-center (if (= "gridded" plot-distribution)
                            (create-gridded-points-in-bounds left bottom right top plot-spacing)
                            (create-random-points-in-bounds left bottom right top num-plots))]
        (let [plot-id (sql-primitive (call-sql "create_project_plot"
                                               {:log? false}
                                               project-id
                                               (make-geo-json-point (first plot-center) (second plot-center))))]
          (create-project-samples plot-id
                                  sample-distribution
                                  plot-center
                                  plot-shape
                                  plot-size
                                  samples-per-plot
                                  sample-resolution)))))
  (call-sql "update_project_counts" project-id)
  (when-not (sql-primitive (call-sql "valid_project_boundary" project-id))
    (init-throw (str "The project boundary is invalid. "
                     "This can come from improper coordinates or projection when uploading shape or csv data."))))

(defn create-project [{:keys [params]}]
  (let [institution-id       (tc/val->int (:institutionId params))
        imagery-id           (or (:imageryId params nil) (get-first-public-imagery))
        name                 (:name params)
        description          (:description params)
        privacy-level        (:privacyLevel params)
        lon-min              (tc/val->double (:lonMin params))
        lat-min              (tc/val->double (:latMin params))
        lon-max              (tc/val->double (:lonMax params))
        lat-max              (tc/val->double (:latMax params))
        boundary             (make-geo-json-polygon lon-min
                                                    lat-min
                                                    lon-max
                                                    lat-max)
        plot-distribution    (:plotDistribution params)
        num-plots            (tc/val->int (:numPlots params))
        plot-spacing         (tc/val->float (:plotSpacing params))
        plot-shape           (:plotShape params)
        plot-size            (tc/val->float (:plotSize params))
        sample-distribution  (:sampleDistribution params)
        samples-per-plot     (tc/val->int (:samplesPerPlot params))
        sample-resolution    (tc/val->float (:sampleResolution params))
        allow-drawn-samples? (or (= sample-distribution "none")
                                 (tc/val->bool (:allowDrawnSamples params)))
        survey-questions     (tc/clj->jsonb (:surveyQuestions params))
        survey-rules         (tc/clj->jsonb (:surveyRules params))
        project-options      (tc/clj->jsonb (:projectOptions params default-options))
        project-template     (tc/val->int (:projectTemplate params))
        use-template-plots   (tc/val->bool (:useTemplatePlots params))
        use-template-widgets (tc/val->bool (:useTemplateWidgets params))
        plot-file-name       (:plotFileName params)
        plot-file-base64     (:plotFileBase64 params)
        sample-file-name     (:sampleFileName params)
        sample-file-base64   (:sampleFileBase64 params)
        token-key            (str (UUID/randomUUID))
        project-id           (sql-primitive (call-sql "create_project"
                                                      institution-id
                                                      name
                                                      description
                                                      privacy-level
                                                      imagery-id
                                                      boundary
                                                      plot-distribution
                                                      num-plots
                                                      plot-spacing
                                                      plot-shape
                                                      plot-size
                                                      sample-distribution
                                                      samples-per-plot
                                                      sample-resolution
                                                      allow-drawn-samples?
                                                      survey-questions
                                                      survey-rules
                                                      token-key
                                                      project-options))]
    (try
      (if-let [imagery-list (:projectImageryList params)]
        (insert-project-imagery project-id imagery-list)
        (call-sql "add_all_institution_imagery" project-id))
      ;; TODO this can be a simple SQL query once we drop the dashboard ID
      (when (and (pos? project-template) use-template-widgets)
        (let [new-uuid (tc/str->pg-uuid (str (UUID/randomUUID)))]
          (doseq [{:keys [widget]} (call-sql "get_project_widgets_by_project_id" project-template)]
            (call-sql "add_project_widget"
                      project-id
                      new-uuid
                      widget))))
      (if (and (pos? project-template) use-template-plots)
        (call-sql "copy_template_plots" project-template project-id)
        (let [write-dir    (str tmp-dir "/ceo-tmp-" project-id "/")
              plots-file   (and (#{"csv" "shp"} plot-distribution)
                                (str write-dir
                                     (pu/write-file-part-base64 plot-file-name
                                                                plot-file-base64
                                                                write-dir
                                                                (str "project-" project-id "-plots"))))
              samples-file (and (#{"csv" "shp"} sample-distribution)
                                (str write-dir
                                     (pu/write-file-part-base64 sample-file-name
                                                                sample-file-base64
                                                                write-dir
                                                                (str "project-" project-id "-samples"))))]
          (create-project-plots project-id
                                lon-min
                                lat-min
                                lon-max
                                lat-max
                                plot-distribution
                                num-plots
                                plot-spacing
                                plot-shape
                                plot-size
                                sample-distribution
                                samples-per-plot
                                sample-resolution
                                plots-file
                                samples-file
                                allow-drawn-samples?)))
      (data-response {:projectId project-id
                      :tokenKey  token-key})
      (catch Exception e
        (try (call-sql "delete_project" project-id))
        (data-response (if-let [causes (:causes (ex-data e))]
                         (str/join "\n" causes)
                         "Unknown server error."))))))

;;; Update Status

(defn reset-collected-samples [project-id]
  (let [project (first (call-sql "select_project_by_id" project-id))
        sample-distribution  (:sample_distribution project)
        allow-drawn-samples? (:allow_drawn_samples project)]
    (cond
      (not allow-drawn-samples?)
      (call-sql "delete_user_plots_by_project" project-id)

      (#{"shp" "csv"} sample-distribution)
      (do
        ;; TODO this can be done more efficiently.  Update when we update how external data is stored.
        (call-sql "delete_all_samples_by_project" project-id)
        (call-sql "delete_user_plots_by_project"  project-id)
        (call-sql "samples_from_plots_with_files" project-id))

      :else
      (let [plot-shape        (:plot_shape project)
            plot-size         (tc/val->float (:plot_size project))
            samples-per-plot  (tc/val->int (:samples_per_plot project))
            sample-resolution (tc/val->float (:sample_resolution project))]
        (doseq [{:keys [plot_id lon lat]} (call-sql "get_deleted_user_plots_by_project" project-id)]
          (create-project-samples plot_id
                                  sample-distribution
                                  [lon lat]
                                  plot-shape
                                  plot-size
                                  samples-per-plot
                                  sample-resolution))))))

;;; Update Project

(defn update-project [{:keys [params]}]
  (let [project-id       (tc/val->int (:projectId params))
        imagery-id       (or (:imageryId params nil) (get-first-public-imagery))
        name             (:name params)
        description      (:description params)
        privacy-level    (:privacyLevel params)
        survey-questions (tc/clj->jsonb (:surveyQuestions params))
        survey-rules     (tc/clj->jsonb (:surveyRules params))
        project-options  (tc/clj->jsonb (:projectOptions params default-options))
        original-project (first (call-sql "select_project_by_id" project-id))]
    (if original-project
      (do
        (call-sql "update_project"
                  project-id
                  name
                  description
                  privacy-level
                  imagery-id
                  survey-questions
                  survey-rules
                  project-options)
        (when-let [imagery-list (:projectImageryList params)]
          (call-sql "delete_project_imagery" project-id)
          (insert-project-imagery project-id imagery-list))
        (when (or (not= survey-questions (:survey_questions original-project))
                  (not= survey-rules (:survey_rules original-project)))
          (reset-collected-samples project-id))
        (data-response ""))
      (data-response (str "Project " project-id "  not found.")))))

(defn update-project [{:keys [params]}]
  (let [project-id           (tc/val->int (:projectId params))
        imagery-id           (or (:imageryId params nil) (get-first-public-imagery))
        name                 (:name params)
        description          (:description params)
        privacy-level        (:privacyLevel params)
        survey-questions     (tc/clj->jsonb (:surveyQuestions params))
        survey-rules         (tc/clj->jsonb (:surveyRules params))
        project-options      (tc/clj->jsonb (:projectOptions params default-options))
        original-project     (first (call-sql "select_project_by_id" project-id))]
    (if original-project
      (do
        (call-sql "update_project"
                  project-id
                  name
                  description
                  privacy-level
                  imagery-id
                  survey-questions
                  survey-rules
                  project-options)
        (when-let [imagery-list (:projectImageryList params)]
          (call-sql "delete_project_imagery" project-id)
          (insert-project-imagery project-id imagery-list))
        (when (or (not= survey-questions (:survey_questions original-project))
                  (not= survey-rules (:survey_rules original-project)))
          (reset-collected-samples project-id))
        (data-response ""))
      (data-response (str "Project " project-id "  not found.")))))

(defn publish-project [{:keys [params]}]
  (let [project-id   (tc/val->int (:projectId params))
        clear-saved? (tc/val->bool (:clearSaved params))]
    (when clear-saved? (reset-collected-samples project-id))
    (call-sql "publish_project" project-id)
    (data-response "")))

(defn close-project [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))]
    (call-sql "close_project" project-id)
    (data-response "")))

(defn archive-project [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))]
    (call-sql "archive_project" project-id)
    (data-response "")))

;;; Dump Data common

(defn- csv-quotes [string]
  (if (and (string? string) (str/includes? string ","))
    (str "\"" string "\"")
    string))

(defn- prefix-keys [prefix in-map]
  (pu/mapm (fn [[key val]]
             [(str prefix (name key)) val])
           in-map))

(defn map->csv [row-map key-set default]
  (reduce (fn [acc cur]
            (conj acc (csv-quotes (get row-map cur default))))
          []
          key-set))

(defn- get-sample-keys
  "Returns different key combinations for old/new projects"
  [sample-value-group]
  (let [first-group (first sample-value-group)]
    (cond
      (:name first-group)
      [:name :values :name]

      (:question first-group)
      [:question :answers :answer]

      :else
      [])))

;; TODO should we write a SQL update to convert all these old sample values once and be able to drop this code?
(defn- get-sample-value-translations
  "This translate old question answers (index) into new question:answer"
  [sample-value-group]
  (let [[a b c] (get-sample-keys sample-value-group)
        first-group      (first sample-value-group)
        first-group-name (get first-group a)]
    (->> (get first-group b)
         (reduce (fn [acc cur]
                   (assoc acc (:id cur) (str first-group-name ":" (name (get cur c)))))))))

(defn- prepare-file-name [project-name data-type]
  (str/join "-"
            ["ceo"
             (str/replace project-name #"[ |,]" "-")
             data-type
             "data"
             (.format (SimpleDateFormat. "YYYY-MM-dd") (Date.))]))

;;; Dump Aggregate Data

(defn- get-value-distribution-headers
  "Returns a list of every question answer combo like
   (question1:answer1 question1:answer2 question2:answer1)"
  [sample-value-group]
  (let [[a b c] (get-sample-keys sample-value-group)]
    (->> sample-value-group
         (mapcat (fn [group]
                   (let [question-label (name (get group a))]
                     (map (fn [answer]
                            (str question-label ":" (name (get answer c))))
                          (get group b))))))))

(defn- count-answer [sample-size answers]
  (pu/mapm (fn [[question answers]]
             [question (* 100.0 (count answers) (/ sample-size))])
           (group-by str answers)))

(defn- get-value-distribution
  "Count the answers given, and return a map of {:'question:answers' count}"
  [samples sample-value-group]
  (if-let [first-sample-value (:value (first samples))]
    (count-answer (count samples)
                  (if (map? first-sample-value)
                    (mapcat (fn [sample]
                              (map (fn [[question-label answer]]
                                     (str (name question-label) ":" (:answer answer answer)))
                                   (:value sample)))
                            samples)
                    (let [sample-value-translations (get-sample-value-translations sample-value-group)]
                      (map (fn [sample] (get sample-value-translations (:value sample) "NoValue"))
                           samples))))
    {}))

(defn- get-ext-plot-headers
  "Gets external plot headers"
  [project-id]
  (->> (call-sql "get_plot_headers" project-id)
       (map :column_names)
       (remove #(#{"GID", "GEOM", "PLOT_GEOM", "LAT", "LON"} (str/upper-case %)))
       (mapv #(str "pl_" %))))

(def plot-key-names {:lon        :center_lon
                     :lat        :center_lat
                     :plot_size  :size_m
                     :plot_shape :shape
                     :assigned   :analyses})

(def plot-base-headers [:plot_id
                        :center_lon
                        :center_lat
                        :size_m
                        :shape
                        :flagged
                        :analyses
                        :sample_points
                        :email
                        :common_securewatch_date
                        :total_securewatch_dates])

; TODO why did we move collection_time and analysis duration to the sample level when they are plot details?
(defn dump-project-aggregate-data [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))]
    (if-let [project-info (first (call-sql "select_project_by_id" project-id))]
      (let [sample-value-group (tc/jsonb->clj (:survey_questions project-info)) ; TODO rename var
            text-headers       (concat plot-base-headers
                                       (get-ext-plot-headers project-id))
            number-headers     (get-value-distribution-headers sample-value-group)
            headers-out        (str/join "," (map #(-> % name csv-quotes) (concat text-headers number-headers)))
            data-rows          (map (fn [row]
                                      (let [samples       (tc/jsonb->clj (:samples row))
                                            ext-plot-data (tc/jsonb->clj (:ext_plot_data row))]
                                        (str/join ","
                                                  (concat (map->csv (merge (-> row
                                                                               (dissoc :samples
                                                                                       :analysis_duration
                                                                                       :collection_time)
                                                                               (assoc  :sample_points
                                                                                       (count samples))
                                                                               (update :collection_time str)
                                                                               (update :flagged pos?)
                                                                               (set/rename-keys plot-key-names))
                                                                           (prefix-keys "pl_" ext-plot-data))
                                                                    text-headers
                                                                    "")
                                                          (map->csv (get-value-distribution samples
                                                                                            sample-value-group)
                                                                    number-headers
                                                                    0)))))
                                    (call-sql "dump_project_plot_data" project-id))]
        {:headers {"Content-Type" "text/csv"
                   "Content-Disposition" (str "attachment; filename="
                                              (prepare-file-name (:name project-info) "plot")
                                              ".csv")}
         :body (str/join "\n" (conj data-rows headers-out))})
      (data-response "Project not found."))))

(defn- get-ext-sample-headers
  "Gets external sample headers"
  [project-id]
  (->> (call-sql "get_sample_headers" project-id)
       (map :column_names)
       (remove #(#{"GID", "GEOM", "LAT", "LON", "SAMPLE_GEOM"} (str/upper-case %)))
       (map #(str "smpl_" %))))

(defn- extract-answers [value sample-value-trans]
  (if value
    (if (ffirst value)
      (reduce (fn [acc [k v]] (merge acc {(name k) (:answer v)})) {} value)
      (let [[q a] (str/split (sample-value-trans value) #":")]
        {q a}))
    ""))

(def sample-key-names {:assigned :analyses})

;; TODO why did we move collection_time and analysis duration to the sample level when they are plot details?
(def sample-base-headers [:plot_id
                          :sample_id
                          :lon
                          :lat
                          :flagged
                          :analyses
                          :email
                          :collection_time
                          :analysis_duration
                          :imagery_title
                          :imagery_attributions
                          :sample_geom])

;; TODO collection_time analysis_duration imagery_title imagery_attributes are not really "optional" anymore
;;      They are a part of every project for a year now, I think we should just leave them in.
(defn dump-project-raw-data [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))]
    (if-let [project-info (first (call-sql "select_project_by_id" project-id))]
      (let [sample-value-group (tc/jsonb->clj (:survey_questions project-info)) ; TODO rename var
            sample-value-trans (get-sample-value-translations sample-value-group)
            question-key       (first (get-sample-keys sample-value-group))
            text-headers       (concat sample-base-headers
                                       (get-ext-plot-headers project-id)
                                       (get-ext-sample-headers project-id)
                                       (map question-key sample-value-group))
            headers-out        (str/join "," (map #(-> % name csv-quotes) text-headers))
            data-rows          (map (fn [row]
                                      (let [value           (tc/jsonb->clj (:value row))
                                            ext-plot-data   (tc/jsonb->clj (:ext_plot_data row))
                                            ext-sample-data (tc/jsonb->clj (:ext_sample_data row))
                                            format-time     #(when %
                                                               (.format (SimpleDateFormat. "YYYY-MM-dd HH:mm")
                                                                        %))]
                                        (str/join ","
                                                  (map->csv (merge (-> row
                                                                       (dissoc :value :confidence)
                                                                       (update :collection_time format-time)
                                                                       (update :flagged pos?)
                                                                       (update :analysis_duration #(when % (str % " secs")))
                                                                       (set/rename-keys sample-key-names))
                                                                   (prefix-keys "pl_" ext-plot-data)
                                                                   (prefix-keys "smpl_" ext-sample-data)
                                                                   (extract-answers value sample-value-trans))
                                                            text-headers
                                                            ""))))
                                    (call-sql "dump_project_sample_data" project-id))]
        {:headers {"Content-Type" "text/csv"
                   "Content-Disposition" (str "attachment; filename="
                                              (prepare-file-name (:name project-info) "sample")
                                              ".csv")}
         :body (str/join "\n" (conj data-rows headers-out))})
      (data-response "Project not found."))))

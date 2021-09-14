(ns collect-earth-online.db.projects
  (:import java.text.SimpleDateFormat
           java.util.Date
           java.util.UUID)
  (:require [clojure.string :as str]
            [triangulum.logging  :refer [log]]
            [triangulum.database :refer [call-sql
                                         sql-primitive
                                         p-insert-rows!
                                         insert-rows!]]
            [triangulum.type-conversion :as tc]
            [collect-earth-online.utils.part-utils :as pu]
            [collect-earth-online.views      :refer [data-response]]
            [collect-earth-online.utils.geom :refer [make-geo-json-polygon]]
            [collect-earth-online.generators.clj-point     :refer [generate-point-plots generate-point-samples]]
            [collect-earth-online.generators.external-file :refer [generate-file-plots generate-file-samples]]))

;;;
;;; Auth functions
;;;

(defn- check-auth-common [user-id project-id token-key sql-query]
  (or (and token-key
           (= token-key (:token_key (first (call-sql "select_project_by_id" {:log? false} project-id)))))
      (sql-primitive (call-sql sql-query {:log? false} user-id project-id))))

(defn can-collect? [user-id project-id token-key]
  (check-auth-common user-id project-id token-key "can_user_collect_project"))

(defn is-proj-admin? [user-id project-id token-key]
  (check-auth-common user-id project-id token-key "can_user_edit_project"))

;;;
;;; Get data functions
;;;

(def default-options {:showGEEScript       false
                      :showPlotInformation false
                      :collectConfidence   false
                      :autoLaunchGeoDash   true})

(def default-settings {:sampleGeometries {:points   true
                                          :lines    true
                                          :polygons true}})

(defn get-home-projects [{:keys [params]}]
  (data-response (mapv (fn [{:keys [project_id institution_id name description num_plots centroid editable]}]
                         {:id            project_id
                          :institutionId institution_id
                          :name          name
                          :description   description
                          :numPlots      num_plots
                          :centroid      centroid
                          :editable      editable})
                       (call-sql "select_user_home_projects" (:userId params -1)))))

(defn get-institution-projects [{:keys [params]}]
  (let [user-id        (:userId params -1)
        institution-id (tc/val->int (:institutionId params))]
    (data-response (mapv (fn [{:keys [project_id name privacy_level pct_complete num_plots]}]
                           {:id              project_id
                            :name            name
                            :numPlots        num_plots
                            :privacyLevel    privacy_level
                            :percentComplete pct_complete})
                         (call-sql "select_institution_projects" user-id institution-id)))))

(defn get-template-projects [{:keys [params]}]
  (let [user-id (:userId params -1)]
    (data-response (mapv (fn [{:keys [project_id name]}]
                           {:id   project_id
                            :name name})
                         (call-sql "select_template_projects" user-id)))))

(defn- build-project-by-id [user-id project-id]
  (let [project (first (call-sql "select_project_by_id" project-id))]
    {:id                 (:project_id project)     ; TODO dont return known values
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
     :surveyQuestions    (tc/jsonb->clj (:survey_questions project) [])
     :surveyRules        (tc/jsonb->clj (:survey_rules project) [])
     :projectOptions     (merge default-options (tc/jsonb->clj (:options project)))
     :designSettings     (merge default-settings (tc/jsonb->clj (:design_settings project)))
     :createdDate        (str (:created_date project))
     :publishedDate      (str (:published_date project))
     :closedDate         (str (:closed_date project))
     :hasGeoDash         (:has_geo_dash project)
     :isProjectAdmin     (is-proj-admin? user-id project-id nil)}))

(defn get-project-by-id [{:keys [params]}]
  (let [user-id    (:userId params -1)
        project-id (tc/val->int (:projectId params))]
    (data-response (build-project-by-id user-id project-id))))

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
                    :surveyQuestions    (tc/jsonb->clj (:survey_questions project) [])
                    :surveyRules        (tc/jsonb->clj (:survey_rules project) [])
                    :projectOptions     (merge default-options (tc/jsonb->clj (:options project)))
                    :designSettings     (merge default-settings (tc/jsonb->clj (:design_settings project)))})))

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

;;;
;;; Create project helper functions
;;;

(defn- get-first-public-imagery []
  (sql-primitive (call-sql "select_first_public_imagery")))

;; TODO use bulk insert statement
(defn- insert-project-imagery! [project-id imagery-list]
  (doseq [imagery imagery-list]
    (call-sql "insert_project_imagery" project-id imagery)))

;;;
;;; Create project
;;;

(defn- create-project-samples! [project-id
                                plot-shape
                                plot-size
                                sample-distribution
                                samples-per-plot
                                sample-resolution
                                sample-file-name
                                sample-file-base64
                                allow-drawn-samples?]
  (let [plots      (call-sql "get_plot_centers_by_project" project-id)
        plot-count (count plots)
        samples    (if (#{"csv" "shp"} sample-distribution)
                     (generate-file-samples plots
                                            plot-count
                                            project-id
                                            sample-distribution
                                            sample-file-name
                                            sample-file-base64)
                     (generate-point-samples plots
                                             plot-count
                                             plot-shape
                                             plot-size
                                             sample-distribution
                                             samples-per-plot
                                             sample-resolution))]
    (p-insert-rows! "samples" samples)
    (if allow-drawn-samples?
      (when (#{"csv" "shp"} sample-distribution)
        (p-insert-rows! "ext_samples" samples))
      (when-let [bad-plots (seq (map :visible_id (call-sql "plots_missing_samples" project-id)))]
        (pu/init-throw (str "The uploaded plot and sample files do not have correctly overlapping data. "
                            (count bad-plots)
                            " plots have no samples. The first 10 PLOTIDs are: ["
                            (str/join ", " (take 10 bad-plots))
                            "]"))))))

(defn- create-project-plots! [project-id
                              lon-min
                              lat-min
                              lon-max
                              lat-max
                              plot-distribution
                              num-plots
                              plot-spacing
                              plot-shape
                              plot-size
                              plot-file-name
                              plot-file-base64
                              sample-distribution
                              samples-per-plot
                              sample-resolution
                              sample-file-name
                              sample-file-base64
                              allow-drawn-samples?]
  ;; Create plots
  (let [plots (if (#{"csv" "shp"} plot-distribution)
                (generate-file-plots project-id
                                     plot-distribution
                                     plot-file-name
                                     plot-file-base64)
                (generate-point-plots project-id
                                      lon-min
                                      lat-min
                                      lon-max
                                      lat-max
                                      plot-distribution
                                      num-plots
                                      plot-spacing
                                      plot-size))]
    (insert-rows! "plots" plots))

  ;; Validate plots after insert
  (when (#{"csv" "shp"} plot-distribution)
    (pu/try-catch-throw #(call-sql "set_boundary"
                                   project-id
                                   (if (= plot-distribution "shp") 0 plot-size))
                        "SQL Error: cannot create a project AOI."))
  (when-not (sql-primitive (call-sql "valid_project_boundary" project-id))
    (pu/init-throw (str "The project boundary is invalid. "
                        "This can come from improper coordinates or projection when uploading shape or csv data.")))

  ;; Create samples from plots
  (create-project-samples! project-id
                           plot-shape
                           plot-size
                           sample-distribution
                           samples-per-plot
                           sample-resolution
                           sample-file-name
                           sample-file-base64
                           allow-drawn-samples?)

  ;; Final clean up
  (call-sql "update_project_counts" project-id))

(defn create-project! [{:keys [params]}]
  (let [institution-id       (tc/val->int (:institutionId params))
        imagery-id           (or (:imageryId params) (get-first-public-imagery))
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
        project-settings     (tc/clj->jsonb (:designSettings params default-settings))
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
                                                      project-options
                                                      project-settings))]
    (try
      ;; Create or copy plots
      (if (and (pos? project-template) use-template-plots)
        (call-sql "copy_template_plots" project-template project-id)
        (create-project-plots! project-id
                               lon-min
                               lat-min
                               lon-max
                               lat-max
                               plot-distribution
                               num-plots
                               plot-spacing
                               plot-shape
                               plot-size
                               plot-file-name
                               plot-file-base64
                               sample-distribution
                               samples-per-plot
                               sample-resolution
                               sample-file-name
                               sample-file-base64
                               allow-drawn-samples?))
      ;; Save project imagery
      (if-let [imagery-list (:projectImageryList params)]
        (insert-project-imagery! project-id imagery-list)
        (call-sql "add_all_institution_imagery" project-id)) ; API backwards compatibility
      ;; Copy template widgets
      ;; TODO this can be a simple SQL query once we drop the dashboard ID
      (when (and (pos? project-template) use-template-widgets)
        (let [new-uuid (tc/str->pg (str (UUID/randomUUID)) "uuid")]
          (doseq [{:keys [widget]} (call-sql "get_project_widgets_by_project_id" project-template)]
            (call-sql "add_project_widget"
                      project-id
                      new-uuid
                      widget))))
      ;; Return new ID and token
      (data-response {:projectId project-id
                      :tokenKey  token-key})
      (catch Exception e
        ;; Delete new project on error
        (try
          (call-sql "delete_project" project-id)
          (catch Exception _))
        (let [causes (:causes (ex-data e))]
          ;; Log unknown errors
          (when-not causes (log (ex-message e)))
          ;; Return error stack to user
          (data-response (if causes
                           (str "-" (str/join "\n-" causes))
                           "Unknown server error.")))))))

;;;
;;; Update project
;;;

(defn reset-collected-samples! [project-id]
  (let [project (first (call-sql "select_project_by_id" project-id))
        sample-distribution  (:sample_distribution project)
        allow-drawn-samples? (:allow_drawn_samples project)]
    (call-sql "delete_user_plots_by_project" project-id)
    ;; samples must also be deleted when allow-drawn-samples? because the user has drawn them.
    (cond
      (not allow-drawn-samples?)
      nil

      (#{"csv" "shp"} sample-distribution)
      (do
        (call-sql "delete_all_samples_by_project" project-id)
        (call-sql "copy_project_ext_samples" project-id))

      :else
      (let [plot-shape        (:plot_shape project)
            plot-size         (tc/val->float (:plot_size project))
            samples-per-plot  (tc/val->int (:samples_per_plot project))
            sample-resolution (tc/val->float (:sample_resolution project))]
        (call-sql "delete_all_samples_by_project" project-id)
        (create-project-samples! project-id
                                 plot-shape
                                 plot-size
                                 sample-distribution
                                 samples-per-plot
                                 sample-resolution
                                 nil
                                 nil
                                 allow-drawn-samples?)))))

(defn- exterior-ring [coords]
  (map (fn [[a b]] [(tc/val->double a) (tc/val->double b)])
       (first coords)))

(defn- same-ring? [[start1 :as ring1] ring2]
  (and (some #(= start1 %) ring2)
       (or (= ring1 ring2)
           (= ring1 (reverse ring2))
           (= ring1 (take (count ring1) (drop-while #(not= start1 %) (cycle (rest ring2)))))
           (= ring1 (take (count ring1) (drop-while #(not= start1 %) (cycle (reverse (rest ring2)))))))))

;; NOTE: This only works for polygons (and only compares their
;;       exterior rings). If you need to compare linestrings or points, you
;;       will need a different function.
(defn- same-polygon-boundary? [geom1 geom2]
  (and (= "polygon" (str/lower-case (:type geom1)) (str/lower-case (:type geom2)))
       (same-ring? (exterior-ring (:coordinates geom1))
                   (exterior-ring (:coordinates geom2)))))

(defn update-project! [{:keys [params]}]
  (let [project-id           (tc/val->int (:projectId params))
        imagery-id           (or (:imageryId params) (get-first-public-imagery))
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
        update-survey        (tc/val->bool (:updateSurvey params))
        project-options      (tc/clj->jsonb (:projectOptions params default-options))
        project-settings     (tc/clj->jsonb (:designSettings params default-settings))
        plot-file-name       (:plotFileName params)
        plot-file-base64     (:plotFileBase64 params)
        sample-file-name     (:sampleFileName params)
        sample-file-base64   (:sampleFileBase64 params)
        original-project     (first (call-sql "select_project_by_id" project-id))]
    (if original-project
      (try
        (when-let [imagery-list (:projectImageryList params)]
          (call-sql "delete_project_imagery" project-id)
          (insert-project-imagery! project-id imagery-list))
        (cond
          (not= "unpublished" (:availability original-project))
          nil

          (or (not= plot-distribution (:plot_distribution original-project))
              (if (#{"csv" "shp"} plot-distribution)
                plot-file-base64
                (or (not (same-polygon-boundary? (tc/jsonb->clj boundary) (tc/jsonb->clj (:boundary original-project))))
                    (not= num-plots    (:num_plots original-project))
                    (not= plot-shape   (:plot_shape original-project))
                    (not= plot-size    (:plot_size original-project))
                    (not= plot-spacing (:plot_spacing original-project)))))
          (do
            (call-sql "delete_plots_by_project" project-id)
            (create-project-plots! project-id
                                   lon-min
                                   lat-min
                                   lon-max
                                   lat-max
                                   plot-distribution
                                   num-plots
                                   plot-spacing
                                   plot-shape
                                   plot-size
                                   plot-file-name
                                   plot-file-base64
                                   sample-distribution
                                   samples-per-plot
                                   sample-resolution
                                   sample-file-name
                                   sample-file-base64
                                   allow-drawn-samples?))

          (or (not= sample-distribution (:sample_distribution original-project))
              (if (#{"csv" "shp"} sample-distribution)
                sample-file-base64
                (or (not= samples-per-plot (:samples_per_plot original-project))
                    (not= sample-resolution (:sample_resolution original-project)))))
          (do
            (call-sql "delete_all_samples_by_project" project-id)
            (create-project-samples! project-id
                                     plot-shape
                                     plot-size
                                     sample-distribution
                                     samples-per-plot
                                     sample-resolution
                                     sample-file-name
                                     sample-file-base64
                                     allow-drawn-samples?))

          ;; NOTE: Old stored questions can have a different format than when passed from the UI.
          ;;       This is why we check whether the survey questions are different on the front (for now).
          (or update-survey
              (and (:allow_drawn_samples original-project) (not allow-drawn-samples?)))
          (reset-collected-samples! project-id))
        (call-sql "update_project"
                  project-id
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
                  project-options
                  project-settings)
        (data-response "")
        (catch Exception e
          (let [causes (:causes (ex-data e))]
            ;; Log unknown errors
            (when-not causes (log (ex-message e)))
            ;; Return error stack to user
            (data-response (if causes
                             (str "-" (str/join "\n-" causes))
                             "Unknown server error.")))))
      (data-response (str "Project " project-id " not found.")))))

(defn publish-project! [{:keys [params]}]
  (let [user-id      (:userId params -1)
        project-id   (tc/val->int (:projectId params))
        clear-saved? (tc/val->bool (:clearSaved params))]
    (when clear-saved? (reset-collected-samples! project-id))
    (call-sql "publish_project" project-id)
    (data-response (build-project-by-id user-id project-id))))

(defn close-project! [{:keys [params]}]
  (let [user-id    (:userId params -1)
        project-id (tc/val->int (:projectId params))]
    (call-sql "close_project" project-id)
    (data-response (build-project-by-id user-id project-id))))

(defn archive-project! [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))]
    (call-sql "archive_project" project-id)
    (data-response "")))

;;;
;;; Dump data common helper functions
;;;

(defn- csv-quotes [string]
  (if (and (string? string) (str/includes? string ","))
    (str "\"" string "\"")
    string))

(defn- get-ext-headers
  "Gets external headers"
  [rows ext-key prefix]
  (->> rows
       (first)
       (ext-key)
       (tc/jsonb->clj)
       (keys)
       (mapv #(str prefix (name %)))))

(defn- prefix-keys [prefix in-map]
  (pu/mapm (fn [[key val]]
             [(str prefix (name key)) val])
           in-map))

(defn- map->csv [row-map key-set default]
  (reduce (fn [acc cur]
            (conj acc (csv-quotes (get row-map cur default))))
          []
          key-set))

(defn- prepare-file-name [project-name data-type]
  (str/join "-"
            ["ceo"
             (str/replace project-name #"[ |,]" "-")
             data-type
             "data"
             (.format (SimpleDateFormat. "YYYY-MM-dd") (Date.))]))

(defn- format-time [pg-time]
  (when pg-time
    (.format (SimpleDateFormat. "YYYY-MM-dd HH:mm")
             pg-time)))

;;;
;;; Dump aggregate
;;;

(defn- get-value-distribution-headers
  "Returns a list of every question answer combo like
   (question1:answer1 question1:answer2 question2:answer1)"
  [survey-questions]
  (->> survey-questions
       (mapcat (fn [group]
                 (let [question-label (name (get group :question))]
                   (map (fn [answer]
                          (str question-label ":" (name (get answer :answer))))
                        (get group :answers)))))))

(defn- count-answer [sample-size question-answers]
  (pu/mapm (fn [[question answers]]
             [question (* 100.0 (count answers) (/ sample-size))])
           (group-by str question-answers)))

(defn- get-value-distribution
  "Count the answers given, and return a map of {'question:answers' count}"
  [samples]
  (count-answer (count samples)
                (mapcat (fn [sample]
                          (map (fn [[question-label answer]]
                                 (str (name question-label) ":" (:answer answer)))
                               (:saved_answers sample)))
                        samples)))

(def plot-base-headers [:plot_id
                        :center_lon
                        :center_lat
                        :size_m
                        :shape
                        :sample_points
                        :email
                        :flagged
                        :flagged_reason
                        :confidence
                        :collection_time
                        :analysis_duration
                        :common_securewatch_date
                        :total_securewatch_dates])

(defn dump-project-aggregate-data! [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))]
    (if-let [project-info (first (call-sql "select_project_by_id" project-id))]
      (let [plots            (call-sql "dump_project_plot_data" project-id)
            survey-questions (tc/jsonb->clj (:survey_questions project-info))
            confidence?      (-> project-info
                                 (:options)
                                 (tc/jsonb->clj)
                                 (:collectConfidence))
            text-headers     (concat (pu/remove-vector-items plot-base-headers
                                                             (when-not confidence? :confidence))
                                     (get-ext-headers plots :extra_plot_info "pl_"))
            number-headers   (get-value-distribution-headers survey-questions)
            headers-out      (->> (concat text-headers number-headers)
                                  (map #(-> % name csv-quotes))
                                  (str/join ",")
                                  (str "\uFEFF")) ; Prefix headers with a UTF-8 tag
            data-rows        (map (fn [row]
                                    (let [samples         (tc/jsonb->clj (:samples row))
                                          extra-plot-info (tc/jsonb->clj (:extra_plot_info row))]
                                      (str/join ","
                                                (concat (map->csv (merge (-> row
                                                                             (assoc  :sample_points
                                                                                     (count samples))
                                                                             (update :collection_time format-time)
                                                                             (update :analysis_duration #(when % (str % " secs"))))
                                                                         (prefix-keys "pl_" extra-plot-info))
                                                                  text-headers
                                                                  "")
                                                        (map->csv (get-value-distribution samples)
                                                                  number-headers
                                                                  0)))))
                                  plots)]
        {:headers {"Content-Type" "text/csv"
                   "Content-Disposition" (str "attachment; filename="
                                              (prepare-file-name (:name project-info) "plot")
                                              ".csv")}
         :body (str/join "\n" (cons headers-out data-rows))})
      (data-response "Project not found."))))

;;;
;;; Dump raw
;;;

(defn- extract-answers [value]
  (if value
    (reduce (fn [acc [k v]] (merge acc {(name k) (:answer v)})) {} value)
    ""))

(def sample-base-headers [:plot_id
                          :sample_id
                          :lon
                          :lat
                          :email
                          :flagged
                          :collection_time
                          :analysis_duration
                          :imagery_title
                          :imagery_attributions
                          :sample_geom])

(defn dump-project-raw-data! [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))]
    (if-let [project-info (first (call-sql "select_project_by_id" project-id))]
      (let [samples          (call-sql "dump_project_sample_data" project-id)
            survey-questions (tc/jsonb->clj (:survey_questions project-info))
            text-headers     (concat sample-base-headers
                                     (get-ext-headers samples :extra_plot_info "pl_")
                                     (get-ext-headers samples :extra_sample_info "smpl_")
                                     (map :question survey-questions))
            headers-out      (->> text-headers
                                  (map #(-> % name csv-quotes))
                                  (str/join ",")
                                  (str "\uFEFF")) ; Prefix headers with a UTF-8 tag
            data-rows        (map (fn [row]
                                    (let [saved-answers     (tc/jsonb->clj (:saved_answers row))
                                          extra-plot-info   (tc/jsonb->clj (:extra_plot_info row))
                                          extra-sample-info (tc/jsonb->clj (:extra_sample_info row))]
                                      (str/join ","
                                                (map->csv (merge (-> row
                                                                     (update :collection_time format-time)
                                                                     (update :analysis_duration #(when % (str % " secs"))))
                                                                 (prefix-keys "pl_" extra-plot-info)
                                                                 (prefix-keys "smpl_" extra-sample-info)
                                                                 (extract-answers saved-answers))
                                                          text-headers
                                                          ""))))
                                  samples)]
        {:headers {"Content-Type" "text/csv"
                   "Content-Disposition" (str "attachment; filename="
                                              (prepare-file-name (:name project-info) "sample")
                                              ".csv")}
         :body (str/join "\n" (cons headers-out data-rows))})
      (data-response "Project not found."))))

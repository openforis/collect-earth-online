(ns collect-earth-online.db.projects
  (:import java.text.SimpleDateFormat
           java.util.Date
           java.util.UUID)
  (:require [clojure.java.io                               :as io]
            [clojure.set                                   :as set]
            [clojure.string                                :as str]
            [collect-earth-online.generators.clj-point     :refer [generate-point-plots generate-point-samples]]
            [collect-earth-online.generators.external-file :as external-file]
            [collect-earth-online.utils.geom               :refer [make-geo-json-polygon]]
            [collect-earth-online.utils.part-utils         :as pu]
            [triangulum.response                           :refer [data-response]]
            [triangulum.database                           :refer [call-sql
                                                                   insert-rows!
                                                                   p-insert-rows!
                                                                   sql-primitive]]
            [triangulum.logging                            :refer [log]]
            [triangulum.type-conversion                    :as tc]
            [triangulum.utils                              :as u]))

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
                                          :polygons true}
                       :userAssignment   {:userMethod "none"
                                          :users      []
                                          :percents   []}
                       :qaqcAssignment   {:qaqcMethod    "none"
                                          :percent       0
                                          :smes          []
                                          :timesToReview 2}})

(defn get-home-projects [{:keys [session]}]
  (data-response (mapv (fn [{:keys [project_id institution_id name description num_plots centroid editable]}]
                         {:id            project_id
                          :institutionId institution_id
                          :name          name
                          :description   description
                          :numPlots      num_plots
                          :centroid      centroid
                          :editable      editable})
                       (call-sql "select_user_home_projects" (:userId session -1)))))

(defn get-institution-projects [{:keys [params session]}]
  (let [user-id        (:userId session -1)
        institution-id (tc/val->int (:institutionId params))]
    (data-response (mapv (fn [{:keys [project_id name privacy_level pct_complete num_plots]}]
                           {:id              project_id
                            :name            name
                            :numPlots        num_plots
                            :privacyLevel    privacy_level
                            :percentComplete pct_complete})
                         (call-sql "select_institution_projects" user-id institution-id)))))

(defn get-institution-dash-projects [{:keys [params session]}]
  (let [user-id        (:userId session -1)
        institution-id (tc/val->int (:institutionId params))]
    (data-response (mapv (fn [{:keys [project_id name stats]}]
                           {:id    project_id
                            :name  name
                            :stats (-> stats
                                       (tc/jsonb->clj)
                                       (set/rename-keys {:total_plots      :totalPlots
                                                         :flagged_plots    :flaggedPlots
                                                         :analyzed_plots   :analyzedPlots
                                                         :partial_plots    :partialPlots
                                                         :unanalyzed_plots :unanalyzedPlots
                                                         :plot_assignments :plotAssignments
                                                         :users_assigned   :usersAssigned}))})
                         (call-sql "select_institution_dash_projects" user-id institution-id)))))

(defn get-template-projects [{:keys [params session]}]
  (let [user-id (:userId session -1)]
    (data-response (mapv (fn [{:keys [project_id name institution_id]}]
                           {:id            project_id
                            :name          name
                            :institutionId institution_id})
                         (call-sql "select_template_projects" user-id)))))

(defn- validate-survey-questions [survey-questions] 
  (let [raw (->> survey-questions vals (map :cardOrder))]
    (if (-> raw distinct count (= raw count))
      survey-questions
      (reduce-kv
       (fn [m k {:as survey-question}]
         (assoc m k  (assoc survey-question :cardOrder (Integer. k))))
       {}
       survey-questions)))) 

(defn- build-project-by-id [user-id project-id]
  (let [project (first (call-sql "select_project_by_id" project-id))]
    {:id                 (:project_id project) ; TODO dont return known values
     :institution        (:institution_id project) ; TODO legacy variable name, update to institutionId
     :imageryId          (:imagery_id project)
     :availability       (:availability project)
     :name               (:name project)
     :description        (:description project)
     :privacyLevel       (:privacy_level project)
     :boundary           (:boundary project) ;; Boundary is only used for Planet queries
     :aoiFeatures        (tc/jsonb->clj (:aoi_features project))
     :aoiFileName        (:aoi_file_name project)
     :plotDistribution   (:plot_distribution project)
     :numPlots           (:num_plots project)
     :plotSpacing        (:plot_spacing project)
     :plotShape          (:plot_shape project)
     :plotSize           (:plot_size project)
     :plotFileName       (:plot_file_name project)
     :shufflePlots       (:shuffle_plots project)
     :sampleDistribution (:sample_distribution project)
     :samplesPerPlot     (:samples_per_plot project)
     :sampleResolution   (:sample_resolution project)
     :sampleFileName     (:sample_file_name project)
     :allowDrawnSamples  (:allow_drawn_samples project)
     :surveyQuestions    (-> project :survey_questions
                             (tc/jsonb->clj []) validate-survey-questions)
     :surveyRules        (tc/jsonb->clj (:survey_rules project) [])
     :projectOptions     (merge default-options (tc/jsonb->clj (:options project)))
     :designSettings     (merge default-settings (tc/jsonb->clj (:design_settings project)))
     :createdDate        (str (:created_date project))
     :publishedDate      (str (:published_date project))
     :closedDate         (str (:closed_date project))
     :hasGeoDash         (:has_geo_dash project)
     :isProjectAdmin     (is-proj-admin? user-id project-id nil)}))

(defn get-project-by-id [{:keys [params session]}]
  (let [user-id    (:userId session -1)
        project-id (tc/val->int (:projectId params))]
    (data-response (build-project-by-id user-id project-id))))

(defn get-template-by-id [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        project    (first (call-sql "select_project_by_id" project-id))]
    (data-response {:imageryId                  (:imagery_id project)
                    :templateInstitutionId      (:institution_id project)
                    :name                       (:name project)
                    :description                (:description project)
                    :aoiFeatures                (tc/jsonb->clj (:aoi_features project))
                    :aoiFileName                (:aoi_file_name project)
                    :plotDistribution           (:plot_distribution project)
                    :numPlots                   (:num_plots project)
                    :plotSpacing                (:plot_spacing project)
                    :plotShape                  (:plot_shape project)
                    :plotSize                   (:plot_size project)
                    :plotFileName               (:plot_file_name project)
                    :sampleDistribution         (:sample_distribution project)
                    :samplesPerPlot             (:samples_per_plot project)
                    :sampleResolution           (:sample_resolution project)
                    :sampleFileName             (:sample_file_name project)
                    :allowDrawnSamples          (:allow_drawn_samples project)
                    :surveyQuestions            (tc/jsonb->clj (:survey_questions project) [])
                    :surveyRules                (tc/jsonb->clj (:survey_rules project) [])
                    :projectOptions             (merge default-options (tc/jsonb->clj (:options project)))
                    :designSettings             (merge default-settings (tc/jsonb->clj (:design_settings project)))})))

(defn get-project-stats [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        stats      (first (call-sql "select_project_statistics" project-id))]
    (data-response {:totalPlots      (:total_plots stats)
                    :plotAssignments (:plot_assignments stats)
                    :usersAssigned   (:users_assigned stats)
                    :flaggedPlots    (:flagged_plots stats)
                    :partialPlots    (:partial_plots stats)
                    :analyzedPlots   (:analyzed_plots stats)
                    :unanalyzedPlots (:unanalyzed_plots stats)
                    :userStats       (->> (:user_stats stats)
                                          (tc/jsonb->clj)
                                          (map #(set/rename-keys % {:timed_plots :timedPlots})))})))

;;;
;;; Create project helper functions
;;;

(defn- get-first-public-imagery []
  (sql-primitive (call-sql "select_first_public_imagery")))

;; TODO use bulk insert statement
(defn- insert-project-imagery! [project-id imagery-list]
  (doseq [imagery imagery-list]
    (call-sql "insert_project_imagery" project-id imagery)))

(defn- cycle-list [coll]
  (cons (last coll) (butlast coll)))

;;;
;;; Create project
;;;

(defn- ceil-percent [num percent]
  (Math/ceil (* num (/ percent 100))))

;; TODO consider returning plot_rid from get_plot_centers_by_project instead of passing in key.
(defn- add-users-to-plots [user-id users-plots plot-key]
  (map (fn [old-plot]
         {:plot_rid (get old-plot plot-key)
          :user_rid user-id})
       users-plots))

(defn- assign-users-by-file
  [file-assignments project-id]
  (->> file-assignments
       (map (fn [[user-email user-plots]]
              (let [user-id (:user_id (first (call-sql "get_user_by_email" user-email)))
                    plots   (call-sql "get_plots_by_visible_id" project-id (into-array user-plots))]
                (add-users-to-plots user-id plots :plot_id))))
       (flatten)))

(defn- equally-assign-users [plots users plot-key]
  (->> (partition-all (Math/ceil (/ (count plots) (count users)))
                      plots)
       (map (fn [user-id users-plots]
              (add-users-to-plots user-id users-plots plot-key))
            users)
       (apply concat)))

(defn- assign-user-plots
  "Assigns users to plots. The two assignment options are:
   {:userMethod \"equal\"
    :users      [4581 1 5]}}
   and
   {:userMethod \"percent\"
    :users      [4581 5 11]
    :percents   [50.0 25.0 25.0]}"
  [plots design-settings project-id]
  (let [{users           :users
         percents        :percents
         file-assignment :fileAssignments
         user-method     :userMethod} (:userAssignment design-settings)
        plot-count                   (count plots)]
    (case user-method
      "equal"   (equally-assign-users plots users :plot_id)
      "percent" (loop [rem-users    users
                       rem-percents percents
                       rem-plots    plots
                       user-plots   []]
                  (if (= 1 (count rem-users))
                    (concat user-plots
                            (add-users-to-plots (first rem-users) rem-plots :plot_id))
                    (let [num-plots (ceil-percent plot-count (first rem-percents))]
                      (recur (rest rem-users)
                             (rest rem-percents)
                             (drop num-plots rem-plots)
                             (concat user-plots (add-users-to-plots (first rem-users)
                                                                    (take num-plots rem-plots)
                                                                    :plot_id))))))
      "file"    (assign-users-by-file file-assignment project-id)
      nil)))

(defn- start-list-at
  "Creates a new collection removing the item that matches pred, starting the list at item + 1,
   and appending the beginning of the list on to the end."
  [pred coll]
  (loop [head coll
         tail []]
    (cond
      (empty? head)
      tail

      (pred (first head))
      (concat (rest head) tail)

      :else
      (recur (rest head)
             (conj tail (first head))))))

(defn- assign-qaqc
  "Assigns additional plots to users based on QA/QC method.  The two options are:
   {:qaqcMethod    \"overlap\"
    :percent       50
    :timesToReview 2}
   and
   {:qaqcMethod \"sme\"
    :percent    100
    :smes       [2 5]}"
  [assigned-plots design-settings project-id]
  (when (seq assigned-plots)
    (let [{qaqc-method     :qaqcMethod
           percent         :percent
           times-to-review :timesToReview
           file-assignment :fileAssignments
           smes            :smes} (:qaqcAssignment design-settings)
          {:keys [users]}         (:userAssignment design-settings)]
      (cond
        (= "none" qaqc-method) assigned-plots
        (= "file" qaqc-method) (concat
                                assigned-plots
                                (assign-users-by-file file-assignment project-id))
        (or (= "overlap" qaqc-method) (= "sme" qaqc-method))
        (concat assigned-plots
                (->> assigned-plots
                     (group-by :user_rid)
                     (map (fn [[user-id user-plots]]
                            [user-id (take (ceil-percent (count user-plots) percent)
                                           user-plots)]))
                     (reduce (fn [acc [user-id user-plots]]
                               (let [other-users (case qaqc-method
                                                   "overlap" (start-list-at #(= % user-id) users)
                                                   "sme"     smes
                                                   nil)]
                                 (loop [to-users     other-users
                                        cycles-left  (dec (or times-to-review 2))
                                        new-assigned acc]
                                   (if (pos? cycles-left)
                                     (recur (cycle-list to-users)
                                            (dec cycles-left)
                                            (concat new-assigned
                                                    (equally-assign-users user-plots
                                                                          to-users
                                                                          :plot_rid)))
                                     new-assigned))))
                             [])))))))

(defn- create-project-samples! [project-id
                                plot-shape
                                plot-size
                                sample-distribution
                                samples-per-plot
                                sample-resolution
                                sample-file-name
                                sample-file-base64
                                allow-drawn-samples?
                                plots]
  (let [plot-count (count plots)
        samples    (if (#{"csv" "shp"} sample-distribution)
                     (external-file/generate-file-samples plots
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
    (when (seq samples) (p-insert-rows! "samples" samples))
    (if allow-drawn-samples?
      (when (#{"csv" "shp"} sample-distribution)
        (p-insert-rows! "ext_samples" samples))
      (when-let [bad-plots (seq (map :visible_id (call-sql "plots_missing_samples" project-id)))]
        (pu/init-throw (str "The uploaded plot and sample files do not have correctly overlapping data. "
                            (count bad-plots)
                            " plots have no samples. The first 10 PLOTIDs are: ["
                            (str/join ", " (take 10 bad-plots))
                            "]"))))))

(defn- assign-plots [design-settings current-plots project-id]
  (when-let [assigned-plots (assign-user-plots current-plots design-settings project-id)]
    (p-insert-rows! "plot_assignments" (assign-qaqc assigned-plots design-settings project-id))))

(defn- copy-template-plots [project-id template-id design-settings]
  (call-sql "copy_template_plots" template-id project-id)
  (assign-plots design-settings (call-sql "get_plot_centers_by_project" project-id) project-id))

(defn- create-project-plots! [project-id
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
                              allow-drawn-samples?
                              shuffle-plots?
                              design-settings]
  ;; Create plots
  (let [plots (if (#{"csv" "shp"} plot-distribution)
                (external-file/generate-file-plots project-id
                                                   plot-distribution
                                                   plot-file-name
                                                   plot-file-base64)
                (generate-point-plots project-id
                                      plot-distribution
                                      num-plots
                                      plot-spacing
                                      plot-size
                                      shuffle-plots?))]
    (insert-rows! "plots" plots))

  ;; Boundary is only used for Planet at this point.
  (pu/try-catch-throw #(call-sql "set_boundary"
                                 project-id
                                 (if (= plot-distribution "shp") 0 plot-size))
                      "SQL Error: cannot create a project AOI.")

  (when (#{"csv" "shp"} plot-distribution) (call-sql "boundary_to_aoi" project-id))

  (when-not (sql-primitive (call-sql "valid_project_boundary" project-id))
    (pu/init-throw (str "The project boundary is invalid. "
                        "This can come from improper coordinates or projection when uploading shape or csv data.")))

  (let [saved-plots (call-sql "get_plot_centers_by_project" project-id)]
    (assign-plots design-settings saved-plots project-id)
    (create-project-samples! project-id
                             plot-shape
                             plot-size
                             sample-distribution
                             samples-per-plot
                             sample-resolution
                             sample-file-name
                             sample-file-base64
                             allow-drawn-samples?
                             saved-plots)))

(defn create-project! [{:keys [params]}]
  (let [institution-id       (tc/val->int (:institutionId params))
        imagery-id           (or (:imageryId params) (get-first-public-imagery))
        name                 (:name params)
        description          (:description params)
        privacy-level        (:privacyLevel params)
        aoi-features         (or (:aoiFeatures params)
                                 [(make-geo-json-polygon (tc/val->double (:lonMin params))
                                                         (tc/val->double (:latMin params))
                                                         (tc/val->double (:lonMax params))
                                                         (tc/val->double (:latMax params)))])
        aoi-file-name        (:aoiFileName params "")
        plot-distribution    (:plotDistribution params)
        num-plots            (tc/val->int (:numPlots params))
        plot-spacing         (tc/val->float (:plotSpacing params))
        plot-shape           (:plotShape params)
        plot-size            (tc/val->float (:plotSize params))
        shuffle-plots?       (tc/val->bool (:shufflePlots params))
        sample-distribution  (:sampleDistribution params)
        samples-per-plot     (tc/val->int (:samplesPerPlot params))
        sample-resolution    (tc/val->float (:sampleResolution params))
        allow-drawn-samples? (or (= sample-distribution "none")
                                 (tc/val->bool (:allowDrawnSamples params)))
        survey-questions     (tc/clj->jsonb (:surveyQuestions params))
        survey-rules         (tc/clj->jsonb (:surveyRules params))
        project-options      (tc/clj->jsonb (:projectOptions params default-options))
        design-settings      (:designSettings params default-settings)
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
                                                      (tc/clj->jsonb aoi-features)
                                                      aoi-file-name
                                                      plot-distribution
                                                      num-plots
                                                      plot-spacing
                                                      plot-shape
                                                      plot-size
                                                      plot-file-name
                                                      shuffle-plots?
                                                      sample-distribution
                                                      samples-per-plot
                                                      sample-resolution
                                                      sample-file-name
                                                      allow-drawn-samples?
                                                      survey-questions
                                                      survey-rules
                                                      token-key
                                                      project-options
                                                      (tc/clj->jsonb design-settings)))]
    (try
      ;; Create or copy plots
      (if (and (pos? project-template) use-template-plots)
        (copy-template-plots project-id project-template design-settings)
        (create-project-plots! project-id
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
                               allow-drawn-samples?
                               shuffle-plots?
                               design-settings))
      ;; Final clean up
      (call-sql "update_project_counts" project-id)

      ;; Save project imagery
      (if-let [imagery-list (:projectImageryList params)]
        (insert-project-imagery! project-id imagery-list)
        ;; API backwards compatibility
        (call-sql "add_all_institution_imagery" project-id))
      ;; Copy template widgets
      (when (and (pos? project-template) use-template-widgets)
        (call-sql "copy_project_widgets" project-template project-id))
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
                                 allow-drawn-samples?
                                 (call-sql "get_plot_centers_by_project" project-id))))))

(defn update-project! [{:keys [params]}]
  (let [project-id           (tc/val->int (:projectId params))
        imagery-id           (or (:imageryId params) (get-first-public-imagery))
        name                 (:name params)
        description          (:description params)
        privacy-level        (:privacyLevel params)
        aoi-features         (or (:aoiFeatures params)
                                 [(make-geo-json-polygon (tc/val->double (:lonMin params))
                                                         (tc/val->double (:latMin params))
                                                         (tc/val->double (:lonMax params))
                                                         (tc/val->double (:latMax params)))])
        aoi-file-name        (:aoiFileName params)
        plot-distribution    (:plotDistribution params)
        num-plots            (tc/val->int (:numPlots params))
        plot-spacing         (tc/val->float (:plotSpacing params))
        plot-shape           (:plotShape params)
        plot-size            (tc/val->float (:plotSize params))
        shuffle-plots?       (tc/val->bool (:shufflePlots params))
        sample-distribution  (:sampleDistribution params)
        samples-per-plot     (tc/val->int (:samplesPerPlot params))
        sample-resolution    (tc/val->float (:sampleResolution params))
        allow-drawn-samples? (or (= sample-distribution "none")
                                 (tc/val->bool (:allowDrawnSamples params)))
        survey-questions     (tc/clj->jsonb (:surveyQuestions params))
        survey-rules         (tc/clj->jsonb (:surveyRules params))
        project-options      (tc/clj->jsonb (:projectOptions params default-options))
        design-settings      (:designSettings params default-settings)
        plot-file-name       (:plotFileName params)
        plot-file-base64     (:plotFileBase64 params)
        sample-file-name     (:sampleFileName params)
        sample-file-base64   (:sampleFileBase64 params)
        original-project     (first (call-sql "select_project_by_id" project-id))]
    (if original-project
      (try
        (call-sql "update_project"
                  project-id
                  name
                  description
                  privacy-level
                  imagery-id
                  (tc/clj->jsonb aoi-features)
                  aoi-file-name
                  plot-distribution
                  num-plots
                  plot-spacing
                  plot-shape
                  plot-size
                  plot-file-name
                  shuffle-plots?
                  sample-distribution
                  samples-per-plot
                  sample-resolution
                  sample-file-name
                  allow-drawn-samples?
                  survey-questions
                  survey-rules
                  project-options
                  (tc/clj->jsonb design-settings))

        (when-let [imagery-list (:projectImageryList params)]
          (call-sql "delete_project_imagery" project-id)
          (insert-project-imagery! project-id imagery-list))

        (cond
          (not= "unpublished" (:availability original-project))
          nil

          (or (not= plot-distribution (:plot_distribution original-project))
              (if (#{"csv" "shp"} plot-distribution)
                plot-file-base64
                (or (not= aoi-features   (tc/jsonb->clj (:aoi_features original-project)))
                    (not= num-plots      (:num_plots original-project))
                    (not= plot-shape     (:plot_shape original-project))
                    (not= plot-size      (:plot_size original-project))
                    (not= plot-spacing   (:plot_spacing original-project))
                    (not= shuffle-plots? (:shuffle_plots original-project)))))
          (do
            (call-sql "delete_plots_by_project" project-id)
            (create-project-plots! project-id
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
                                   allow-drawn-samples?
                                   shuffle-plots?
                                   design-settings))

          :else
          (do
            ;; Always recreate samples or reset them
            (if (or (not= sample-distribution (:sample_distribution original-project))
                    (if (#{"csv" "shp"} sample-distribution)
                      sample-file-base64
                      (or (not= samples-per-plot (:samples_per_plot original-project))
                          (not= sample-resolution (:sample_resolution original-project)))))
              (do
                (call-sql "delete_user_plots_by_project" project-id)
                (call-sql "delete_all_samples_by_project" project-id)
                (create-project-samples! project-id
                                         plot-shape
                                         plot-size
                                         sample-distribution
                                         samples-per-plot
                                         sample-resolution
                                         sample-file-name
                                         sample-file-base64
                                         allow-drawn-samples?
                                         (call-sql "get_plot_centers_by_project" project-id)))
              (reset-collected-samples! project-id))
            ;; Redo assignments if they changed
            (when (not= design-settings (tc/jsonb->clj (:design_settings original-project)))
              (call-sql "delete_plot_assignments_by_project" project-id)
              (assign-plots design-settings (call-sql "get_plot_centers_by_project" project-id) project-id))))

        ;; Final clean up
        (call-sql "update_project_counts" project-id)
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

(defn publish-project! [{:keys [params session]}]
  (let [user-id      (:userId session -1)
        project-id   (tc/val->int (:projectId params))
        clear-saved? (tc/val->bool (:clearSaved params))]
    (when clear-saved? (reset-collected-samples! project-id))
    (call-sql "publish_project" project-id)
    (data-response (build-project-by-id user-id project-id))))

(defn close-project! [{:keys [params session]}]
  (let [user-id    (:userId session -1)
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

(defn- clean-str-quotes
  "Removes double quotes from string"
  [string]
  (if (and (string? string) (str/includes? string "\""))
    (str/replace string "\"" "")
    string))

(defn- csv-quotes
  "Surrounds string containing commas with double quotes otherwise remove all quotes"
  [string]
  (let [cleaned-str (clean-str-quotes string)]
    (if (and (string? string) (str/includes? string ","))
      (-> (str "\"" cleaned-str "\""))
      cleaned-str)))

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
  (u/mapm (fn [[key val]]
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

(defn- append-children [survey-questions questions]
  (reduce (fn [acc cur]
            (let [cur-id   (tc/val->int (get cur 0))
                  children (filter (fn [[_id question]] (= cur-id (:parentQuestionId question)))
                                   survey-questions)]
              (cond-> (conj acc cur)
                (seq children) (concat (append-children survey-questions children))
                :always        (vec))))
          []
          questions))

(defn- sort-questions [survey-questions]
  (append-children survey-questions
                   (->> survey-questions
                        (filter (fn [[_id question]]
                                  (= -1 (:parentQuestionId question))))
                        (sort-by #(get-in % [1 :cardOrder])))))

;;;
;;; Dump aggregate
;;;

(defn- get-value-distribution-headers
  "Returns a list of every question answer combo like
   (question1:answer1 question1:answer2 question2:answer1)"
  [survey-questions]
  (mapcat (fn [[_ {:keys [question answers]}]]
            (map (fn [[_ {:keys [answer]}]]
                   (str question ":" answer))
                 answers))
          survey-questions))

(defn- get-value-distribution
  "Count the answers given, and return a map of {'question:answers' count}"
  [survey-questions samples]
  (->> samples
       ;; Flatten answers from multiple samples into a single sequence.
       (mapcat (fn [sample]
                 (map (fn [[question-id {:keys [answerId answer]}]]
                        {:question-id question-id
                         :answer-id answerId
                         :answer-text answer})
                      (:saved_answers sample))))
       (group-by (juxt :question-id :answer-id))
       ;; Count number of answers in each group, or join free text answers.
       (u/mapm (fn [[[question-id answer-id] answer-group]]
                 (let [{:keys [question answers componentType]} (get survey-questions question-id)]
                   [(str question ":" (get-in answers [(str answer-id) :answer]))
                    (if (= "input" componentType)
                      (->> answer-group
                           (map :answer-text)
                           (distinct)
                           (str/join ";"))
                      (format "%.2f" (* 100.0 (count answer-group) (/ (count samples)))))])))))

(def plot-base-headers [:plotid
                        :center_lon
                        :center_lat
                        :shape
                        :size_m
                        :sample_points
                        :email
                        :flagged
                        :flagged_reason
                        :confidence
                        :collection_time
                        :analysis_duration
                        :common_securewatch_date
                        :total_securewatch_dates])

(defn plots->csv-response [project-info plots filename]
  (let [survey-questions (tc/jsonb->clj (:survey_questions project-info))
        confidence?      (-> project-info
                             (:options)
                             (tc/jsonb->clj)
                             (:collectConfidence))
        text-headers     (concat (pu/remove-vector-items plot-base-headers
                                                         (when-not confidence? :confidence))
                                 (get-ext-headers plots :extra_plot_info "pl_"))
        number-headers   (-> survey-questions (sort-questions) (get-value-distribution-headers))
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
                                                    (map->csv (get-value-distribution survey-questions samples)
                                                              number-headers
                                                              0)))))
                              plots)]
    {:headers {"Content-Type" "text/csv"
               "Content-Disposition" (str "attachment; filename="
                                          filename
                                          ".csv")}
     :body (str/join "\n" (cons headers-out data-rows))}))

(defn dump-project-aggregate-data! [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))]
    (if-let [project-info (first (call-sql "select_project_by_id" project-id))]
      (if (tc/val->bool (:qaqcOnly params))
        (plots->csv-response project-info
                             (call-sql "dump_project_plot_qaqc_data" project-id)
                             (prepare-file-name (:name project-info) "qaqc"))
        (plots->csv-response project-info
                             (call-sql "dump_project_plot_data" project-id)
                             (prepare-file-name (:name project-info) "plot")))
      (data-response "Project not found."))))

;;;
;;; Dump raw
;;;

(defn- extract-answers [survey-questions value]
  (if value
    (reduce (fn [acc [k v]]
              (let [{:keys [question answers]} (get survey-questions k)]
                (merge acc {question
                            (or (:answer v)
                                (get-in answers [(str (:answerId v)) :answer]))})))
            {}
            value)
    ""))

(def sample-base-headers [:plotid
                          :sampleid
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
                                     (->> survey-questions
                                          (sort-questions)
                                          (map (fn [[_ {:keys [question]}]] (or question "not-found")))))
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
                                                                 (extract-answers survey-questions saved-answers))
                                                          text-headers
                                                          ""))))
                                  samples)]
        {:headers {"Content-Type" "text/csv"
                   "Content-Disposition" (str "attachment; filename="
                                              (prepare-file-name (:name project-info) "sample")
                                              ".csv")}
         :body (str/join "\n" (cons headers-out data-rows))})
      (data-response "Project not found."))))

(defn create-shape-files!
  [{:keys [params]}]
  (let [project-id (:projectId params)
        zip-file (external-file/zip-shape-files project-id)
        file-name (last (str/split zip-file #"/"))]
    (if zip-file
      {:headers {"Content-Type" "application/zip"
                 "Content-Disposition" (str "attachment; filename=" file-name)}
       :body (io/file zip-file)
       :status 200}
      {:status 500
       :body "Error generating shape files."})))

(defn- file-user-assignment
  [plot-data]
  (let [user-plot-assignment  (reduce (fn [acc p]
                                        (update acc (:user p) #(conj % (:visible_id p)))) {} plot-data)
        plot-assignment-users (map :user_id (call-sql "get_users_by_emails" (into-array (keys user-plot-assignment))))]
    {:userMethod      "file"
     :users           plot-assignment-users
     :fileAssignments user-plot-assignment
     :percents        [0]}))

(defn- file-qaqc-assignment
  [plot-data]
  (let [file-assignment? (some #(:reviewers %) plot-data)
        qaqc-assignments (reduce (fn [acc {:keys [reviewers visible_id]}]
                                   (if (seq (first reviewers))
                                     (reduce (fn [ac r]
                                               (update ac r #(conj % visible_id))) acc reviewers)
                                     acc)) {} plot-data)
        qaqc-users       (when (seq qaqc-assignments)
                           (call-sql "get_users_by_emails" (into-array (keys qaqc-assignments))))]
    (if file-assignment?
      {:qaqcMethod      "file"
       :fileAssignments qaqc-assignments
       :reviewers       qaqc-users
       :smes            []
       :overlap         0}
      {:qaqcMethod "none"
       :smes       []
       :overlap    0})))

(defn- create-design-settings-from-file
  [plot-data]
  {:userAssignment (file-user-assignment plot-data)
   :qaqcAssignment (file-qaqc-assignment plot-data)})

(defn check-plot-csv
  [{:keys [params]}]
  (let [project-id       (tc/val->int (:projectId params))
        plot-file-name   (:plotFileName params)
        plot-file-base64 (:plotFileBase64 params)
        plots            (external-file/load-external-data! project-id
                                                            "csv"
                                                            plot-file-name
                                                            plot-file-base64
                                                            "plot"
                                                            [:visible_id])
        file-assignment? (some #(:user %) plots)
        updated-plots    (map (fn [row]
                                (if (:reviewers row)
                                  (update row :reviewers #(str/split (str/replace % #"\[|\]" "") #"\s+"))
                                  row))
                              plots)]
    (if file-assignment?
      (data-response (create-design-settings-from-file updated-plots))
      (data-response  {:userAssignment {:userMethod "none"
                                        :users      []
                                        :percents   [0]}
                       :qaqcAssignment {:qaqcMethod "none"
                                        :smes       []
                                        :overlap    0}}))))

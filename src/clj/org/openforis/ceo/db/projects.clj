(ns org.openforis.ceo.db.projects
  (:import java.text.SimpleDateFormat
           java.util.Date)
  (:require [clojure.string :as str]
            [clojure.set    :as set]
            [org.openforis.ceo.database :refer [call-sql sql-primitive]]
            [org.openforis.ceo.views    :refer [data-response]]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.utils.part-utils      :as pu]))

(defn- check-auth-common [params sql-query]
  (let [user-id    (:userId params -1)
        project-id (tc/str->int (:projectId params))
        token-key  (:tokenKey params)]
    ;; FIXME we need a middleware that sets non null tokenKey to the session
    (or (and token-key
             (= token-key (:token_key (first (call-sql "select_project" project-id)))))
        (call-sql sql-query user-id project-id))))

(defn can-collect? [{:keys [params]}]
  (data-response (check-auth-common params "can_user_collect")))

(defn is-proj-admin? [{:keys [params]}]
  (data-response (check-auth-common params "can_user_edit")))

;; TODO add settings that are new since we forked
(def default-options {:showGEEScript false})

(defn- single-project-object [project]
  {:id                   (:project_id project)
   :institution          (:institution_id project) ; TODO legacy variable name, update to institutionId
   :imageryId            (:imagery_id project)
   :availability         (:availability project)
   :name                 (:name project)
   :description          (:description project)
   :privacyLevel         (:privacy_level project)
   :boundary             (:boundary project)
   :plotDistribution     (:plot_distribution project)
   :numPlots             (:num_plots project)
   :plotSpacing          (:plot_spacing project)
   :plotShape            (:plot_shape project)
   :plotSize             (:plot_size project)
   :archived             (= "archived" (:availability project)) ; TODO this is no longer used
   :sampleDistribution   (:sample_distribution project)
   :samplesPerPlot       (:samples_per_plot project)
   :sampleResolution     (:sample_resolution project)
   :classification_times "" ; TODO this has never been used
   :editable             (:editable project)
   :validBoundary        (:valid_boundary project)
   :sampleValues         (tc/jsonb->clj (:survey_questions project)) ; TODO why dont these names match
   :surveyRules          (tc/jsonb->clj (:survey_rules project))
   :projectOptions       (or (tc/jsonb->clj (:options project)) default-options)})

(defn- get-project-list [sql-results]
  (mapv single-project-object
        sql-results))

;; TODO these long project lists do not need all of those values returned
(defn get-all-projects [{:keys [params]}]
  (let [user-id        (:userId params -1)
        institution-id (tc/str->int (:institutionId params))]
    (data-response (cond
                     (= -1 user-id institution-id)
                     (get-project-list (call-sql "select_all_projects"))

                     (and (neg? user-id) (pos? institution-id))
                     (get-project-list (call-sql "select_all_institution_projects"
                                                 institution-id))

                     (and (pos? user-id) (neg? institution-id))
                     (get-project-list (call-sql "select_all_user_projects"
                                                 user-id))

                     :else
                     (get-project-list (call-sql "select_institution_projects_with_roles"
                                                 user-id
                                                 institution-id))))))

(defn get-project-by-id [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))]
    (data-response (single-project-object (first (call-sql "select_project" project-id))))))

(defn get-project-stats [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        stats      (first (call-sql "select_project_statistics" project-id))]
    (data-response {:flaggedPlots    (:flagged_plots stats)
                    :analyzedPlots   (:assigned_plots stats) ;TODO why dont these variable match? unanalyzed is not a word, but unassigned is.
                    :unanalyzedPlots (:unassigned_plots stats)
                    :members         (:members stats)
                    :contributors    (:contributors stats)
                    :createdDate     (str (:created_date stats))
                    :publishedDate   (str (:published_date stats))
                    :closedDate      (str (:closed_date stats))
                    :userStats       (tc/jsonb->clj (:user_stats stats))})))

(defn publish-project [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))]
    (call-sql "publish_project" project-id)
    (data-response "")))

(defn close-project [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))]
    (call-sql "close_project" project-id)
    (data-response "")))

(defn archive-project [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))]
    (call-sql "archive_project" project-id)
    (data-response "")))

(defn- get-first-public-imagery []
  (sql-primitive (call-sql "select_first_public_imagery")))

;; TODO use bulk instert statement
(defn- insert-project-imagery [project-id imagery-list]
  (doseq [imagery imagery-list]
    (call-sql "insert_project_imagery" project-id imagery)))

(defn update-project [{:keys [params]}]
  (let [project-id      (tc/str->int (:projectId params))
        name            (:name params)
        description     (:description params)
        privacy-level   (:privacyLevel params)
        imagery-id      (or (:imageryId params nil) (get-first-public-imagery))
        project-options (tc/clj->jsonb (:projectOptions params default-options))]
    (call-sql "update_project" project-id name description privacy-level imagery-id project-options)
    (when-let [imagery-list (:projectImageryList params)]
      (call-sql "delete_project_imagery" project-id)
      (insert-project-imagery project-id imagery-list))
    (data-response "")))

(defn create-project [request])

;;; Dump Data common

(defn- comma->dash [string]
  (if (and (string? string))
    (str/replace string "," "-")
    string))

(defn- prefix-keys [suffix in-map]
  (pu/mapm (fn [[key val]]
             [(comma->dash (str suffix (name key))) (comma->dash val)])
           in-map))

(defn map->csv [in-map ks default]
  (reduce (fn [acc cur]
            (conj acc (comma->dash (get in-map cur default))))
          []
          ks))

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

(defn- get-sample-value-translations
  "This translate old question answers (index) into new question:answer"
  [sample-value-group]
  (let [[a b c] (get-sample-keys sample-value-group)
        first-group      (first sample-value-group)
        first-group-name (get first-group a)]
    (->> (get first-group b)
         (reduce (fn [acc cur]
                   (assoc acc (:id cur) (str first-group-name ":" (name (get cur c)))))))))

(defn- get-file-name [project-name data-type]
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
             [question (* 100.0 (count answers) (/ 1 sample-size))])
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
  (let [project-id (tc/str->int (:projectId params))]
    (if-let [project-info (first (call-sql "select_project" project-id))]
      (let [sample-value-group (tc/jsonb->clj (:survey_questions project-info)) ; TODO rename var
            text-headers       (concat plot-base-headers
                                       (get-ext-plot-headers project-id))
            number-headers     (get-value-distribution-headers sample-value-group)
            headers-out        (str/join "," (map #(-> % name comma->dash) (concat text-headers number-headers)))
            data-rows          (map (fn [row]
                                      (let [samples         (tc/jsonb->clj (:samples row))
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
                                              (get-file-name (:name project-info) "plot")
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
;; TODO collection_time analysis_duration imagery_title imagery_attributes are not really "optional" anymore
;;      They are a part of every project for a year now, I think we should just leave them in.
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
                          :imagery_attributions])

(defn dump-project-raw-data [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))]
    (if-let [project-info (first (call-sql "select_project" project-id))]
      (let [sample-value-group (tc/jsonb->clj (:survey_questions project-info)) ; TODO rename var
            sample-value-trans (get-sample-value-translations sample-value-group)
            text-headers       (concat sample-base-headers
                                       (get-ext-plot-headers project-id)
                                       (get-ext-sample-headers project-id)
                                       (map :question sample-value-group))
            headers-out        (str/join "," (map #(-> % name comma->dash) text-headers))
            data-rows          (map (fn [row]
                                      (let [value           (tc/jsonb->clj (:value row))
                                            ext-plot-data   (tc/jsonb->clj (:ext_plot_data row))
                                            ext-sample-data (tc/jsonb->clj (:ext_sample_data row))
                                            collection-time (.format (SimpleDateFormat. "YYYY-MM-dd HH:mm")
                                                                     (:collection_time row))]
                                        (str/join ","
                                                  (map->csv (merge (-> row
                                                                       (dissoc :value :confidence)
                                                                       (assoc  :collection_time collection-time)
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
                                              (get-file-name (:name project-info) "sample")
                                              ".csv")}
         :body (str/join "\n" (conj data-rows headers-out))})
      (data-response "Project not found."))))

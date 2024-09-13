(ns collect-earth-online.db.qaqc
  (:require [clojure.set                :as set]
            [clojure.data.json :refer [read-str]]
            [triangulum.database        :refer [call-sql]]
            [triangulum.response        :refer [data-response transit-response]]
            [triangulum.type-conversion :as tc]))

(defn- average [coll]
  (/ (tc/val->float (apply + coll))
     (count coll)))

(defn- jsonb->clj-str
  "Convert PG jsonb object to clj equivalent."
  [jsonb]
  (-> jsonb str (read-str)))

(defn- get-samples-answer-array [plot-id user-id]
  (map (fn [{:keys [saved_answers]}]
         (jsonb->clj-str saved_answers))
       (call-sql "select_plot_samples" {:log? false} plot-id user-id)))

(defn- get-survey-questions [project-id]
  (->> (call-sql "select_project_by_id" project-id)
       (first)
       (:survey_questions)
       (tc/jsonb->clj)))

(defn- users-samples->answers [users-samples question-id]
  (map (fn [sv]
         (map #(get-in % [question-id "answerId"])
              sv))
       users-samples))

(defn- sample-disagreement [& answers]
  (let [mode-count (as-> answers %
                     (frequencies %)
                     (assoc % nil 1)
                     (vals %)
                     (apply max %))]
    (if (= 1 mode-count)
      100.0
      (->> (/ mode-count
              (count answers))
           (- 1)
           (* 100.0)))))

(defn- question-disagreement [sample-answers]
  (if (every? #(every? nil? %) sample-answers)
    -1
    (->> sample-answers
         (apply map sample-disagreement)
         (average))))

(defn- disagreements-per-plot
  [plot-id survey-questions]
  (let [user-plots    (call-sql "select_user_plots_info" plot-id)
        users-samples (map (fn [user]
                             (get-samples-answer-array plot-id (:user_id user)))
                           user-plots)]

    (->> survey-questions
         (map (fn [[question-id sq]]
                (let [sample-answers (users-samples->answers users-samples question-id)]
                  (assoc sq
                         :questionId   (tc/val->int question-id)
                         :disagreement (if (= 1 (count user-plots))
                                         0
                                         (question-disagreement sample-answers))
                         :userPlotInfo (map (fn [user ans]
                                              {:userId     (:user_id user)
                                               :flagged    (:flagged user)
                                               :confidence (:confidence user)
                                               :answers    (-> (frequencies ans)
                                                               (dissoc nil))})
                                            user-plots
                                            sample-answers))))))))

(defn- average-plot-disagreement
  [project-id plot-ids]
  (let [survey-questions (get-survey-questions project-id)]
    (reduce (fn [acc p]
              (assoc acc (keyword (str (:visible_id p)))
                     (let [plot-disagreement (disagreements-per-plot (:plot_id p) survey-questions)
                           number-of-answers (count plot-disagreement)]
                       (/ (reduce (fn [acc plot-info]
                                    (+ acc (:disagreement plot-info))) 0 plot-disagreement)
                          number-of-answers))))
            {}
            plot-ids)))

(defn- get-plot-stats
  [project-id plot-id]
  (first (call-sql "get_plot_stats" project-id plot-id)))

(defn- get-plots-stats
  [project-id plot-ids]
  (map (fn [p]
         (assoc (get-plot-stats project-id (:visible_id p))
                :plot_id (:visible_id p)))
       plot-ids))

(defn get-plot-data
  [project-id]
  (let [project-plots     (call-sql "get_plot_ids" project-id)
        plot-disagreement (average-plot-disagreement project-id project-plots)
        plot-stats        (get-plots-stats project-id project-plots)]
    (map (fn [p]
           (assoc p :plot_disagreement (get plot-disagreement (keyword (str (:plot_id p))))))
         plot-stats)))

(defn get-project-stats
  [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        stats      (first (call-sql "select_project_stats" project-id))]
    (data-response {:totalPlots        (:total_plots stats)
                    :plotAssignments   (:plot_assignments stats)
                    :usersAssigned     (:users_assigned stats)
                    :flaggedPlots      (:flagged_plots stats)
                    :partialPlots      (:partial_plots stats)
                    :analyzedPlots     (:analyzed_plots stats)
                    :averageConfidence (:average_confidence stats)
                    :maxConfidence     (:max_confidence stats)
                    :minConfidence     (:min_confidence stats)
                    :unanalyzedPlots   (:unanalyzed_plots stats)
                    :plots             (get-plot-data project-id)
                    :userStats         (->> (:user_stats stats)
                                            (tc/jsonb->clj)
                                            (map #(set/rename-keys % {:timed_plots :timedPlots})))})))

(defn- prepare-samples-array [plot-id]
  (mapv (fn [{:keys [sample_id
                     sample_geom
                     saved_answers
                     visible_id
                     user_email
                     user_id
                     flagged
                     confidence]}]
          {:id           sample_id
           :sampleGeom   sample_geom
           :savedAnswers (tc/jsonb->clj saved_answers)
           :visibleId    visible_id
           :userEmail    user_email
           :flagged      flagged
           :confidence   confidence
           :userId       user_id})
        (call-sql "select_all_plot_samples" {:log? false} plot-id)))

(defn- build-qaqc-plot [plot-info]
  (let [{:keys [plot_id
                flagged
                confidence
                confidence_comment
                flagged_reason
                plot_geom
                extra_plot_info
                visible_id]} plot-info]
    {:id                plot_id
     :flagged           flagged
     :flaggedReason     (or flagged_reason "")
     :confidence        confidence
     :confidenceComment confidence_comment
     :visibleId         visible_id
     :plotGeom          plot_geom
     :extraPlotInfo     (tc/jsonb->clj extra_plot_info {})
     :samples           (prepare-samples-array plot_id)}))

(defn get-qaqc-plot
  [{:keys [params session]}]
  (let [direction      (:direction params "next")
        project-id     (tc/val->int (:projectId params))
        old-visible-id (tc/val->int (:visibleId params))
        user-id        (:userId session -1)
        proj-plots     (call-sql "select_analyzed_plots" project-id user-id true)
        grouped-plots  (group-by :visible_id proj-plots)
        sorted-plots   (->> grouped-plots
                             (sort-by first))
        plots-info     (case direction
                         "next"     (or 
                                     (->> sorted-plots
                                          (some (fn [[visible-id plots]]
                                                  (and (> visible-id old-visible-id)
                                                       plots))))
                                     (->> sorted-plots
                                          (first)
                                          (second)))
                         "previous" (or (->> sorted-plots
                                             (sort-by first #(compare %2 %1))
                                             (some (fn [[visible-id plots]]
                                                     (and (< visible-id old-visible-id)
                                                          plots))))
                                        (->> sorted-plots
                                             (last)
                                             (second)))
                         "id"       (some (fn [[visible-id plots]]
                                            (and (= visible-id old-visible-id)
                                                 plots))
                                          sorted-plots))]
    (if plots-info
      (try
        (data-response (first (map #(build-qaqc-plot %) plots-info)))
        (catch Exception _e
          (data-response "Unable to get the requested plot.  Please try again.")))
      (data-response "not-found"))))

(defn get-sot-example
  [{:keys [params]}]
  (let [project-id       (:projectId params)
        survey-questions (-> (call-sql "get_survey_questions" project-id)
                             (first)
                             (:survey_questions)
                             (tc/jsonb->clj))]
    (reduce-kv (fn [acc k v]
                 )
               {}
               survey-questions)))

(defn get-user-stats
  []
  (data-response "ok"))

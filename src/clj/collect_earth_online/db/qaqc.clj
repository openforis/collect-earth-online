(ns collect-earth-online.db.qaqc
  (:require [clojure.set                :as set]
            [clojure.data.json :refer [read-str]]
            [triangulum.database        :refer [call-sql]]
            [triangulum.response        :refer [data-response]]
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
  [project-id plot-id]
  (let [user_plots    (call-sql "select_user_plots_info" plot-id)
        users-samples (map (fn [user]
                             (get-samples-answer-array plot-id (:user_id user)))
                           user_plots)]
    (->> (get-survey-questions project-id)
         (map (fn [[question-id sq]]
                (let [sample-answers (users-samples->answers users-samples question-id)]
                  (assoc sq
                         :questionId   (tc/val->int question-id)
                         :disagreement (question-disagreement sample-answers)
                         :userPlotInfo (map (fn [user ans]
                                              {:userId     (:user_id user)
                                               :flagged    (:flagged user)
                                               :confidence (:confidence user)
                                               :answers    (-> (frequencies ans)
                                                               (dissoc nil))})
                                            user_plots
                                            sample-answers))))))))

(defn- average-plot-disagreement
  [project-id plot-ids]
  (for [p plot-ids]
    (let [plot-disagreement (disagreements-per-plot project-id p)
          number-of-answers (count plot-disagreement)]
      (/ (reduce (fn [acc plot-info]
                   (+ acc (:disagreement plot-info))) 0 plot-disagreement)
         number-of-answers))))

(defn- calculate-average-disagreement
  [project-id]
  (let [plot-ids [153618642 153618643]
        avg-plot-disagreement (average-plot-disagreement project-id plot-ids)]
    (/ (reduce + avg-plot-disagreement)
       (count plot-ids))))

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
                    :userStats         (->> (:user_stats stats)
                                            (tc/jsonb->clj)
                                            (map #(set/rename-keys % {:timed_plots :timedPlots})))})))

(defn- prepare-samples-array [plot-id]
  (mapv (fn [{:keys [sample_id sample_geom saved_answers visible_id]}]
          {:id           sample_id
           :sampleGeom   sample_geom
           :savedAnswers (tc/jsonb->clj saved_answers)
           :visibleId    visible_id})
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

(defn get-plot-info
  [{:keys [params session]}]
  (let [direction       (:direction params "next")
        project-id      (tc/val->int (:projectId params))
        old-visible-id  (tc/val->int (:visibleId params))
        user-id         (:userId session -1)
        proj-plots      (call-sql "select_analyzed_plots"   project-id user-id true)
        grouped-plots   (group-by :visible_id proj-plots)
        sorted-plots    (->> grouped-plots
                             (sort-by first))
        plots-info      (case direction
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
        (data-response (map #(build-plot % user-id true) plots-info))
        (catch Exception _e
          (data-response "Unable to get the requested plot.  Please try again.")))
      (data-response "not-found"))))


(defn get-plot-stats
  [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        answers    (map (fn [ans] (-> ans :saved_answers tc/jsonb->clj))
                        (call-sql "select_saved_answers" project-id))]
    ))

(defn get-user-stats
  []
  (data-response "ok"))

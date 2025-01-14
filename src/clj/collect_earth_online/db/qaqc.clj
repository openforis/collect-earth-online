(ns collect-earth-online.db.qaqc
  (:require [clojure.set                :as set]
            [clojure.data.json :refer [read-str]]
            [triangulum.database        :refer [call-sql]]
            [triangulum.response        :refer [data-response]]
            [triangulum.type-conversion :as tc]))

(defn- jsonb->clj-str
  "Convert PG jsonb object to clj equivalent."
  [jsonb]
  (-> jsonb str (read-str)))

(defn- get-samples-answer [plot-id]
  (apply merge-with merge
         (map (fn [sample]
                {(keyword (str (:user_id sample)))
                 {(keyword (str (:visible_id sample)))
                  (jsonb->clj-str (:saved_answers sample))}})
              (call-sql "select_plot_samples_qaqc" {:log? false} plot-id))))

(defn merge-sample-data
  "Merge answers from multiple users for each sample and question"
  [users-samples]
  (apply merge-with
         (fn [acc new]
           (merge-with into acc new))
         (map (fn [user-answers]
                (into {}
                      (map (fn [[sample-id answers]]
                             [sample-id
                              (into {}
                                    (map (fn [[q-id q-ans]]
                                           [q-id [(get q-ans "answer")]])
                                         answers))]))
                      user-answers))
              users-samples)))

(defn calculate-disagreement
  "Calculate disagreement percentage for each sample and question."
  [users-samples]
  (let [grouped (merge-sample-data users-samples)]
    (into {}
          (map (fn [[sample-id questions]]
                 [sample-id
                  (into {}
                        (map (fn [[question-id answers]]
                               (let [answer-freqs (frequencies answers)
                                     total-answers (count answers)
                                     max-freq (apply max (vals answer-freqs))]
                                 (cond
                                   (= total-answers 1)
                                   ;; if only one user answered, disagreement is 0%
                                   [question-id 0.0]
                                   (= (count answer-freqs) total-answers)
                                   ;; If all answers are different, disagreement is 100%
                                   [question-id 100.0]
                                   ;; Otherwise, calculate based on the most common answer
                                   :else [question-id (* 100 (- 1 (/ max-freq total-answers)))])))
                             questions))])
               grouped))))

(defn- disagreements-per-users-plot
  [plot-id]
  (let [plot-interpreters     (call-sql "select_user_plots_info" plot-id)
        users-samples         (get-samples-answer plot-id)
        samples-disagreements (calculate-disagreement (map (fn [[_ answers]] answers) users-samples))]
    {(keyword (str plot-id))
     {:samplesDisagreements samples-disagreements
      :usersPlotInfo         (mapv
                              (fn [user]
                                (let [user-id (:user_id user)
                                      answers (get users-samples (keyword (str user-id)))]
                                  (assoc user :answers answers)))
                              plot-interpreters)}}))

(defn- disagreement-in-plot?
  [samples-disagreements]
  (some #(> % 0)
        (mapcat vals (vals samples-disagreements))))

(defn get-plot-data
  [plot-stats]
  (let [plot-disagreement (first (vals (disagreements-per-users-plot (:internal_id plot-stats))))
        disagreement?     (disagreement-in-plot? (:samplesDisagreements plot-disagreement))]
    (-> plot-stats
        (assoc :disagreement disagreement?)
        (assoc :details plot-disagreement))))

(defn get-project-stats
  [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        proj-stats (first (call-sql "select_project_stats" project-id))
        plot-stats (call-sql "get_plot_stats" project-id)]
    (data-response {:totalPlots        (:total_plots proj-stats)
                    :plotAssignments   (:plot_assignments proj-stats)
                    :usersAssigned     (:users_assigned proj-stats)
                    :flaggedPlots      (:flagged_plots proj-stats)
                    :partialPlots      (:partial_plots proj-stats)
                    :analyzedPlots     (:analyzed_plots proj-stats)
                    :averageConfidence (:average_confidence proj-stats)
                    :maxConfidence     (:max_confidence proj-stats)
                    :minConfidence     (:min_confidence proj-stats)
                    :unanalyzedPlots   (:unanalyzed_plots proj-stats)
                    :plots             (map #(get-plot-data %) plot-stats)
                    :userStats         (->> (:user_stats proj-stats)
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

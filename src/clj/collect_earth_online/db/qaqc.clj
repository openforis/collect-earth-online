(ns collect-earth-online.db.qaqc
  (:require [clojure.set                :as set]
            [clojure.data.json :refer [read-str]]
            [triangulum.database        :refer [call-sql sql-primitive]]
            [triangulum.response        :refer [data-response]]
            [triangulum.type-conversion :as tc]))

(defn- jsonb->clj-str
  "Convert PG jsonb object to clj equivalent."
  [jsonb]
  (-> jsonb str (read-str)))

(defn- get-samples-answers [plot-id]
  (map (fn [{:keys [user_id sample_id visible_id saved_answers]}]
         {:user_id user_id
          :sample_id sample_id
          :visible_id visible_id
          :saved_answers (jsonb->clj-str saved_answers)})
       (call-sql "select_plot_samples_qaqc" {:log? false} plot-id)))

(defn get-correct-sot-answer
  [question-id sot-sample-answers]
  (get-in sot-sample-answers ["answers" question-id "correct_answer"]))

(defn calculate-avg-plot-disagreement
  [samples-disagreement]
  (let [disagreements-list (flatten (map :disagreements samples-disagreement))
        number-of-answers  (count disagreements-list)]
    (if (> number-of-answers 1)
      (/ (reduce (fn [acc d] (+ acc (first (vals d)))) 0 disagreements-list)
         number-of-answers)
      0)))

(defn calculate-question-disagreement
  [users-answers correct-answers ignore-questions]
  (let [ca-keys         (keys (get correct-answers "answers"))
        filtered-ca     (seq (set/difference (set ca-keys) (set ignore-questions)))
        correct-answers (map (fn [q]
                               [q (get-correct-sot-answer q correct-answers)])
                             filtered-ca)]
    (reduce (fn [acc user-answers]
              (conj acc (assoc user-answers
                               :disagreements
                               (map (fn [ca]
                                      (if (= (last ca)
                                             (get-in user-answers [:saved_answers (first ca) "answer"]))
                                        {(first ca) 0}
                                        {(first ca) 100}))
                                    correct-answers))))
            []
            users-answers)))

(defn calc-sample-disagreement
  [sample-id users-answers correct-answers ignore-questions]
  (let [correct-sample-answers (some #(when (= sample-id (get % "sample_id")) %) correct-answers)
        s-id                   sample-id
        sample-answers         (filter #(= s-id (:visible_id %)) users-answers)]
    (calculate-question-disagreement sample-answers correct-sample-answers ignore-questions)))

;;;;
;; Calculate disagreements by peer comparison
;;;;

(defn most-frequent-answers-per-sample
  [users-samples]
  (let [grouped-by-visible (group-by :visible_id users-samples)
        freq-count (fn [answers]
                     (let [freqs (frequencies answers)
                           [val count] (apply max-key val freqs)]
                       (if (= 1 count) nil val)))
        process-answers (fn [answers]
                          (apply merge-with into
                                 (map #(into {} (map (fn [[k v]] [k [(get v "answer")]])) (:saved_answers %)) answers)))
        format-answer (fn [answers] 
                        (into {} (map (fn [[k v]] [k {"correct_answer" (freq-count v)}]) answers)))]
    (map (fn [[visible-id answers]]
           {"sample_id" visible-id
            "answers" (format-answer (process-answers answers))})
         grouped-by-visible)))

(defn- calculate-peers-disagreement
  [users-answers ignore-questions]
  (let [correct-answers (most-frequent-answers-per-sample users-answers)
        samples         (set (map :visible_id users-answers))]
    (flatten
     (map (fn [sample-id]
            (calc-sample-disagreement sample-id users-answers correct-answers ignore-questions))
          samples))))

(defn plot-disagreement-by-peer
  [plot-stats ignore-questions]
  (let [plot-id           (:internal_id plot-stats)
        users-answers     (get-samples-answers plot-id)
        plot-disagreement (calculate-peers-disagreement users-answers ignore-questions)]
    (-> plot-stats
        (assoc :disagreement (calculate-avg-plot-disagreement plot-disagreement))
        (assoc-in [:details :usersPlotInfo] plot-disagreement))))

;;;;
;; Calculate disagreements using a souce of truth
;;;;

(defn calculate-sot-disagreement
  [users-answers sot ignore-questions]
  (let [samples (set (map :visible_id users-answers))]
    (flatten
     (map (fn [sample-id]
            (calc-sample-disagreement sample-id users-answers sot ignore-questions))
          samples))))

(defn plot-disagreement-by-sot
  [plot-stats sot ignore-questions]
  (let [plot-id           (:internal_id plot-stats)
        users-answers     (get-samples-answers plot-id)
        plot-disagreement (calculate-sot-disagreement users-answers sot ignore-questions)]
    (-> plot-stats
        (assoc :disagreement (calculate-avg-plot-disagreement plot-disagreement))
        (assoc-in [:details :usersPlotInfo] plot-disagreement))))

;;;;
;; Route handlers
;;;;

(defn disagreement-by-sot
  [{:keys [params]}]
  (let [project-id       (tc/val->int (:projectId params))
        sot-file-name    (:sotFileName params)
        sot-file-json    (map (fn [m]
                                (reduce-kv (fn [acc k v]
                                             (assoc acc (if (instance? clojure.lang.Named k) (name k) k) v))
                                           {} m))
                              (:sotFileJson params))
        plot-stats       (call-sql "get_plot_stats" project-id)
        proj-stats       (first (call-sql "select_project_stats" project-id))
        ignore-questions (map str (tc/jsonb->clj (sql-primitive (call-sql "get_input_question_ids" project-id))))]
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
                    :plots             (map #(plot-disagreement-by-sot % sot-file-json ignore-questions) plot-stats)
                    :userStats         (->> (:user_stats proj-stats)
                                            (tc/jsonb->clj)
                                            (map #(set/rename-keys % {:timed_plots :timedPlots})))})))

(defn get-project-stats
  [{:keys [params]}]
  (let [project-id       (tc/val->int (:projectId params))
        proj-stats       (first (call-sql "select_project_stats" project-id))
        plot-stats       (call-sql "get_plot_stats" project-id)
        ignore-questions (map str (tc/jsonb->clj (sql-primitive (call-sql "get_input_question_ids" project-id))))]
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
                    :plots             (map #(plot-disagreement-by-peer % ignore-questions) plot-stats)
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
  (let [project-id       (tc/val->int (:projectId params))
        survey-questions (-> (call-sql "get_survey_questions" project-id)
                             (first)
                             (:survey_questions)
                             (tc/jsonb->clj))
        project-samples (call-sql "get_samples" project-id)
        source-of-truth (reduce-kv (fn [acc k v]
                                     (let [correct-answer (-> v vals first vals first :answer)]
                                       (if (= "notes" (clojure.string/lower-case (:question v)))
                                         acc
                                         (assoc acc
                                                (keyword k)
                                                {:question_text  (:question v)
                                                 :correct_answer correct-answer}))))
                                   {}
                                   survey-questions)]
    (data-response
     (map #(assoc % :answers source-of-truth)
          project-samples))))

(defn disable-users
  [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        user-ids   (map tc/val->int (:userIds params))]
    (try
      (doall
       (map #(call-sql "disable_user_answers" % project-id) user-ids)
       (data-response {:message "successfull"}))
      (catch Exception e
        (data-response {:message "error" :status 500})))))

(defn enable-users
  [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        user-ids   (map tc/val->int (:userIds params))]
    (try
      (doall
       (map #(call-sql "enable_user_answers" % project-id) user-ids)
       (data-response {:message "successfull"}))
      (catch Exception e
        (data-response {:message "error" :status 500})))))

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
                    :unanalyzedPlots   (:unanalyzed_plots stats)
                    :userStats         (->> (:user_stats stats)
                                            (tc/jsonb->clj)
                                            (map #(set/rename-keys % {:timed_plots :timedPlots})))})))

(defn get-plot-stats
  [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        answers    (map (fn [ans] (-> ans :saved_answers tc/jsonb->clj))
                        (call-sql "select_saved_answers" project-id))]))

(defn get-user-stats
  []
  (data-response "ok"))

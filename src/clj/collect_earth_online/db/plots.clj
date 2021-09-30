(ns collect-earth-online.db.plots
  (:import java.sql.Timestamp)
  (:require [clojure.set :as set]
            [clojure.data.json :refer [read-str]]
            [triangulum.type-conversion :as tc]
            [triangulum.database :refer [call-sql sql-primitive]]
            [triangulum.utils    :refer [filterm]]
            [collect-earth-online.db.projects :refer [is-proj-admin?]]
            [collect-earth-online.views       :refer [data-response]]))

;;;
;;; Helpers
;;;

(defn- time-plus-five-min []
  (Timestamp. (+ (System/currentTimeMillis) (* 5 60 1000))))

;; TODO move to triangulum.type_conversion
(defn- jsonb->clj-str
  "Convert PG jsonb object to clj equivalent."
  [jsonb]
  (-> jsonb str (read-str)))

(defn- average [coll]
  (/ (tc/val->float (apply + coll))
     (count coll)))

;;;
;;; Project Level
;;;

;; TODO, CEO-32 update to only show users available plots
(defn get-project-plots [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        max-plots  (tc/val->int (:max params) 100000)] ; 100000 loads in ~1.5 seconds.
    (data-response (mapv (fn [{:keys [plot_id center flagged analyzed]}]
                           {:id       plot_id
                            :center   center
                            :flagged  flagged
                            :analyzed analyzed})
                         (call-sql "select_limited_project_plots" project-id max-plots)))))

(defn get-plotters
  "Gets all users that have collected plots on a project.  If optional plotId
   is passed, return results only for that plot."
  [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        plot-id    (tc/val->int (:plotId params))]
    (data-response (mapv (fn [{:keys [user_id email]}]
                           {:userId user_id :email email})
                         (call-sql "select_plotters" project-id plot-id)))))

;;;
;;; GeoDash
;;;

(defn get-plot-sample-geom [{:keys [params]}]
  (let [plot-id (tc/val->int (:plotId params))]
    (data-response (if-let [plot-geom (sql-primitive (call-sql "select_plot_geom" plot-id))]
                     {:plotGeom     plot-geom
                      :samplesGeoms (mapv :sample_geom
                                          (call-sql "select_plot_sample_geoms" plot-id))}
                     ""))))

;;;
;;; Plot Disagreement
;;;

(defn- get-samples-answer-array [plot-id user-id]
  (map (fn [{:keys [saved_answers]}]
         (jsonb->clj-str saved_answers))
       (call-sql "select_plot_samples" {:log? false} plot-id user-id)))

(defn- get-survey-questions [project-id]
  (->> (call-sql "select_project_by_id" project-id)
       (first)
       (:survey_questions)
       (tc/jsonb->clj)))

(defn- users-samples->answers [users-samples question]
  (map (fn [sv]
         (map #(get-in % [question "answerId"])
              sv))
       users-samples))

(defn- question-disagreement [sample-answers]
  (if (->> sample-answers
           (map #(every? nil? %))
           (some true?))
    -1 ; set flag when one or more users did not answer the question.
    (average (apply map
                    (fn [& sa]
                      (if (apply = sa) 0.0 100.0)) ; sample disagreement
                    sample-answers))))

(defn- filter-plot-disagreement [project-id grouped-plots threshold]
  (let [survey-questions (get-survey-questions project-id)]
    (filterm (fn [[_ plots]]
               (let [plot-id       (-> plots (first) :plot_id)
                     users-samples (map (fn [plot]
                                          (get-samples-answer-array plot-id (:user_id plot)))
                                        plots)]
                 (->> survey-questions
                      (map (fn [{:keys [question]}]
                             (question-disagreement (users-samples->answers users-samples question))))
                      (apply max)
                      (<= threshold))))
             grouped-plots)))

(defn get-plot-disagreement
  "Returns data containing the survey questions augmented with agreement
   and answer frequency."
  [{:keys [params]}]
  (let [plot-id       (tc/val->int (:plotId params))
        project-id    (tc/val->int (:projectId params))
        plotters      (call-sql "select_plotters" project-id -1)
        users-samples (map (fn [user]
                             (get-samples-answer-array plot-id (:user_id user)))
                           plotters)]
    (data-response (->> (get-survey-questions project-id)
                        (map (fn [{:keys [question] :as sq}]
                               (let [sample-answers (users-samples->answers users-samples question)]
                                 (assoc sq
                                        :disagreement      (question-disagreement sample-answers)
                                        :answerFrequencies (map (fn [user ans]
                                                                  {:userId  (:user_id user)
                                                                   :answers (-> (frequencies ans)
                                                                                (dissoc nil))})
                                                                plotters
                                                                sample-answers)))))))))

;;;
;;; Plot Collection
;;;

(defn- unlock-plots [user-id]
  (call-sql "unlock_plots" {:log? false} user-id))

(defn reset-plot-lock [{:keys [params]}]
  (let [plot-id (tc/val->int (:plotId params))
        user-id (:userId params -1)]
    (call-sql "lock_plot_reset" {:log? false} plot-id user-id (time-plus-five-min))
    (data-response "")))

(defn release-plot-locks [{:keys [params]}]
  (unlock-plots (:userId params -1))
  (data-response ""))

(defn- prepare-samples-array [plot-id user-id]
  (mapv (fn [{:keys [sample_id sample_geom saved_answers]}]
          {:id           sample_id
           :sampleGeom   sample_geom
           :savedAnswers (tc/jsonb->clj saved_answers)})
        (call-sql "select_plot_samples" plot-id user-id)))

(defn- build-collection-plot [plot-info user-id review-mode?]
  (let [{:keys [plot_id
                flagged
                confidence
                flagged_reason
                plot_geom
                extra_plot_info
                visible_id
                user_id
                email]} plot-info]
    {:id            plot_id
     :flagged       flagged
     :flaggedReason (or flagged_reason "")
     :confidence    (or confidence 100)
     :visibleId     visible_id
     :plotGeom      plot_geom
     :extraPlotInfo (tc/jsonb->clj extra_plot_info {})
     :samples       (prepare-samples-array plot_id (if (and review-mode? (pos? user_id))
                                                     user_id
                                                     user-id))
     :userId        user_id
     :email         email}))

(defn get-collection-plot
  "Gets plot information needed for the collections page.  The plot
   returned is based off of the navigation mode and direction.  Valid
   navigation modes are analyzed, unanalyzed, and all.  Valid directions
   are previous, next, and id."
  [{:keys [params]}]
  (let [navigation-mode (:navigationMode params "unanalyzed")
        direction       (:direction params "next")
        project-id      (tc/val->int (:projectId params))
        old-visible-id  (tc/val->int (:visibleId params))
        threshold       (tc/val->int (:threshold params))
        user-id         (:userId params -1)
        current-user-id (tc/val->int (:currentUserId params -1))
        review-mode?     (and (tc/val->bool (:inReviewMode params))
                              (is-proj-admin? user-id project-id nil))
        proj-plots      (case navigation-mode
                          "unanalyzed" (call-sql "select_unanalyzed_plots" project-id user-id review-mode?)
                          "analyzed"   (call-sql "select_analyzed_plots"   project-id user-id review-mode?)
                          "flagged"    (call-sql "select_flagged_plots"    project-id user-id review-mode?)
                          "confidence" (call-sql "select_confidence_plots" project-id user-id review-mode? threshold)
                          "natural"    (concat (call-sql "select_analyzed_plots" project-id user-id false)
                                               (call-sql "select_unanalyzed_plots" project-id user-id false))
                          "user"       (call-sql "select_analyzed_plots" project-id current-user-id false)
                          "qaqc"       (call-sql "select_qaqc_plots" project-id)
                          [])
        grouped-plots   (into (sorted-map) (group-by :visible_id proj-plots))
        final-plots     (if (= navigation-mode "qaqc")
                          (filter-plot-disagreement project-id grouped-plots threshold)
                          grouped-plots)
        plots-info      (case direction
                          "next"     (or (some (fn [[visible-id plots]]
                                                 (and (> visible-id old-visible-id)
                                                      plots))
                                               final-plots)
                                         (->> final-plots
                                              (first)
                                              (second)))
                          "previous" (or (->> final-plots
                                              (sort-by first #(compare %2 %1))
                                              (some (fn [[visible-id plots]]
                                                      (and (< visible-id old-visible-id)
                                                           plots))))
                                         (->> final-plots
                                              (last)
                                              (second)))
                          "id"       (some (fn [[visible-id plots]]
                                             (and (= visible-id old-visible-id)
                                                  plots))
                                           final-plots))]
    (if plots-info
      (do
        (unlock-plots user-id)
        ;; TODO, CEO-90 Technically there is a race condition here.  We need a lock function
        ;;       that returns truthy/falsy if it correctly created a unique lock.
        ;;       The quickest way to finish this is to return a "race condition error."
        ;;       If we get users complaining we can try a recursive find.
        (call-sql "lock_plot"
                  (:plot_id (first plots-info))
                  user-id
                  (time-plus-five-min))
        (data-response (map #(build-collection-plot % user-id review-mode?) plots-info)))
      (data-response "not-found"))))

;;;
;;; Saving Plots
;;;

(defn add-user-samples [{:keys [params]}]
  (let [plot-id          (tc/val->int (:plotId params))
        user-id          (:userId params -1)
        confidence       (tc/val->int (:confidence params))
        collection-start (tc/val->long (:collectionStart params))
        user-samples     (:userSamples params)
        user-images      (:userImages params)
        new-plot-samples (:newPlotSamples params)
        ;; Samples created in the UI have IDs starting with 1. When the new sample is created
        ;; in Postgres, it gets different ID.  The user sample ID needs to be updated to match.
        id-translation   (when new-plot-samples
                           (call-sql "delete_user_plot_by_plot" plot-id user-id)
                           (call-sql "delete_samples_by_plot" plot-id)
                           (reduce (fn [acc {:keys [id sampleGeom]}]
                                     (let [new-id (sql-primitive (call-sql "create_project_plot_sample"
                                                                           {:log? false}
                                                                           plot-id
                                                                           (tc/json->jsonb sampleGeom)))]
                                       (assoc acc (str id) (str new-id))))
                                   {}
                                   new-plot-samples))]
    (if (some seq (vals user-samples))
      (call-sql "upsert_user_samples"
                plot-id
                user-id ; FIXME, CEO-208 in admin mode, we need to get the existing user id for the plot.
                (when (pos? confidence) confidence)
                (Timestamp. collection-start) ; TODO, CEO-208 dont update collection time for admin in admin mode.
                (tc/clj->jsonb (set/rename-keys user-samples id-translation))
                (tc/clj->jsonb (set/rename-keys user-images id-translation)))
      (call-sql "delete_user_plot_by_plot" plot-id user-id)) ; FIXME, CEO-208 in admin mode, we need to get the existing user id for the plot.
    (unlock-plots user-id)
    (data-response "")))

(defn flag-plot [{:keys [params]}]
  (let [plot-id          (tc/val->int (:plotId params))
        user-id          (:userId params -1)
        collection-start (tc/val->long (:collectionStart params))
        flagged-reason   (:flaggedReason params)]
    (call-sql "flag_plot" plot-id user-id (Timestamp. collection-start) flagged-reason)
    (unlock-plots user-id)
    (data-response "")))

(ns collect-earth-online.db.plots
  (:import java.sql.Timestamp)
  (:require [clojure.set                      :as set]
            [clojure.data.json                :refer [read-str]]
            [triangulum.type-conversion       :as tc]
            [triangulum.database              :refer [call-sql sql-primitive]]
            [triangulum.utils                 :refer [filterm]]
            [collect-earth-online.db.projects :refer [is-proj-admin?]]
            [triangulum.response              :refer [data-response]]))

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

(defn pred-idx-nav
  "returns the next or previous datum of an array 
   proximal to an array datum that matches a predicate.
  =  args:
  - pred: an expression with one parameter that returns a boolean
  - coll: an indexed collection
  - dir: [:prev | :next] indicates to return preceeding or following datum.
  = returns:
  - if a datum of coll matches pred, and a datum of coll is proximal in dir,
    (ie, preceding matching datum when dir is :prev, or following when :next)
    will return the proximal datum.
  - if no datum of coll matches pred, or if no datum exists in dir,
    (ie, the first datum when dir = :prev or the last when dir = :next
    returns nil."
  [pred coll dir]
  (let [loop-coll (into [nil] coll)]
    (loop [[prev this & foll] loop-coll]
      (if (pred this)
        (case dir
          :prev prev
          :next (first foll))
        (when (seq foll)
              (recur (into [this] foll)))))))

(defn filter-pred-idx
  [pred coll]
  (let [loop-coll (into [nil] coll)]
    (loop [[prev this & foll] loop-coll]
      (if (pred this)
        [prev this (first foll)]
        (when (seq foll)
              (recur (into [this] foll)))))))

;;;
;;; Project Level
;;;

;; TODO, CEO-32 update to only show users available plots
(defn get-project-plots
  "{:params {:projectId :int-str
             :max       :int-str?}}"
  [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        max-plots  (tc/val->int (:max params) 100000)] ; 100000 loads in ~1.5 seconds.
    (data-response (mapv #(set/rename-keys % {:visible_id :id
                                              :plot_id :plotId})
                         (call-sql "select_limited_project_plots" project-id max-plots)))))

(defn get-plotters
  "Gets all users that have collected plots on a project. If optional plotId
   is passed, return results only for that plot.
  {:params {:projectId :int-str
            :plotId    :int-str}}"
  [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        plot-id    (tc/val->int (:plotId params))]
    (data-response (mapv (fn [{:keys [user_id email]}]
                           {:userId user_id :email email})
                         (call-sql "select_plotters" project-id plot-id)))))

;;;
;;; GeoDash
;;;

(defn get-plot-sample-geom
  "{:params {:plotId :int-str}}"
  [{:keys [params]}]
  (let [plot-id (tc/val->int (:plotId params))]
    (data-response (if-let [plot-geom (sql-primitive (call-sql "select_plot_geom" plot-id))]
                     {:plotGeom    plot-geom
                      :sampleGeoms (mapv :sample_geom
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

(defn- filter-plot-disagreement [project-id grouped-plots threshold]
  (let [survey-questions (get-survey-questions project-id)]
    (filterm (fn [[_ plots]]
               (let [plot-id       (-> plots (first) :plot_id)
                     users-samples (->> (call-sql "select_qaqc_plot_samples" {:log? false} plot-id)
                                        (group-by :user_id)
                                        (mapv (fn [[_ samples]]
                                                (map (fn [{:keys [:saved_answers]}] (jsonb->clj-str saved_answers))
                                                     samples))))]
                 (some (fn [[question-id _sq]]
                         (->> question-id
                              (users-samples->answers users-samples)
                              (question-disagreement)
                              (<= threshold)))
                       survey-questions)))
             grouped-plots)))

(defn get-plot-disagreement
  "Returns data containing the survey questions augmented with agreement
   and answer frequency.
  {:params {:plotId    :int-str
            :projectId :int-str}}"
  [{:keys [params]}]
  (let [plot-id       (tc/val->int (:plotId params))
        project-id    (tc/val->int (:projectId params))
        user_plots    (call-sql "select_user_plots_info" plot-id)
        users-samples (map (fn [user]
                             (get-samples-answer-array plot-id (:user_id user)))
                           user_plots)]
    (data-response (->> (get-survey-questions project-id)
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
                                                           sample-answers)))))))))

;;;
;;; Plot Collection
;;;

(defn- unlock-plots [user-id]
  (call-sql "unlock_plots" {:log? false} user-id))

(defn reset-plot-lock
  "{:params {:plotId :int-str}
    :session {:userId :int-str?}}"
  [{:keys [params session]}]
  (let [plot-id (tc/val->int (:plotId params))
        user-id (:userId session -1)]
    (call-sql "lock_plot_reset" {:log? false} plot-id user-id (time-plus-five-min))
    (data-response "")))

(defn release-plot-locks
  "{:session {:userId :int-str?}}"
  [{:keys [params session]}]
  (unlock-plots (:userId session -1))
  (data-response ""))

(defn- prepare-samples-array [plot-id user-id]
  (mapv (fn [{:keys [sample_id sample_geom saved_answers visible_id]}]
          {:id           sample_id
           :sampleGeom   sample_geom
           :savedAnswers (tc/jsonb->clj saved_answers)
           :visibleId    visible_id})
        (call-sql "select_plot_samples" {:log? false} plot-id user-id)))

(defn- build-collection-plot [plot-info user-id review-mode? project-type]
  (let [{:keys [plot_id
                flagged
                confidence
                confidence_comment
                flagged_reason
                plot_geom
                extra_plot_info
                visible_id
                user_id
                email]} plot-info
        samples (prepare-samples-array plot_id (if (and review-mode? (pos? user_id))
                                                 user_id
                                                 user-id))]
    {:id                plot_id
     :flagged           flagged
     :flaggedReason     (or flagged_reason "")
     :confidence        confidence
     :confidenceComment confidence_comment
     :visibleId         visible_id
     :plotGeom          plot_geom
     :extraPlotInfo     (tc/jsonb->clj extra_plot_info {})
     :samples           (if (= project-type "simplified")
                          (take 1 (filter (fn [s] (= 1 (:visibleId s))) samples))
                          samples)
     :userId            user_id
     :email             email}))

(defn get-correct-plot-navigation
  [project-id user-id current-user-id review-mode? navigation-mode project-type threshold reference-plot-id]
  (if (and (= project-type "simplified")
           (= navigation-mode "unanalyzed"))
    (call-sql "select_simplified_project_plot" project-id)
    (case navigation-mode
      "unanalyzed" (call-sql "select_unanalyzed_plots" project-id user-id review-mode?)
      "analyzed"   (call-sql "select_analyzed_plots"   project-id user-id review-mode?)
      "flagged"    (call-sql "select_flagged_plots"    project-id user-id review-mode?)
      "confidence" (call-sql "select_confidence_plots" project-id user-id review-mode? threshold)
      "natural"    (concat (call-sql "select_analyzed_plots" project-id user-id false)
                           (call-sql "select_unanalyzed_plots" project-id user-id false))
      "user"       (call-sql "select_analyzed_plots" project-id current-user-id false)
      "qaqc"       (call-sql "select_qaqc_plots" project-id)
      "similar"    (call-sql "select_plots_by_similarity" project-id reference-plot-id)
      [])))

(defn get-collection-plot
  "Gets plot information needed for the collections page.  The plot
   returned is based off of the navigation mode and direction.  Valid
   navigation modes are analyzed, unanalyzed, and all.  Valid directions
   are previous, next, and id.
  {:params  {:navigationMode :string?
             :direction      :string?
             :projectId      :int-str
             :visibleId      :int-str 
             :threshold      :int-str
             :projectType    :string?
             :currentUserId  :int-str?
             :inReviewMode   :bool?}
   :session {:userId         :int-str?}}

  "
  [{:keys [params session]}]
  (let [navigation-mode (:navigationMode params "unanalyzed")
        direction       (:direction params "next")
        project-id      (tc/val->int (:projectId params))
        old-visible-id  (tc/val->int (:visibleId params))
        threshold       (tc/val->int (:threshold params))
        ref-plot-id     (tc/val->int (:referencePlotId params))
        project-type    (:projectType params "regular")
        user-id         (:userId session -1)
        current-user-id (tc/val->int (:currentUserId params -1))
        review-mode?     (and (tc/val->bool (:inReviewMode params))
                              (is-proj-admin? user-id project-id nil))
        proj-plots      (get-correct-plot-navigation project-id
                                                     user-id
                                                     current-user-id
                                                     review-mode?
                                                     navigation-mode
                                                     project-type
                                                     threshold
                                                     ref-plot-id)
        grouped-plots   (group-by :visible_id proj-plots)
        sorted-plots    (case navigation-mode
                          "qaqc" (sort-by first (filter-plot-disagreement project-id grouped-plots threshold))
                          "similar"
			  (if (some #(= (:visible_id %) old-visible-id) proj-plots)
			    (filter-pred-idx #(= (:visible_id %) old-visible-id) proj-plots)
			    (take 3 (into [nil nil] proj-plots)))
                          (sort-by first grouped-plots))
        plots-info      (case direction
                          "next"     (case navigation-mode "similar"
                                       (->> sorted-plots
                                            (take-last 1)
                                            (remove nil?)
                                            seq)					   
				       (or
					(->> sorted-plots
					     (some (fn [[visible-id plots]]
						     (and (> visible-id old-visible-id)
							  plots))))
					(-> sorted-plots first second)))
                          "previous" (case navigation-mode "similar"
                                       (->> sorted-plots
                                            (take 1)
                                            (remove nil?)
                                            seq)
				       (or
					(->> sorted-plots
					     (sort-by first #(compare %2 %1))
					     (some (fn [[visible-id plots]]
						     (and (< visible-id old-visible-id)
							  plots))))
                                        (->> sorted-plots
					     (last)
					     (second))))
                          "id"       (case navigation-mode "similar"
				       (->> sorted-plots
                                            (take-last 2)
                                            (remove nil?)
                                            seq)					   
                                       (some (fn [[visible-id plots]]
                                               (and (= visible-id old-visible-id)
                                                    plots))
                                             sorted-plots)))]
    (if plots-info
      (try
        (when (not= project-type "simplified")
          (unlock-plots user-id)
          (call-sql "lock_plot"
                    (:plot_id (first plots-info))
                    user-id
                    (time-plus-five-min)))
        (data-response (map #(build-collection-plot % user-id review-mode? project-type) plots-info))
        (catch Exception _e
          (data-response "Unable to get the requested plot.  Please try again.")))
      (data-response "not-found"))))

;;;
;;; Saving Plots
;;;

(defn upsert-user-plots
  [user-plot plot-id user-id
   confidence confidence-comment collection-start
   imagery-ids review-mode? project-type
   used-kml used-geodash]
  (if user-plot
    (if (= project-type "simplified")
      (call-sql "insert_user_plot"
                plot-id
                user-id
                confidence
                confidence-comment
                (when-not review-mode? (Timestamp. collection-start))
                imagery-ids
                used-kml
                used-geodash)
      (call-sql "update_user_plot"
                user-plot
                confidence
                confidence-comment
                (when-not review-mode? (Timestamp. collection-start))
                imagery-ids
                used-kml
                used-geodash))
    (call-sql "insert_user_plot"
              plot-id
              user-id
              confidence
              confidence-comment
              (when-not review-mode? (Timestamp. collection-start))
              imagery-ids
              used-kml
              used-geodash)))

(defn add-user-samples
  "{:params {:projectId :int-str
             :plotId :int-str
             :currentUserId :int-str?
             :inReviewMode :bool
             :confidence :int-str?
             :confidenceComment :string
             :collectionStart :long-str
             :userSamples {}
             :projectType ['simplified' 'regular]
             :imageryIds :jsonb}
    :session {:userId :int-str?}}"
  [{:keys [params session]}]
  (let [project-id         (tc/val->int (:projectId params))
        plot-id            (tc/val->int (:plotId params))
        session-user-id    (:userId session -1)
        current-user-id    (tc/val->int (:currentUserId params -1))
        review-mode?       (and (tc/val->bool (:inReviewMode params))
                                (pos? current-user-id)
                                (is-proj-admin? session-user-id project-id nil))
        confidence         (tc/val->int (:confidence params 100))
        confidence-comment (:confidenceComment params)
        collection-start   (tc/val->long (:collectionStart params))
        user-samples       (:userSamples params)
        user-images        (:userImages params)
        new-plot-samples   (:newPlotSamples params)
        project-type       (:projectType params)
        used-kml           (:usedKML params)
        used-geodash       (:usedGeodash params)
        user-id            (if review-mode? current-user-id session-user-id)
        imagery-ids        (tc/clj->jsonb (:imageryIds params))
        ;; Samples created in the UI have IDs starting with 1. When the new sample is created
        ;; in Postgres, it gets different ID.  The user sample ID needs to be updated to match.
        id-translation     (when new-plot-samples
                             (when (= project-type "simplified")
                               (doall
                                (map (fn [{:keys [sampleGeom]}]
                                       (call-sql "delete_samples_by_geom" plot-id (tc/json->jsonb sampleGeom)))
                                     new-plot-samples)))
                             (when (= project-type "regular")
                               (call-sql "delete_user_plot_by_plot" plot-id user-id)
                               (call-sql "delete_samples_by_plot" plot-id))
                             (reduce (fn [acc {:keys [id visibleId sampleGeom]}]
                                       (let [new-id (sql-primitive (call-sql "create_project_plot_sample"
                                                                             {:log? false}
                                                                             plot-id
                                                                             visibleId
                                                                             (tc/json->jsonb sampleGeom)))]
                                         (assoc acc (str id) (str new-id))))
                                     {}
                                     new-plot-samples))
        user-plot         (sql-primitive (call-sql "get_user_plot" plot-id user-id))]
    (if (some seq (vals user-samples))
      (let [user-plot-id (sql-primitive
                          (upsert-user-plots user-plot
                                             plot-id
                                             user-id
                                             (if (< confidence 0)
                                               100
                                               confidence)
                                             confidence-comment
                                             collection-start
                                             imagery-ids
                                             review-mode?
                                             project-type
                                             used-kml
                                             used-geodash))]
        (call-sql "upsert_user_samples"
                  user-plot-id
                  plot-id
                  (tc/clj->jsonb (set/rename-keys user-samples id-translation))
                  (tc/clj->jsonb (set/rename-keys user-images id-translation))))

      (when (not= project-type "simplified")
        (call-sql "delete_user_plot_by_plot" plot-id user-id)))
    (unlock-plots user-id)
    (data-response "")))

(defn flag-plot
  "{:params  {:projectId :int-str
              :plotId    :int-str
              :currentUserId :int-str?
              :inReviewMode :bool?
              :collectionStart :long-str
              :flaggedReason :string}
    :session {:userId    :int-str?}}"
  [{:keys [params session]}]
  (let [project-id       (tc/val->int (:projectId params))
        plot-id          (tc/val->int (:plotId params))
        user-id          (:userId session -1)
        current-user-id  (tc/val->int (:currentUserId params -1))
        review-mode?     (and (tc/val->bool (:inReviewMode params false))
                              (pos? current-user-id)
                              (is-proj-admin? user-id project-id nil))
        collection-start (tc/val->long (:collectionStart params))
        flagged-reason   (:flaggedReason params)]
    (call-sql "flag_plot"
              plot-id
              (if review-mode? current-user-id user-id)
              (when-not review-mode? (Timestamp. collection-start))
              flagged-reason)
    (unlock-plots user-id)
    (data-response "")))

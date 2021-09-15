(ns collect-earth-online.db.plots
  (:import java.sql.Timestamp)
  (:require [clojure.set :as set]
            [collect-earth-online.utils.type-conversion :as tc]
            [collect-earth-online.database    :refer [call-sql sql-primitive]]
            [collect-earth-online.db.projects :refer [is-proj-admin?]]
            [collect-earth-online.views       :refer [data-response]]))

(defn- time-plus-five-min []
  (Timestamp. (+ (System/currentTimeMillis) (* 5 60 1000))))

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

(defn get-plot-sample-geom [{:keys [params]}]
  (let [plot-id (tc/val->int (:plotId params))]
    (data-response (if-let [plot-geom (sql-primitive (call-sql "select_plot_geom" plot-id))]
                     {:plotGeom     plot-geom
                      :samplesGeoms (mapv :sample_geom
                                          (call-sql "select_plot_sample_geoms" plot-id))}
                     ""))))

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

(defn- build-collection-plot [plot-info user-id]
  (let [{:keys [plot_id
                flagged
                confidence
                flagged_reason
                plot_geom
                extra_plot_info
                visible_id]} plot-info]
    {:id            plot_id
     :flagged       flagged
     :flaggedReason (or flagged_reason "")
     :confidence    (or confidence 100)
     :visibleId     visible_id
     :plotGeom      plot_geom
     :extraPlotInfo (tc/jsonb->clj extra_plot_info {})
     :samples       (prepare-samples-array plot_id user-id)}))

(defn get-collection-plot
  "Gets plot information needed for the collections page.  The plot
   returned is based off of the navigation mode and direction.  Valid
   navigation modes are analyzed, unanalyzed, and all.  Valid directions
   are previous, next, and id."
  [{:keys [params]}]
  (let [navigation-mode (:navigationMode params "unanalyzed")
        direction       (:direction params "next")
        project-id      (tc/val->int (:projectId params))
        visible-id      (tc/val->int (:visibleId params))
        user-id         (:userId params -1)
        admin-mode?     (and (tc/val->bool (:inAdminMode params))
                             (is-proj-admin? user-id project-id nil))
        proj-plots      (case navigation-mode
                          "unanalyzed" (call-sql "select_unanalyzed_plots" project-id user-id admin-mode?)
                           ;; FIXME, CEO-217 analyzed mode + admin mode does not work for multiple users.
                          "analyzed"   (call-sql "select_analyzed_plots" project-id user-id admin-mode?)
                          [])
        plot-info       (case direction
                          "next"     (some (fn [{:keys [visible_id] :as plot}]
                                             (and (> visible_id visible-id)
                                                  plot))
                                           proj-plots)
                          "previous" (->> proj-plots
                                          (rseq)
                                          (some (fn [{:keys [visible_id] :as plot}]
                                                  (and (< visible_id visible-id)
                                                       plot))))
                          "id"       (some (fn [{:keys [visible_id] :as plot}]
                                             (and (= visible_id visible-id)
                                                  plot))
                                           proj-plots))]
    (if plot-info
      (do
        (unlock-plots user-id)
        ;; TODO, CEO-90 Technically there is a race condition here.  We need a lock function
        ;;       that returns truthy/falsy if it correctly created a unique lock.
        ;;       The quickest way to finish this is to return a "race condition error."
        ;;       If we get users complaining we can try a recursive find.
        (call-sql "lock_plot"
                  (:plot_id plot-info)
                  user-id
                  (time-plus-five-min))
        (data-response (build-collection-plot plot-info user-id)))
      (data-response "not-found"))))

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

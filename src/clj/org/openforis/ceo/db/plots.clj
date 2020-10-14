(ns org.openforis.ceo.db.plots
  (:import java.sql.Timestamp)
  (:require [clojure.set :as set]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.database    :refer [call-sql sql-primitive]]
            [org.openforis.ceo.db.projects :refer [is-proj-admin?]]
            [org.openforis.ceo.views       :refer [data-response]]))

(defn- time-plus-five-min []
  (Timestamp. (+ (System/currentTimeMillis) (* 5 60 1000))))

;; TODO if we use a more efficient SQL call, we can return more plots.
(defn get-project-plots [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        max-plots  (tc/val->int (:max params) 1000)]
    (data-response (mapv (fn [{:keys [plot_id center flagged assigned]}]
                           {:id       plot_id
                            :center   center
                            :flagged  (< 0 (or flagged -1))
                            :analyses assigned})
                         (call-sql "select_limited_project_plots" project-id max-plots)))))

(defn- prepare-samples-array [plot-id project-id]
  (mapv (fn [{:keys [sample_id sample_geom sampleid geom value]}]
          (merge {:id         sample_id
                  :sampleGeom sample_geom
                  :sampleId   sampleid ;TODO I don't think we distinguish between sample_id and sampleId so this could go away
                  :geom       geom}
                 (when (< 2 (count (str value)))
                   {:value (tc/jsonb->clj value)})))
        (call-sql "select_plot_samples" plot-id project-id)))

(defn- prepare-plot-object [plot-info project-id]
  (let [{:keys [plot_id center flagged assigned plotid geom extra_plot_info]} plot-info]
    {:id            plot_id
     :projectId     project-id ;TODO why do we need to return a value that is already known
     :center        center
     :flagged       (< 0 (or flagged -1))
     :analyses      assigned
     :plotId        plotid
     :geom          geom
     :extraPlotInfo (dissoc (tc/jsonb->clj extra_plot_info) :gid :lat :lon :plotid)
     :samples       (prepare-samples-array plot_id project-id)}))

(defn get-project-plot [{:keys [params]}]
  (let [project-id (tc/val->int (:projectId params))
        plot-id    (tc/val->int (:plotId params))]
    (data-response (if-let [plot-info (first (call-sql "select_plot_by_id"
                                                       project-id
                                                       plot-id))]
                     (prepare-plot-object plot-info project-id)
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

(defn- get-collection-plot [params method]
  (let [navigation-mode (:navigationMode params "unanalyzed")
        project-id      (tc/val->int (:projectId params))
        plot-id         (tc/val->int (:plotId params))
        user-id         (:userId params -1)
        user-name       (:userName params)
        review-all?     (and (= "all" navigation-mode)
                             (is-proj-admin? user-id project-id nil))]
    (data-response (if-let [plot-info (first (if (= "unanalyzed" navigation-mode)
                                               (call-sql (str "select_" method "unassigned_plot")
                                                         project-id
                                                         plot-id)
                                               (call-sql (str "select_" method "user_plot")
                                                         project-id
                                                         plot-id
                                                         user-name
                                                         review-all?)))]
                     (do
                       (unlock-plots user-id)
                       (call-sql "lock_plot"
                                 (:plot_id plot-info)
                                 user-id
                                 (time-plus-five-min))
                       (prepare-plot-object plot-info project-id))
                     "done"))))

(defn get-plot-by-id [{:keys [params]}]
  (let  [project-id (tc/val->int (:projectId params))
         plot-id    (tc/val->int (:plotId params))]
    (if (first (call-sql "select_plot_by_id" project-id plot-id))
      (get-collection-plot params "by_id_")
      (data-response "not-found"))))

(defn get-next-plot [{:keys [params]}]
  (get-collection-plot params "next_"))

(defn get-prev-plot [{:keys [params]}]
  (get-collection-plot params "prev_"))

(defn add-user-samples [{:keys [params]}]
  (let [project-id       (tc/val->int (:projectId params))
        plot-id          (tc/val->int (:plotId params))
        user-id          (:userId params -1)
        confidence       (tc/val->int (:confidence params))
        collection-start (tc/val->long (:collectionStart params))
        user-samples     (:userSamples params)
        user-images      (:userImages params)
        plot-samples     (:plotSamples params)
        user-plot-id     (when (not plot-samples)
                           (sql-primitive (call-sql "check_user_plots" project-id plot-id user-id)))
        id-translation   (when plot-samples
                           (call-sql "delete_user_plot_by_plot" plot-id)
                           (call-sql "delete_samples_by_plot" plot-id)
                           (reduce (fn [acc {:keys [id sampleGeom]}]
                                     (let [new-id (sql-primitive (call-sql "create_project_plot_sample"
                                                                           {:log? false}
                                                                           plot-id
                                                                           (tc/json->jsonb sampleGeom)))]
                                       (assoc acc (str id) (str new-id))))
                                   {}
                                   plot-samples))]
    (apply call-sql
           (concat (if user-plot-id
                     ["update_user_samples" user-plot-id]
                     ["add_user_samples"])
                   [project-id
                    plot-id
                    user-id
                    (when (pos? confidence) confidence)
                    (Timestamp. collection-start)
                    (tc/clj->jsonb (set/rename-keys user-samples id-translation))
                    (tc/clj->jsonb (set/rename-keys user-images id-translation))]))
    (unlock-plots user-id)
    (data-response "")))

(defn flag-plot [{:keys [params]}]
  (let [plot-id (tc/val->int (:plotId params))
        user-id (:userId params -1)]
    (call-sql "flag_plot" plot-id user-id nil)
    (unlock-plots user-id)
    (data-response "")))

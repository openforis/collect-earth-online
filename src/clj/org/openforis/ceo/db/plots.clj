(ns org.openforis.ceo.db.plots
  (:import java.sql.Timestamp)
  (:require [clojure.set :as set]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.database        :refer [call-sql sql-primitive]]
            [org.openforis.ceo.db.institutions :refer [is-inst-admin-query?]]
            [org.openforis.ceo.views           :refer [data-response]]))

(defn- time-plus-five-min []
  (Timestamp. (+ (System/currentTimeMillis) (* 5 60 1000))))

;; TODO if we use a more efficient SQL call, we can return more plots.
(defn get-project-plots [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        max-plots  (tc/str->int (:max params) 1000)]
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
                  :geom       (tc/jsonb->clj geom)}
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
     :geom          (tc/jsonb->clj geom)
     :extraPlotInfo (dissoc (tc/jsonb->clj extra_plot_info) :gid :lat :lon :plotid)
     :samples       (prepare-samples-array plot_id project-id)}))

(defn get-project-plot [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        plot-id    (tc/str->int (:plotId params))]
    (data-response (if-let [plot-info (first (call-sql "select_plot_by_id"
                                                       project-id
                                                       plot-id))]
                     (prepare-plot-object plot-info project-id)
                     ""))))

(defn- unlock-plots [user-id]
  (call-sql "unlock_plots" {:log? false} user-id))

(defn reset-plot-lock [{:keys [params]}]
  (let [plot-id (tc/str->int (:plotId params))
        user-id (:userId params -1)]
    (call-sql "lock_plot_reset" {:log? false} plot-id user-id (time-plus-five-min))
    (data-response "")))

(defn release-plot-locks [{:keys [params]}]
  (unlock-plots (:userId params -1))
  (data-response ""))

(defn- get-collection-plot [params method]
  (let [get-user-plots? (tc/str->bool (:getUserPlots params))
        project-id      (tc/str->int (:projectId params))
        institution-id  (tc/str->int (:institutionId params))
        plot-id         (tc/str->int (:plotId params))
        user-id         (:userId params -1)
        user-name       (:userName params)
        inst-admin?     (is-inst-admin-query? user-id institution-id)
        sql2            #(call-sql % project-id plot-id)
        sql3            #(call-sql % project-id plot-id user-name)]
    (data-response (if-let [plot-info (first (cond
                                               (and inst-admin? get-user-plots?)
                                               (sql2 (str "select_" method "user_plot_by_admin"))

                                               get-user-plots?
                                               (sql3 (str "select_" method "user_plot"))

                                               :else
                                               (sql2 (str "select_" method "unassigned_plot"))))]
                     (do
                       (unlock-plots user-id)
                       (call-sql "lock_plot"
                                 (:plot_id plot-info)
                                 user-id
                                 (time-plus-five-min))
                       (prepare-plot-object plot-info project-id))
                     "done"))))

(defn get-plot-by-id [{:keys [params]}]
  (let  [project-id (tc/str->int (:projectId params))
         plot-id    (tc/str->int (:plotId params))]
    (if (first (call-sql "select_plot_by_id" project-id plot-id))
      (get-collection-plot params "by_id_")
      (data-response "not-found"))))

(defn get-next-plot [{:keys [params]}]
  (get-collection-plot params "next_"))

(defn get-prev-plot [{:keys [params]}]
  (get-collection-plot params "prev_"))

(defn add-user-samples [{:keys [params]}]
  (let [project-id       (tc/str->int (:projectId params))
        plot-id          (tc/str->int (:plotId params))
        user-id          (:userId params -1)
        confidence       (tc/str->int (:confidence params))
        collection-start (tc/str->long (:collectionStart params))
        user-samples     (:userSamples params)
        user-images      (:userImages params)
        plot-samples     (:plotSamples params)
        user-plot-id     (when (not plot-samples)
                           (sql-primitive (call-sql "check_user_plots" project-id plot-id user-id)))
        id-translation   (when plot-samples
                           (call-sql "delete_saved_samples" plot-id)
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
  (let [plot-id (tc/str->int (:plotId params))
        user-id (:userId params -1)]
    (call-sql "flag_plot" plot-id user-id nil)
    (unlock-plots user-id)
    (data-response "")))

(ns org.openforis.ceo.db.plots
  (:import java.sql.Timestamp)
  (:require [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.database        :refer [call-sql
                                                       call-sql-opts
                                                       sql-primitive]]
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

(defn- prepare-sample-object [plot-id project-id]
  (mapv (fn [{:keys [sample_id point sampleId geom value]}]
          {:id       sample_id
           :point    point
           :sampleId sampleId ;TODO I don't think we we distinguish between sample_id and sampleId so this could go away
           :geom     (tc/jsonb->clj geom)
           :value    (if (< 2 (count (str value)))
                       (tc/jsonb->clj value)
                       {})})
        (call-sql "select_plot_samples" plot-id project-id)))

(defn- clean-extra-plot-info [extra-plot-info]
  (or (dissoc (tc/jsonb->clj extra-plot-info) :gid :lat :lon :plotid)
      {}))

(defn- build-plot-object [plot-info project-id]
  (let [{:keys [plot_id center flagged plotId geom extra_plot_info]} plot-info]
    {:id            plot_id
     :projectId     project-id ;TODO why do we need to return a value that is already known
     :center        center
     :flagged       (< 0 (or flagged -1))
     :plotId        plotId
     :geom          (tc/jsonb->clj geom)
     :extraPlotInfo (clean-extra-plot-info extra_plot_info)
     :samples       (prepare-sample-object plot_id project-id)}))

(defn get-project-plot [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        plot-id    (tc/str->int (:plotId params))]
    (data-response (build-plot-object (first (call-sql "select_plot_by_id"
                                                       project-id
                                                       plot-id))
                                      project-id))))

(defn- unlock_plots [user-id]
  (call-sql-opts "unlock_plots" {:log? false} user-id))

(defn reset-plot-lock [{:keys [params]}]
  (let [plot-id (tc/str->int (:plotId params))
        user-id (:userId params -1)]
    (call-sql-opts "lock_plot_reset" {:log? false} plot-id user-id (time-plus-five-min))
    (data-response "")))

(defn release-plot-locks [{:keys [params]}]
  (unlock_plots (:userId params -1))
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
                       (unlock_plots user-id)
                       (call-sql "lock_plot"
                                 (:plot_id plot-info)
                                 user-id
                                 (time-plus-five-min))
                       (build-plot-object plot-info project-id))
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
        user-samples     (tc/clj->jsonb (:userSamples params))
        user-images      (tc/clj->jsonb (:userImages params))
        user-plot-id     (sql-primitive (call-sql "check_user_plots" project-id plot-id user-id))]
    (apply call-sql
           (concat (if user-plot-id
                     ["update_user_samples" user-plot-id]
                     ["add_user_samples"])
                   [project-id
                    plot-id
                    user-id
                    (when (pos? confidence) confidence)
                    (Timestamp. collection-start)
                    user-samples
                    user-images]))
    (unlock_plots user-id)
    (data-response "")))

(defn flag-plot [{:keys [params]}]
  (let [plot-id (tc/str->int (:plotId params))
        user-id (:userId params -1)]
    (call-sql "flag_plot" plot-id user-id nil)
    (unlock_plots user-id)
    (data-response "")))

(ns org.openforis.ceo.db.plots
  (:import java.sql.Timestamp)
  (:require [clojure.data.json :as json]
            [org.openforis.ceo.database :refer [call-sql sql-primitive]]
            [org.openforis.ceo.db.institutions :refer [is-inst-admin-query]]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.views :refer [data-response]]))

(defn- time-plus-five-min []
  (Timestamp. ((.currentTimeMillis System) + (* 5 60 1000))))

(defn get-project-plots [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        max-plots  (tc/str->int (:maxPlots params) 1000)]
    (data-response (mapv (fn [{:keys [plot_id center flagged assigned]}]
                           {:id       plot_id
                            :center   center
                            :flagged  (= 0 flagged)
                            :analyses assigned})
                         (call-sql "select_limited_project_plots" project-id max-plots)))))

(defn- clean-extra-plot-info [extra-plot-info]
  (or (dissoc (json/read-str extra-plot-info) :gid :lat :lon :plotid)
      {}))

(defn- get-sample-object [plot-id project-id]
  (mapv (fn [{:keys [sample_id point sampleId geom value]}]
          {:id       sample_id
           :point    point
           :sampleId sampleId ;TODO I dont think we we distinguish between sample_id and sampleId so this could go away
           :geom     geom
           :value    (if (< 2 (count value)) (json/read-str value) {})})
        (call-sql "select_plot_samples" plot-id project-id)))

(defn- build-plot-object [{:keys [plot_id center flagged plotId geom extra_plot_info]} project-id]
  {:id            plot_id
   :projectId     project-id ;TODO why do we need to return a value that is already known
   :center        center
   :flagged       (= 0 flagged)
   :plotId        plotId
   :geom          geom
   :extraPlotInfo (clean-extra-plot-info extra_plot_info)
   :samples       (get-sample-object plot_id project-id)})

(defn get-project-plot [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        plot-id    (tc/str->int (:plotId params))]
    (data-response (build-plot-object (first (call-sql "select_plot_by_id"
                                                       project-id
                                                       plot-id))
                                      project-id))))

(defn- unlock_plots [user-id]
  (call-sql "SELECT * FROM unlock_plots" user-id))

(defn- plot-lock-wrapper [project-id user-id sql-results]
  (if-let [plot-info (first (sql-results))]
    (do
      (unlock_plots user-id)
      (call-sql "SELECT * FROM lock_plot"
                (:plot_id plot-info)
                user-id
                (time-plus-five-min))
      (build-plot-object plot-info project-id))
    "done"))

(defn get-plot-by-id [{:keys [params]}]
  (let [get-user-plots? (tc/str->bool (:getUserPlots params))
        project-id      (tc/str->int (:projectId params))
        plot-id         (tc/str->int (:plotId params))
        user-id         (tc/str->int (:userId params))
        user-name       (:userName params)]
    (if (first (call-sql "select_plot_by_id" project-id plot-id))
      (data-response (plot-lock-wrapper project-id
                                        user-id
                                        (if get-user-plots?
                                          (call-sql "select_user_plot_by_id"
                                                    project-id
                                                    plot-id
                                                    user-name)
                                          (call-sql "select_unassigned_plot_by_id"
                                                    project-id
                                                    plot-id))))
      (data-response "not found"))))

(defn get-next-plot [{:keys [params]}]
  (let [get-user-plots? (tc/str->bool (:getUserPlots params))
        project-id      (tc/str->int (:projectId params))
        institution-id  (tc/str->int (:institutionId params))
        plot-id         (tc/str->int (:plotId params))
        user-id         (tc/str->int (:userId params))
        user-name       (:userName params)
        admin?          (is-inst-admin-query user-id institution-id)]
    (data-response (plot-lock-wrapper project-id
                                      user-id
                                      (cond
                                        (and admin? get-user-plots?)
                                        (call-sql "select_next_user_plot_by_admin"
                                                  project-id
                                                  plot-id)

                                        get-user-plots?
                                        (call-sql "select_next_user_plot"
                                                  project-id
                                                  plot-id
                                                  user-name)

                                        :else
                                        (call-sql "select_next_unassigned_plot"
                                                  project-id
                                                  plot-id
                                                  user-name))))))

(defn get-prev-plot [{:keys [params]}]
  (let [get-user-plots? (tc/str->bool (:getUserPlots params))
        project-id      (tc/str->int (:projectId params))
        institution-id  (tc/str->int (:institutionId params))
        plot-id         (tc/str->int (:plotId params))
        user-id         (tc/str->int (:userId params))
        user-name       (:userName params)
        admin?          (is-inst-admin-query user-id institution-id)]
    (data-response (plot-lock-wrapper project-id
                                      user-id
                                      (cond
                                        (and admin? get-user-plots?)
                                        (call-sql "select_prev_user_plot_by_admin"
                                                  project-id
                                                  plot-id)

                                        get-user-plots?
                                        (call-sql "select_prev_user_plot"
                                                  project-id
                                                  plot-id
                                                  user-name)

                                        :else
                                        (call-sql "select_prev_unassigned_plot"
                                                  project-id
                                                  plot-id
                                                  user-name))))))

(defn reset-plot-lock [{:keys [params]}]
  (let [plot-id (tc/str->int (:plotId params))
        user-id (tc/str->int (:userId params))]
    (call-sql "lock_plot_reset" plot-id user-id (time-plus-five-min))
    (data-response "")))

(defn release-plot-locks [{:keys [params]}]
  (unlock_plots (tc/str->int (:userId params)))
  (data-response ""))

(defn add-user-samples [{:keys [params]}]
  (let [project-id       (tc/str->int (:projectId params))
        plot-id          (tc/str->int (:plotId params))
        user-id          (tc/str->int (:userId params))
        confidence       (tc/str->int (:confidence params))
        collection-start (tc/str->long (:collectionStart params))
        user-samples     (json/read-str (:userSamples params))
        user-images      (json/read-str (:userImages params))
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
        user-id (tc/str->int (:userId params))]
    (call-sql "flag_plot" plot-id user-id nil)
    (unlock_plots user-id)
    (data-response "")))

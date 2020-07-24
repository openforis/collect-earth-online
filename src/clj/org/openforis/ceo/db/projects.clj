(ns org.openforis.ceo.db.projects
  (:require [clojure.data.json :as json]
            [org.openforis.ceo.database :refer [call-sql sql-primitive]]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.views :refer [data-response]]))

(defn- check-auth-common [params sql-query]
  (let [user-id    (tc/str->int (:userId params))
        project-id (tc/str->int (:projectId params))
        token-key  (:token-key params)]
    ;; FIXME we need a middleware that sets non null tokenKey to the session
    (or (and token-key
             (= token-key (sql-primitive (call-sql (str "SELECT token_key FROM projects WHERE project_uid = "
                                                        project-id)))))
        (call-sql sql-query user-id project-id))))

(defn can-collect? [{:keys [params]}]
  (data-response (check-auth-common params "can_user_collect")))

(defn is-proj-admin? [{:keys [params]}]
  (data-response (check-auth-common params "can_user_edit")))

(defn- single-project-object [project]
  {:id                   (:project_id project)
   :institution          (:institution_id project) ; TODO legacy variable name, update to institutionId
   :imageryId            (:imagery_id project)
   :availability         (:availability project)
   :name                 (:name project)
   :description          (:description project)
   :privacyLevel         (:privacy_level project)
   :boundary             (:boundary project)
   :plotDistribution     (:plot_distribution project)
   :numPlots             (:num_plots project)
   :plotSpacing          (:plot_spacing project)
   :plotShape            (:plot_shape project)
   :plotSize             (:plot_size project)
   :archived             (= "archived" (:availability project)) ; TODO this is no longer used
   :sampleDistribution   (:sample_distribution project)
   :samplesPerPlot       (:samples_per_plot project)
   :sampleResolution     (:sample_resolution project)
   :classification_times "" ; TODO this has never been used
   :editable             (:editable project)
   :validBoundary        (:valid_boundary project)
   :sampleValues         (:survey_questions project) ; TODO why dont these names match
   :surveyRules          (:survey_rules project)
   :projectOptions       (:options project)})

(defn- get-project-list [sql-results]
  (mapv single-project-object
        sql-results))

;; TODO these long project lists do not need all of those values returned
(defn get-all-projects [{:keys [params]}]
  (let [user-id        (tc/str->int (:userId params))
        institution-id (tc/str->int (:institutionId params))]
    (data-response (cond
                     (= -1 user-id institution-id)
                     (get-project-list (call-sql "select_all_projects"))

                     (and (neg? user-id) (pos? institution-id))
                     (get-project-list (call-sql "select_all_institution_projects"
                                                 institution-id))

                     (and (pos? user-id) (neg? institution-id))
                     (get-project-list (call-sql "select_all_user_projects"
                                                 user-id))

                     :else
                     (get-project-list (call-sql "select_institution_projects_with_roles"
                                                 user-id
                                                 institution-id))))))

(defn get-project-by-id [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))]
    (data-response (single-project-object (first (call-sql "select_project" project-id))))))

(defn get-project-stats [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        stats      (first (call-sql "select_project_statistics" project-id))]
    (data-response {:flaggedPlots    (:flagged_plots stats)
                    :analyzedPlots   (:assigned_plots stats) ;TODO why dont these variable match? unanalyzed is not a word, but unassigned is.
                    :unanalyzedPlots (:unassigned_plots stats)
                    :members         (:members stats)
                    :contributors    (:contributors stats)
                    :createdDate     (:created_date stats)
                    :publishedDate   (:published_date stats)
                    :closedDate      (:closed_date stats)
                    :archivedDate    (:archived_date stats)
                    :userStats       (json/read-str (:user_stats stats))}))) ; FIXME, is json/read-str needed?

(defn dump-project-aggregate-data [request])

(defn dump-project-raw-data [request])

(defn publish-project [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))]
    (call-sql "publish_project" project-id)
    (data-response "")))

(defn close-project [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))]
    (call-sql "close_project" project-id)
    (data-response "")))

(defn archive-project [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))]
    (call-sql "archive_project" project-id)
    (data-response "")))

(defn update-project [request])

(defn create-project [request])

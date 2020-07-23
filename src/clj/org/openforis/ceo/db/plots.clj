(ns org.openforis.ceo.db.plots
  (:require [clojure.data.json :as json]
            [org.openforis.ceo.database :refer [call-sql sql-primitive]]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.views :refer [data-response]]))

(defn get-project-plots [{:keys [params]}]
  (let [project-id (tc/str->int (:projectId params))
        max-plots  (tc/str->int (:maxPlots params) 1000)]
    (data-response (map-imagery (call-sql "select_imagery_by_institution" institution-id user-id)
                                (is-inst-admin-query user-id institution-id))))
  )

(defn get-project-plot [{:keys [params]}])

(defn get-plot-by-id [{:keys [params]}])

(defn get-next-plot [{:keys [params]}])

(defn get-prev-plot [{:keys [params]}])

(defn add-user-samples [{:keys [params]}])

(defn flag-plot [{:keys [params]}])

(defn reset-plot-lock [{:keys [params]}])

(defn release-plot-locks [{:keys [params]}])

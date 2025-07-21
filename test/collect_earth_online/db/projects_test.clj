(ns collect-earth-online.db.projects
  (:require [clojure.test :refer [is deftest testing]]
            [collect-earth-online.db.projects :as projects]))

(comment
  
  (def mock-data {:user_id 0 :email "admin@ceo.dev"})
  (deftest pure-function-test
    (is (= 0 0)))
  (deftest side-effect-test
    (with-redefs [db/query (constantly mock-data)]
      (is (= 0 0))))
  )

(deftest ^:unit can-collect?)

(deftest ^:unit is-proj-admin?)

(deftest ^:unit get-home-projects)

(deftest ^:unit get-institution-projects)

(deftest ^:unit get-institution-dash-projects)

(deftest ^:unit get-template-projects)

(deftest ^:unit get-project-by-id)

(deftest ^:unit get-template-by-id)

(deftest ^:unit get-project-stats)
n
(deftest ^:unit create-project!)

(deftest ^:unit reset-collected-samples!)

(deftest ^:unit update-project!)

(deftest ^:unit publish-project!)

(deftest ^:unit close-project!)

(deftest ^:unit archive-project!)

(deftest ^:unit plots->csv-response)

(deftest ^:unit dump-project-aggregate-data!)

(deftest ^:unit dump-project-raw-data!)

(deftest ^:unit create-shape-files!)

(deftest ^:unit check-plot-csv)

(deftest ^:unit get-project-drafts-by-user)

(deftest ^:unit get-project-draft-by-id)

(deftest ^:unit create-project-draft!)

(deftest ^:unit update-project-draft!)

(deftest ^:unit delete-project-draft!)

(deftest ^:unit edit-projects-bulk!)

(deftest ^:unit edit-projects-bulk!)

(deftest ^:unit download-projects-bulk!)

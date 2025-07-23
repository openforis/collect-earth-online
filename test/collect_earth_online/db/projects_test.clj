(ns collect-earth-online.db.projects-test
  (:require [clojure.edn                      :as edn]
            [clojure.test                     :refer [is deftest testing]]
            [collect-earth-online.db.projects :as projects]
            [triangulum.database              :refer [call-sql sql-primitive]]
            [triangulum.type-conversion       :as tc]))

(deftest ^:unit can-collect?-test
  (testing "Happy path: A user that is allowed to collect for given project"
    (is (projects/can-collect? 1 1 "")))
  (testing "A user that is not allowed to collect for given project")
  (testing "Cannot find user")
  (testing "Cannot find project"))

(deftest ^:unit is-proj-admin?-test
  (testing "Happy path: Given user is an admin for given project")
  (testing "Given user is not an admin for given project")
  (testing "User cannot be found in db")
  (testing "Project cannot be found in db"))

(deftest ^:unit get-home-projects-test
  (testing "Happy Path: finds projects"
    (with-redefs [call-sql (fn [& _]
                             [{:project_id 1
                               :institution_id 1
                               :name "Test Project"
                               :description ""
                               :centroid (tc/clj->json {"type" "Point"
                                                        "coordinates" [101 16.5]})}])]
      (let [{:keys [status body] :as response}
            (projects/get-home-projects "home-projects-params")]
        (is (= status 200)
            (vector? body)))))
  (testing "Empty Result case"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body] :as response}
            (projects/get-home-projects "empty-result-params")]
        (is (= status 200)
            (= body "[]")))))
  (testing "Invalid params throw"))

(deftest ^:unit get-institution-projects-test
  (testing "Happy Path: finds projects"
    (with-redefs [call-sql (fn [& _]
                             [{:project_id 0
                               :name ""
                               :privacy_level ""
                               :pct_complete 0.0
                               :num_plots 0
                               :learning_material ""}])]
      (let [{:keys [status body] :as response}
            (projects/get-institution-projects "happy-path-params")]
        (is (= status 200)
            (vector? body)))))
  (testing "Empty Result Case"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body] :as response}
            (projects/get-institution-projects "empty-result-params")]
        (is (= status 200)
            (= body "[]")))))
  (testing "Invalid Params Throw"))

(deftest ^:unit get-institution-dash-projects-test
  (testing "Happy Path: finds projects"
    (with-redefs [call-sql (fn [& _]
                             [{:projectId 0
                               :name ""
                               :stats nil}])]
      (let [{:keys [status body]}
            (projects/get-institution-dash-projects "happy-path-params")]
        (is (= status 200)
            (vector? body)))))
  (testing "Empty Results path"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body] :as response}
            (projects/get-institution-dash-projects "empty-result-params")]
        (is (= status 200)
            (= body "[]")))))
  (testing "Invalid results throw"))

(deftest ^:unit get-template-projects-test
  (testing "Happy Path: finds projects"
    (with-redefs [call-sql (fn [& _]
                             [{:project_id 0
                               :name ""
                               :institution_id 0}])]
      (let [{:keys [status body] :as response}
            (projects/get-template-projects "happy-path-params")]
        (is (= status 200)
            (vector? body)))))
  (testing "Empty Results path"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body ]:as response}
            (projects/get-template-projects "empty-result-params")]
        (is (= status 200)
            (= body "[]")))))
  (testing "Invalid results throw"))


#_(deftest ^:unit get-project-by-id-test
  (testing "Happy Path: finds projects"
    (with-redefs [build-project-by-id (fn [& _] [])]
      (let [{:keys [status body] :as response}
            (projects/get-project-by-id "happy-path-params")])))
  (testing "Empty Results Path"
    (with-redefs [build-project-by-id (constantly [])]
      (let [{:keys [status body] :as response}
            (projects/get-project-by-id "empty-result-params")])))
  (testing "Invalid Results Throw"))


(deftest ^:unit get-template-by-id-test
  (testing "Happy Path: finds projects"
    (with-redefs [call-sql (fn [& _] []
                             #_(edn/read-string
                              (slurp "test/data/sample_project.edn")))]
      (let [{:keys [status body] :as response}
            (projects/get-template-by-id "happy-path-params")]
        (is (= status 200)
            (vector? body)))))
  (testing "Empty Results path"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body ]:as response}
            (projects/get-template-by-id "empty-result-params")]
        (is (= status 200)
            (= body "[]")))))
  (testing "Invalid results throw"))

(deftest ^:unit get-project-stats-test
  (testing "Happy Path: finds projects"
    (with-redefs [call-sql (fn [& _]
                             [{:average_confidence 0,
                               :total_plots 0,
                               :partial_plots 0,
                               :users_assigned 0,
                               :flagged_plots 0,
                               :user_stats nil
                               :analyzed_plots 0,
                               :unanalyzed_plots 0,
                               :plot_assignments 0}])]
      (let [{:keys [status body] :as response}
            (projects/get-project-stats "happy-path-params")]
        (is (= status 200)
            (vector? body)))))
  (testing "Empty Results path"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body ]:as response}
            (projects/get-project-stats "empty-result-params")]
        (is (= status 200)
            (= body "[]")))))
  (testing "Invalid results throw"))

(deftest ^:unit create-project!-test)

(deftest ^:unit reset-collected-samples!-test)

(deftest ^:unit update-project!-test)

(deftest ^:unit publish-project!-test)

(deftest ^:unit close-project!-test)

(deftest ^:unit archive-project!-test)

(deftest ^:unit plots->csv-response-test)

(deftest ^:unit dump-project-aggregate-data!-test)

(deftest ^:unit dump-project-raw-data!-test)

(deftest ^:unit create-shape-files!-test)

(deftest ^:unit check-plot-csv-test)

(deftest ^:unit get-project-drafts-by-user-test
  (testing "Happy Path: finds projects"
    (with-redefs [call-sql (fn [& _]
                             [])]
      (let [{:keys [status body] :as response}
            (projects/get-project-drafts-by-user "happy-path-params")]
        (is (= status 200)
            (vector? body)))))
  (testing "Empty Results path"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body] :as response}
            (projects/get-project-drafts-by-user "empty-result-params")]
        (is (= status 200)
            (= body "[]")))))
  (testing "Invalid results throw"))

(deftest ^:unit get-project-draft-by-id-test
  (testing "Happy Path: finds projects"
    (with-redefs [call-sql (fn [& _]
                             [])]
      (let [{:keys [status body] :as response}
            (projects/get-project-draft-by-id "happy-path-params")]
        (is (= status 200)
            (vector? body)))))
  (testing "Empty Results path"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body] :as response}
            (projects/get-project-draft-by-id "empty-result-params")]
        (is (= status 200)
            (= body "[]")))))
  (testing "Invalid results throw"))

(deftest ^:unit create-project-draft!-test)

(deftest ^:unit update-project-draft!-test)

(deftest ^:unit delete-project-draft!-test)

(deftest ^:unit edit-projects-bulk!-test)

(deftest ^:unit edit-projects-bulk!-test)

(deftest ^:unit download-projects-bulk!-test)

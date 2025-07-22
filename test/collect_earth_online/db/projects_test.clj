(ns collect-earth-online.db.projects
  (:require [clojure.test :refer [is deftest testing]]
            [clojure.test.check.generators :as [gen]]
            [collect-earth-online.db.projects :as projects]
            [triangulum.database :refer [call-sql sql-primitive]]))

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
    (with-redefs [call-sql (fn [])]
      (let [response (projects/get-home-projects "happy-path-params")]
        (is (= 200 (:status response))
            (vector? (:body response))))))
  (testing "Empty Result case"
    (with-redefs [call-sql (constantly [])]
      (is (= {:status 200 :body []}
             (projects/get-home-projects "empty-result-params")))))
  (testing "Invalid params throw"
    (is (thrown? Exception (projects/get-home-projects "invalid-params")))))

(deftest ^:unit get-institution-projects-test)

(deftest ^:unit get-institution-dash-projects-test)

(deftest ^:unit get-template-projects-test)

(deftest ^:unit get-project-by-id-test)

(deftest ^:unit get-template-by-id-test)

(deftest ^:unit get-project-stats-test)
n
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

(deftest ^:unit get-project-drafts-by-user-test)

(deftest ^:unit get-project-draft-by-id-test)

(deftest ^:unit create-project-draft!-test)

(deftest ^:unit update-project-draft!-test)

(deftest ^:unit delete-project-draft!-test)

(deftest ^:unit edit-projects-bulk!-test)

(deftest ^:unit edit-projects-bulk!-test)

(deftest ^:unit download-projects-bulk!-test)

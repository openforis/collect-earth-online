(ns collect-earth-online.db.projects-test
  (:require [clojure.edn                      :as edn]
            [clojure.java.io                  :as io]
            [clojure.string                   :as str]
            [clojure.test                     :refer [is deftest testing]]
            [collect-earth-online.db.projects :as projects]
            [collect-earth-online.generators.external-file :as external-file]
            [triangulum.database              :refer [call-sql sql-primitive]]
            [triangulum.type-conversion       :as tc]))


(deftest ^:unit can-collect?-test
  (testing "Happy path: A user that is allowed to collect for given project"
    (with-redefs [call-sql (fn [& _] [{:always true}])]
      (is (projects/can-collect? 'foo 'bar 'baz))))
  
  (testing "A user that is not allowed to collect for given project"
    (with-redefs [call-sql (fn [& _] [{:always false}])]
      (is (false? (projects/can-collect? 'foo 'bar 'baz)))))
  
  (testing "Cannot find user")
  
  (testing "Cannot find project"))


(deftest ^:unit is-proj-admin?-test
  (testing "Happy path: Given user is an admin for given project"
    (with-redefs [call-sql (fn [& _] [{:always true}])]
      (is (projects/is-proj-admin? 'foo 'bar 'baz))))
  
  (testing "Given user is not an admin for given project"
    (with-redefs [call-sql (fn [& _] [{:always false}])]
      (is (false? (projects/is-proj-admin? 'foo 'bar 'baz)))))
  
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


(deftest ^:unit get-project-by-id-test
  (testing "Happy Path: finds projects"
    (with-redefs [call-sql (fn [& _] [])
                  sql-primitive (fn [& _] {})]
      (let [{:keys [status body] :as response}
            (projects/get-project-by-id "happy-path-params")])))
  
  (testing "Empty Results Path"
    (with-redefs [call-sql (constantly [])
                  sql-primitive (constantly {})]
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


(deftest ^:unit create-project!-test
  (testing "this function has private dependencies"))


(deftest ^:unit reset-collected-samples!-test
  (testing "this function has private dependencies"))


(deftest ^:unit update-project!-test
  (testing "this function has private dependencies"))


(deftest ^:unit publish-project!-test
  (testing "this function has private dependencies"))


(deftest ^:unit close-project!-test
  (testing "this function has private dependencies"))


(deftest ^:unit archive-project!-test
  (testing "Happy Path: project archived"
    (with-redefs [call-sql (constantly nil)]
      (let [{:keys [status body] :as response}
            (projects/archive-project! "happy-path-params")]        
        (is (= status 200)
            (= body "")))))
  
  (testing "Error path: cannot find project"
    (with-redefs [call-sql (constantly nil)]
      (let [{:keys [status body] :as response}
            (projects/archive-project! "error-path-params")]
        (is (= body "\"\"")))))
  
  (testing "Error path: Invalid params"))


(deftest ^:unit plots->csv-response-test
  (testing "this function has private dependencies"))


(deftest ^:unit dump-project-aggregate-data!-test
  (testing "this function has private dependencies"))


(deftest ^:unit dump-project-raw-data!-test
  (testing "this function has private dependencies"))


(deftest ^:unit create-shape-files!-test
  (testing "Happy path: uploads shp file"
    (with-redefs [external-file/zip-shape-files (constantly :foo)
                  str/split (constantly [])
                  io/file (constantly "")]
      (let [{:keys [status body] :as response}
            (projects/create-shape-files! "happy-path-params")]
        (is (= status 200)
            (= body "")))))
  
  (testing "error path: shapefile error"
    (with-redefs [external-file/zip-shape-files (constantly nil)
                  str/split (constantly [])
                  io/file (constantly "")]
      (let [{:keys [status body] :as response}
            (projects/create-shape-files! "error-path-params")]
        (is (= status 500)
            (= body ""))))))


(deftest ^:unit check-plot-csv-test
  (testing "Happy Path: returns data on provided csv"
    (with-redefs [external-file/load-external-data! (constantly [])
                  str/split (constantly [])
                  str/replace (constantly "")]
      (let [{:keys [status body] :as response}
            (projects/check-plot-csv "happy-path-params")]
        (is (= status 200))))))


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
    (with-redefs [call-sql (constantly [{}])]
      (let [{:keys [status body] :as response}
            (projects/get-project-draft-by-id "happy-path-params")]
        (is (= status 200)
            (vector? body)))))
  
  (testing "Empty Results path"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body] :as response}
            (projects/get-project-draft-by-id "empty-result-params")]
        (is (= status 404)
            (= body "[]")))))
  
  (testing "Invalid results throw"))


(deftest ^:unit create-project-draft!-test
  (testing "Happy Path: creates project draft"
    (with-redefs [call-sql (constantly [{:foo 1}])]
      (let [{:keys [status body] :as response}
            (projects/create-project-draft! "happy-path-params")]
        (is (= status 200)))))
  
  (testing "Error path: unable to find project"
    (with-redefs [call-sql (constantly [{:foo 0}])]
      (let [{:keys [status body] :as response}
            (projects/create-project-draft! "error-path-params")]
        (is (= status 500))))))


(deftest ^:unit update-project-draft!-test
  (testing "Happy path: updates draft project"
    (with-redefs [call-sql (constantly [{:update_project_draft 0}])]
      (let [{:keys [status body] :as response}
            (projects/update-project-draft! "happy-path-params")]
        (is (= status 200)))))
  
  (testing "error path: project draft not found"
    (with-redefs [call-sql (constantly [{:update_project_draft nil}])]
      (let [{:keys [status body] :as response}
            (projects/update-project-draft! "error-path-params")]
        (is (= status 404)))))
  
  (testing "error path: invalid params"))


(deftest ^:unit delete-project-draft!-test
  (testing "Happy path: deletes draft project"
    (with-redefs [call-sql (constantly [{:delete_project_draft 0}])]
      (let [{:keys [status body] :as response}
            (projects/delete-project-draft! "happy-path-params")]
        (is (= status 200)))))
  
  (testing "error path: project draft not found"
    (with-redefs [call-sql (constantly [{:delete_project_draft nil}])]
      (let [{:keys [status body] :as response}
            (projects/delete-project-draft! "error-path-params")]
        (is (= status 404)))))
  
  (testing "error path: invalid params"))


(deftest ^:unit edit-projects-bulk!-test
  (testing "Happy path: upserts to bulk projects"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body] :as response}
            (projects/edit-projects-bulk! "happy-path-params")]
        (is (= status 200)))))
  
  (testing "Error path: internal server error"))


(deftest ^:unit delete-projects-bulk!-test
  (testing "Happy path: deletes bulk projects"
    (with-redefs [call-sql (constantly [])]
      (let [{:keys [status body] :as response}
            (projects/delete-projects-bulk! "happy-path-params")]
        (is (= status 200)))))
  
  (testing "Error path: internal server error"))


(deftest ^:unit download-projects-bulk!-test
  (testing "Happy path: downloads bulk projects"
    (with-redefs [external-file/bulk-download-zip (constantly "files.zip")
                  str/split (constantly [])
                  io/file (constantly "")]
      (let [{:keys [status body] :as response}
            (projects/download-projects-bulk "happy-path-params")]
        (is (= status 200)
            (= body "")))))
  
  (testing "Error path: shapefile error"
    (with-redefs [external-file/bulk-download-zip (constantly nil)
                  str/split (constantly [])]
      (let [{:keys [status body] :as response}
            (projects/download-projects-bulk "shapefile-error-params")]
        (is (= status 500)))))
  
  (testing "Invalid Params"))

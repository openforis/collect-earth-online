(ns collect-earth-online.core-test
  (:require [clojure.edn                   :as edn]
            [clojure.test                  :refer [is deftest testing]]
            [clojure.test.check            :as tc]
            [clojure.test.check.generators :as tg]
            [clojure.test.check.properties :as tp]
            [collect-earth-online.db.projects-test :refer :all]
            [malli.core                    :as m]
            [triangulum.database :refer [call-sql] ]))

(comment
  ;;determine testability:
  ;; - pure functions with no side-effects
  ;; - impure functions: I/O, db calls, state mutation
  ;; - api wrappers, db connectors, html connections
  ;; - critical logic
  ;; - error handling

  ;; testing properties instead of specific cases:
  ;; (defn reverse-twice [input] (reverse (reverse input)))
  ;; (deftest reverse-twice-test
  ;;  (with-redefs [expected (list :foo :bar)]
  ;;  (is (= expected (list :foo :bar))

  ;; stubs replace real dependencies eg APIs, DBs with mock data
  (deftest process-data-test
    (with-redefs [call-sql (constantly {:user_id 0 :email "admin@ceo.dev"})]
      (let [prop ])))
  
  (def mock-data {:user_id 0 :email "admin@ceo.dev"})
  
  (deftest pure-function-test
    (is (= 0 0)))
  (deftest side-effect-test
    (with-redefs [db/query (constantly mock-data)]
      (is (= 0 0))))
  )



(deftest ^:unit dummy-test
  (testing "This test fails"
    (is false))
  (testing "This test passes"
    (is (= 2 (+ 1 1)))))

(deftest ^:unit sample-data-test
  (testing "Test data conforms to spec"
    (let [user (edn/read-string (slurp "test/data/sample_user.edn"))
          user-spec [:map
                     [:user_id :int]
                     [:email :string]
                     [:administrator :boolean]
                     [:reset_key [:maybe :string]]]
          valid? (m/validate user-spec user)]      
      (is valid?))))

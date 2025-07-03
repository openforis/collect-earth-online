(ns collect-earth-online.core-test
  (:require [clojure.edn     :as edn]
            [clojure.test    :refer [is deftest testing]]
            [malli.core      :as m]))

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

(ns collect-earth-online.git
  (:require [clojure.string     :as str]
            [clojure.data.json  :as json]
            [clj-http.client    :as client]))

;; Constants

(def ^:private tags-url "https://api.github.com/repos/openforis/collect-earth-online/tags")

;; Cache

(def ^:private version  (atom nil))

;; Private Fns

(defn- get-all-tags []
  (let [{:keys [status body]} (client/get tags-url)]
    (when (= 200 status)
      (json/read-str body :key-fn keyword))))

(defn- latest-prod-tag []
  (->> (get-all-tags)
       (map :name)
       (filter #(str/starts-with? %1 "prod"))
       (sort)
       (last)))

;; Public Fns

(defn current-version []
  (if-not (nil? @version)
    @version
    (reset! version (latest-prod-tag))))

(ns collect-earth-online.utils.project
  (:require [collect-earth-online.utils.part-utils :as pu]))

;;; Check plot limits

(defn check-plot-limits [plots plot-limit]
  (cond
    (= 0 plots)
    (pu/init-throw  "You cannot create a project with 0 plots.")

    (> plots plot-limit)
    (pu/init-throw  (str "This action will create "
                         plots
                         " plots. The maximum allowed for the selected plot distribution is "
                         plot-limit
                         "."))))

(defn check-sample-limits [samples sample-limit samples-per-plot per-plot-limit]
  (cond
    (= 0 samples-per-plot)
    (pu/init-throw  "You cannot create a project with 0 samples per plot.")

    (> samples-per-plot per-plot-limit)
    (pu/init-throw  (str "This action will create "
                         samples-per-plot
                         " samples per plot. The maximum allowed for the selected sample distribution is "
                         per-plot-limit
                         "."))

    (> samples sample-limit)
    (pu/init-throw  (str "This action will create "
                         samples
                         " total samples. The maximum allowed for the selected distribution types is "
                         sample-limit
                         "."))))

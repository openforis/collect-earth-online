(ns collect-earth-online.generators.clj-point
  (:require [triangulum.type-conversion :as tc]
            [triangulum.database        :refer [call-sql]]
            [collect-earth-online.utils.project    :refer [check-plot-limits check-sample-limits]]
            [collect-earth-online.utils.geom       :refer [make-wkt-point
                                                           EPSG:3857->4326
                                                           EPSG:4326->3857
                                                           epsg3857-point-resolution]]
            [collect-earth-online.utils.part-utils :refer [init-throw]]))

;;; Helpers

(defn- distance [x1 y1 x2 y2]
  (Math/sqrt (+ (Math/pow (- x2 x1) 2.0)
                (Math/pow (- y2 y1) 2.0))))

(defn- pad-bounds [left bottom right top buffer]
  [(+ left buffer) (+ bottom buffer) (- right buffer) (- top buffer)])

(defn- filter-circle [circle? center-x center-y radius buffer coll]
  (if circle?
    (filter (fn [[x y]]
              (< (distance center-x center-y x y)
                 (- radius buffer)))
            coll)
    coll))

(defn- random-num [offset size]
  (+ offset
     (* (Math/random) size)))

;;; Gridded

(defn- get-all-gridded-points [left bottom right top spacing]
  (let [x-range   (- right left)
        y-range   (- top bottom)
        x-steps   (Math/floor (/ x-range spacing))
        y-steps   (Math/floor (/ y-range spacing))
        x-padding (/ (- x-range (* x-steps spacing)) 2.0)
        y-padding (/ (- y-range (* y-steps spacing)) 2.0)]
    (for [x (range (inc x-steps))
          y (range (inc y-steps))]
      [(+ (* x spacing) left x-padding) (+ (* y spacing) bottom y-padding)])))

(defn- create-gridded-sample-set [circle? center-x center-y radius buffer sample-resolution]
  (let [[left bottom right top] (pad-bounds (- center-x radius)
                                            (- center-y radius)
                                            (+ center-x radius)
                                            (+ center-y radius)
                                            buffer)]
    (->> (get-all-gridded-points left bottom right top sample-resolution)
         (filter-circle circle? center-x center-y radius buffer)
         (map EPSG:3857->4326))))

(defn- create-gridded-plots-in-bounds [project-id plot-size plot-spacing]
  (let [plots (->> (call-sql "select_project_features" project-id)
                   (mapcat
                    (fn [{:keys [feature]}]
                      (call-sql "gridded_points_in_bounds" {:log? false} feature plot-spacing (/ plot-size 2.0)))))]
    (check-plot-limits (count plots) 5000.0)
    (map (fn [{:keys [lon lat]}] [lon lat]) plots)))

;;; Random

(defn- filter-random-points [num-plots spacing seed-points]
  (loop [seed-points  seed-points
         final-points []
         iterations   0]
    (cond
      (>= (count final-points) num-plots)
      final-points

      (empty? seed-points)
      (init-throw "Unable to generate random plots.  Try a lower number of plots, smaller plot size, or bigger area.")

      :else
      (let [test-point (first seed-points)]
        (recur (rest seed-points)
               (if (some (fn [[x1 y1]]
                           (let [[x2 y2] test-point
                                 dist (distance x1 y1 x2 y2)]
                             (< dist spacing)))
                         final-points)
                 final-points
                 (conj final-points test-point))
               (inc iterations))))))

(defn- random-point-in-bounds [left bottom right top]
  [(random-num left (- right left)) (random-num bottom (- top bottom))])

(defn- random-point-in-circle [center-x center-y radius]
  (let [r     (* radius (Math/sqrt (Math/random)))
        theta (* (Math/random) 2 Math/PI)]
    [(+ center-x (* r (Math/cos theta))) (+ center-y (* r (Math/sin theta)))]))

(defn- create-random-sample-set [circle? center-x center-y radius spacing samples-per-plot]
  (let [[left bottom right top] (pad-bounds (- center-x radius)
                                            (- center-y radius)
                                            (+ center-x radius)
                                            (+ center-y radius)
                                            spacing)] ; Add buffer = spacing
    (->> (filter-random-points samples-per-plot
                               spacing
                               (if circle?
                                 (take (* 2 samples-per-plot)
                                       (repeatedly #(random-point-in-circle center-x center-y (- radius spacing))))
                                 (take (* 2 samples-per-plot)
                                       (repeatedly #(random-point-in-bounds left bottom right top)))))
         (map EPSG:3857->4326))))

(defn- create-random-plots-in-bounds [project-id plot-size num-plots]
  (let [features (call-sql "select_project_features" project-id)]
    (check-plot-limits (* num-plots (count features)) 5000.0)
    (->> features
         (mapcat (fn [{:keys [feature]}]
                   (->> (call-sql "random_points_in_bounds" {:log? false} feature (/ plot-size 2) (* 2 num-plots))
                        (map (fn [{:keys [x y]}] [x y]))
                        (filter-random-points num-plots plot-size)
                        (map EPSG:3857->4326)))))))

(defn generate-point-samples [plots
                              plot-count
                              plot-shape
                              plot-size
                              sample-distribution
                              samples-per-plot
                              sample-resolution]
  (let [circle?           (= plot-shape "circle")
        {:keys [lon lat]} (first plots)
        correction-factor (epsg3857-point-resolution (EPSG:4326->3857 [lon lat]))
        radius            (/ plot-size 2.0 correction-factor)
        buffer            (/ radius 25.0 correction-factor)
        samples-per-plot  (case sample-distribution
                            "gridded" (count (create-gridded-sample-set
                                              circle?
                                              45
                                              45
                                              radius
                                              buffer
                                              sample-resolution))
                            "random"  samples-per-plot
                            "center"  1.0
                            "none"    1.0)]
    (check-sample-limits (* plot-count samples-per-plot)
                         50000.0
                         samples-per-plot
                         200.0)
    (mapcat (fn [{:keys [plot_id visible_id lon lat]}]
              (let [[center-x center-y]    (EPSG:4326->3857 [lon lat])
                    visible-offset         (-> (dec visible_id)
                                               (* samples-per-plot)
                                               (inc))
                    plot-correction-factor (epsg3857-point-resolution [center-x center-y])
                    plot-radius            (/ plot-size 2.0 plot-correction-factor)
                    plot-sample-resolution (/ sample-resolution plot-correction-factor)]
                (map-indexed (fn [idx [sample-lon sample-lat]]
                               {:plot_rid    plot_id
                                :visible_id  (+ idx visible-offset)
                                :sample_geom (tc/str->pg (make-wkt-point sample-lon sample-lat) "geometry")})
                             (cond
                               (= "center" sample-distribution)
                               [[lon lat]]

                               (= "gridded" sample-distribution)
                               (create-gridded-sample-set circle? center-x center-y plot-radius buffer plot-sample-resolution)

                               (= "random" sample-distribution)
                               (create-random-sample-set circle? center-x center-y plot-radius buffer samples-per-plot)

                               :else []))))
            plots)))

(defn generate-point-plots [project-id
                            plot-distribution
                            num-plots
                            plot-spacing
                            plot-size
                            shuffle-plots?]
  (let [plots (if (= "gridded" plot-distribution)
                (create-gridded-plots-in-bounds project-id plot-size plot-spacing)
                (create-random-plots-in-bounds  project-id plot-size num-plots))]
    (->> (if shuffle-plots? (shuffle plots) plots)
         (map-indexed (fn [idx [lon lat]]
                        {:project_rid project-id
                         :visible_id  (inc idx)
                         :plot_geom   (tc/str->pg (make-wkt-point lon lat) "geometry")})))))

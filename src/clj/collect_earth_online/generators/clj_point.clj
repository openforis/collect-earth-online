(ns collect-earth-online.generators.clj-point
  (:require [triangulum.type-conversion :as tc]
            [collect-earth-online.utils.project :refer [check-plot-limits check-sample-limits]]
            [collect-earth-online.utils.geom    :refer [make-wkt-point EPSG:3857->4326 EPSG:4326->3857]]))

(defn- count-gridded-points [left bottom right top spacing]
  (let [x-range (- right left)
        y-range (- top bottom)
        x-steps (+ (Math/floor (/ x-range spacing)) 1)
        y-steps (+ (Math/floor (/ y-range spacing)) 1)]
    (* x-steps y-steps)))

(defn- count-gridded-sample-set [plot-size sample-resolution]
  (Math/pow (Math/floor (/ plot-size sample-resolution)) 2))

;; Create random and gridded points

(defn- random-with-buffer [side size buffer]
  (+ side
     (* (Math/floor (* (Math/random) size (/ buffer))) buffer)
     (/ buffer 2.0)))

(defn- distance [x1 y1 x2 y2]
  (Math/sqrt (+ (Math/pow (- x2 x1) 2.0)
                (Math/pow (- y2 y1) 2.0))))

(defn- pad-bounds [left bottom right top buffer]
  [(+ left buffer) (+ bottom buffer) (- right buffer) (- top buffer)])

;; TODO Use postGIS so arbitrary bounds can be uploaded
(defn- create-random-points-in-bounds [left bottom right top num-points]
  (let [x-range (- right left)
        y-range (- top bottom)
        buffer  (/ x-range 50.0)]
    (->> (repeatedly (fn [] [(random-with-buffer left x-range buffer) (random-with-buffer bottom y-range buffer)]))
         (take num-points)
         (map #(EPSG:3857->4326 %)))))

;; TODO Use postGIS so arbitrary bounds can be set
(defn- create-gridded-points-in-bounds [left bottom right top spacing]
  (let [x-range   (- right left)
        y-range   (- top bottom)
        x-steps   (Math/floor (/ x-range spacing))
        y-steps   (Math/floor (/ y-range spacing))
        x-padding (/ (- x-range (* x-steps spacing)) 2.0)
        y-padding (/ (- y-range (* y-steps spacing)) 2.0)]
    (->> (for [x (range (+ 1 x-steps))
               y (range (+ 1 y-steps))]
           [(+ (* x spacing) left x-padding) (+ (* y spacing) bottom y-padding)])
         (map #(EPSG:3857->4326 %)))))

;; TODO Use postGIS so can be done with shp files
(defn- create-random-sample-set [plot-center plot-shape plot-size samples-per-plot]
  (let [[center-x center-y] (EPSG:4326->3857 plot-center)
        radius (/ plot-size 2.0)
        left   (- center-x radius)
        right  (+ center-x radius)
        top    (+ center-y radius)
        bottom (- center-y radius)
        buffer (/ radius 50.0)]
    (if (= "circle" plot-shape)
      (->> (repeatedly (fn [] [(random-with-buffer left plot-size buffer) (random-with-buffer bottom plot-size buffer)]))
           (take (* 10 samples-per-plot)) ; just as a safety net, so no thread can get stuck
           (filter (fn [[x y]]
                     (< (distance center-x center-y x y)
                        (- radius (/ buffer 2.0)))))
           (take samples-per-plot)
           (map #(EPSG:3857->4326 %)))
      (create-random-points-in-bounds left bottom right top samples-per-plot))))

(defn- create-gridded-sample-set [plot-center plot-shape plot-size sample-resolution]
  (if (>= sample-resolution plot-size)
    [plot-center]
    (let [[center-x center-y] (EPSG:4326->3857 plot-center)
          radius  (/ plot-size 2.0)
          left    (- center-x radius)
          bottom  (- center-y radius)
          steps   (Math/floor (/ plot-size sample-resolution))
          padding (/ (- plot-size (* steps sample-resolution)) 2.0)]
      (->> (for [x (range (+ 1 steps))
                 y (range (+ 1 steps))]
             [(+ (* x sample-resolution) left padding) (+ (* y sample-resolution) bottom padding)])
           (filter (fn [[x y]] (or (= "square" plot-shape)
                                   (< (distance center-x center-y x y) radius))))
           (map #(EPSG:3857->4326 %))))))

(defn generate-point-samples [plots
                              plot-count
                              plot-shape
                              plot-size
                              sample-distribution
                              samples-per-plot
                              sample-resolution]
  (let [samples-per-plot (case sample-distribution
                           "gridded" (count-gridded-sample-set plot-size sample-resolution)
                           "random"  samples-per-plot
                           "center"  1.0
                           "none"    1.0)]
    (check-sample-limits (* plot-count samples-per-plot)
                         50000.0
                         samples-per-plot
                         200.0)
    (mapcat (fn [{:keys [plot_id visible_id lon lat]}]
              (let [plot-center    [lon lat]
                    visible-offset (-> (dec visible_id)
                                       (* samples-per-plot)
                                       (inc))]
                (map-indexed (fn [idx [lon lat]]
                               {:plot_rid    plot_id
                                :visible_id  (+ idx visible-offset)
                                :sample_geom (tc/str->pg (make-wkt-point lon lat) "geometry")})
                             (case sample-distribution
                               "center"
                               [plot-center]

                               "random"
                               (create-random-sample-set plot-center plot-shape plot-size samples-per-plot)

                               "gridded"
                               (create-gridded-sample-set plot-center plot-shape plot-size sample-resolution)

                               []))))
            plots)))

(defn generate-point-plots [project-id
                            lon-min
                            lat-min
                            lon-max
                            lat-max
                            plot-distribution
                            num-plots
                            plot-spacing
                            plot-size]
  (let [[[left bottom] [right top]] (EPSG:4326->3857 [lon-min lat-min] [lon-max lat-max])
        [left bottom right top]     (pad-bounds left bottom right top (/ 2.0 plot-size))]
    (check-plot-limits (if (= "gridded" plot-distribution)
                         (count-gridded-points left bottom right top plot-spacing)
                         num-plots)
                       5000.0)
    (map-indexed (fn [idx [lon lat]]
                   {:project_rid project-id
                    :visible_id  (inc idx)
                    :plot_geom   (tc/str->pg (make-wkt-point lon lat) "geometry")})
                 (if (= "gridded" plot-distribution)
                   (create-gridded-points-in-bounds left bottom right top plot-spacing)
                   (create-random-points-in-bounds left bottom right top num-plots)))))

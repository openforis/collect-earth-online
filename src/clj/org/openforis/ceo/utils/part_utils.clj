(ns org.openforis.ceo.utils.part-utils)

(defn mapm [f coll]
  (persistent!
   (reduce (fn [acc cur]
             (conj! acc (f cur)))
           (transient {})
           coll)))

;; FIXME: stub
(defn write-file-part-base64 [input-file-name encoded-file output-directory output-file-prefix]
  "")

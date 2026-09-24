(ns collect-earth-online.generators.ce-project.reader
  (:require [clojure.java.io :as io]
            [collect-earth-online.generators.external-file     :refer [unzip-project]]
            [collect-earth-online.generators.ce-project.idml   :as idml]
            [collect-earth-online.generators.ce-project.plots  :as plots]
            [collect-earth-online.generators.ce-project.report :as report]
            [collect-earth-online.generators.ce-project.rules  :as rules]
            [collect-earth-online.generators.ce-project.survey :as survey]
            [triangulum.response :refer [data-response]]))

;;;
;;; Unzipping
;;;
 
(defn- unzip
  "Unzips the upload with external-file/unzip-project and returns the folder.
   unzip-project throws (via part-utils/init-throw) with unzip's stderr when
   the archive can't be extracted; that becomes a readable 400 instead of a 500."
  [file-name file-b64]
  (try
    (unzip-project file-name file-b64)
    (catch clojure.lang.ExceptionInfo _
      (throw (report/fatal "The uploaded file is not a valid .cep (zip) archive.")))))
 
;;;
;;; Conversion
;;;
 
(defn- project-name
  [model props]
  (or (not-empty (:project-name model))
      (not-empty (:survey_name props))
      "Imported Collect Earth project"))
 
(defn cep-dir->project
  "Converts an unzipped .cep folder into the response body (schema/ImportResponse).
   Reads files under `project-dir`; no other side effects."
  ([project-dir] (cep-dir->project project-dir {}))
  ([project-dir opts]
   (let [dir           (io/file project-dir)
         model         (idml/read-survey dir)
         props         (plots/read-properties dir)
         plot-file     (plots/plot-file dir props (idml/key-attributes model))
         question-part (survey/build-questions model opts)
         rule-part     (rules/build-rules model (:index question-part) opts)
         title         (project-name model props)]
     (merge
      {:name              title
       :description       (or (not-empty (:description model)) title)
       :aoiFileName       ""}
      (select-keys plot-file [:plotDistribution :plotFileName :plotFileBase64 :numPlots :aoiFeatures])
      {:projectOptions  (plots/project-options props plot-file)
       :surveyQuestions (:questions question-part)
       :surveyRules     (:rules rule-part)
       :importReport    (report/summarize (concat (:entries plot-file)
                                                  (:entries question-part)
                                                  (:entries rule-part))
                                          {:questions (:questions question-part)
                                           :rules     (:rules rule-part)})}))))

;;;
;;; Handler
;;;
 
(defn import-cep
  "The handler's logic without HTTP wrapping.
   Returns {:status 200 :body ImportResponse}, or {:status 400 :body {:message ...}}
   when the file can't be used (see report/fatal). Anything else is a bug and
   propagates."
  ([file-name file-b64] (import-cep file-name file-b64 {}))
  ([file-name file-b64 opts]
   (try
     {:status 200
      :body   (cep-dir->project (unzip file-name file-b64) opts)}
     (catch clojure.lang.ExceptionInfo e
       (if (report/fatal? e)
         {:status 400 :body {:message (ex-message e)}}
         (throw e))))))
 
(defn import-ce-project
  "Route handler for POST /import-ce-project."
  [{:keys [params]}]
  (let [{:keys [status body]} (import-cep (:fileName params) (:fileb64 params))]
    (data-response body {:status status})))

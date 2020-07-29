(ns org.openforis.ceo.remote-api
  (:require [clojure.repl :refer [demunge]]
            [clojure.string :as str]
            [org.openforis.ceo.logging :refer [log-str]]
            [org.openforis.ceo.views   :refer [data-response]]
            [org.openforis.ceo.db.geodash      :as geodash]
            [org.openforis.ceo.db.imagery      :as imagery]
            [org.openforis.ceo.db.institutions :as institutions]
            [org.openforis.ceo.db.plots        :as plots]
            [org.openforis.ceo.db.projects     :as projects]
            [org.openforis.ceo.db.users        :as users]))

               ;; Users API
(def name->fn {"/account"                        users/update-account ; TODO conform route and fn
               "/login"                          users/login
               "/logout"                         users/logout
               "/register"                       users/register
               "/password-reset"                 users/reset-password
               "/password-request"               users/get-password-reset-key
               "/get-all-users"                  users/get-all-users
               "/get-institution-users"          users/get-institution-users
               "/get-user-details"               users/get-user-details
               "/get-user-stats"                 users/get-user-stats
               "/update-user-institution-role"   users/update-institution-role ; TODO conform route and fn
               "/request-institution-membership" users/request-institution-membership
               "/send-to-mailing-list"           users/submit-email-for-mailing-list ; TODO conform route and fn
               "/unsubscribe-mailing-list"       users/unsubscribe-from-mailing-list ; TODO conform route and fn
               ;; Projects API
               "/dump-project-aggregate-data" projects/dump-project-aggregate-data
               "/dump-project-raw-data"       projects/dump-project-raw-data
               "/get-all-projects"            projects/get-all-projects
               "/get-project-by-id"           projects/get-project-by-id
               "/get-project-stats"           projects/get-project-stats
               "/archive-project"             projects/archive-project
               "/close-project"               projects/close-project
               "/create-project"              projects/create-project
               "/publish-project"             projects/publish-project
               "/update-project"              projects/update-project
               ;; Plots API
               "/get-next-plot"      plots/get-next-plot
               "/get-plot-by-id"     plots/get-plot-by-id
               "/get-prev-plot"      plots/get-prev-plot
               "/get-project-plots"  plots/get-project-plots
               "/get-proj-plot"      plots/get-project-plot
               "/add-user-samples"   plots/add-user-samples
               "/flag-plot"          plots/flag-plot
               "/release-plot-locks" plots/release-plot-locks
               "/reset-plot-lock"    plots/reset-plot-lock
               ;; Institutions API
               "/get-all-institutions"    institutions/get-all-institutions
               "/get-institution-details" institutions/get-institution-details
               "/archive-institution"     institutions/archive-institution
               "/create-institution"      institutions/create-institution
               "/update-institution"      institutions/update-institution
               ;; Imagery API
               "/get-institution-imagery"     imagery/get-institution-imagery
               "/get-project-imagery"         imagery/get-project-imagery
               "/get-public-imagery"          imagery/get-public-imagery
               "/add-geodash-imagery"         imagery/add-geodash-imagery
               "/add-institution-imagery"     imagery/add-institution-imagery
               "/update-institution-imagery"  imagery/update-institution-imagery
               "/archive-institution-imagery" imagery/archive-institution-imagery
               ;; GeoDash API
               ;; TODO flatten routes, conform names and functions
               "/geo-dash/get-by-projid"   geodash/geodash-id
               "/geo-dash/create-widget"   geodash/create-dashboard-widget-by-id
               "/geo-dash/delete-widget"   geodash/delete-dashboard-widget-by-id
               "/geo-dash/gateway-request" geodash/gateway-request
               "/geo-dash/update-widget"   geodash/update-dashboard-widget-by-id})

(defn fn->sym [f]
  (-> (str f)
      (demunge)
      (str/split #"@")
      (first)
      (symbol)))

(defn api-handler [uri]
  (fn [request]
    (let [function   (name->fn uri)
          api-result (function request)]
      (log-str "API call to " (fn->sym function))
      (if (:body api-result)
        api-result
        (data-response api-result)))))

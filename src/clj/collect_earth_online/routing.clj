(ns collect-earth-online.routing
  (:require [collect-earth-online.api :refer [validate]]
            [collect-earth-online.generators.ce-project :as ce-project]
            [collect-earth-online.gcloud          :as gcloud]
            [collect-earth-online.sse             :as sse]
            [collect-earth-online.db.doi          :as doi]
            [collect-earth-online.db.geoai        :as geoai]
            [collect-earth-online.db.geodash      :as geodash]
            [collect-earth-online.db.geoai        :as geoai]          
            [collect-earth-online.db.imagery      :as imagery]
            [collect-earth-online.db.institutions :as institutions]
            [collect-earth-online.db.metrics      :as metrics]
            [collect-earth-online.db.plots        :as plots]
            [collect-earth-online.db.projects     :as projects]
            [collect-earth-online.db.qaqc         :as qaqc]
            [collect-earth-online.db.users        :as users]            
            [collect-earth-online.handlers :refer [crumb-data]]
            [collect-earth-online.proxy           :as proxy]
            [triangulum.views                     :refer [render-page]]))

(def routes
  {;; Page Routes
   [:get  "/"]                               {:handler (render-page "/home")}
   [:get  "/about"]                          {:handler (render-page "/about")}
   [:get  "/account"]                        {:handler     (render-page "/account")
                                              :auth-type   :user
                                              :auth-action :redirect}
   [:get  "/collection"]                     {:handler     (render-page "/collection")
                                              :auth-type   :collect
                                              :auth-action :redirect}
   [:get  "/simple-collection"]              {:handler     (render-page "/simple-collection")
                                              :auth-type   :token
                                              :auth-action :block}
   [:get  "/create-institution"]             {:handler     (render-page "/create-institution")
                                              :auth-type   :user
                                              :auth-action :redirect}
   [:get  "/create-project"]                 {:handler     (render-page "/project-admin")
                                              :auth-type   :admin
                                              :auth-action :redirect}
   [:get  "/geo-dash"]                       {:handler     (render-page "/geo-dash")
                                              :auth-type   :collect
                                              :auth-action :redirect}
   [:get  "/geo-dash-help"]                  {:handler (render-page "/geo-dash-help")}
   [:get  "/home"]                           {:handler (render-page "/home")}
   [:get  "/institution-dashboard"]          {:handler     (render-page "/institution-dashboard")
                                              :auth-type   :admin
                                              :auth-action :redirect}
   [:get  "/login"]                          {:handler (render-page "/login")}
   [:get  "/password-request"]               {:handler (render-page "/password-request")}
   [:get  "/password-reset"]                 {:handler (render-page "/password-reset")}
   [:get  "/verify-email"]                   {:handler (render-page "/verify-email")}
   [:get  "/project-dashboard"]              {:handler     (render-page "/project-dashboard")
                                              :auth-type   :admin
                                              :auth-action :redirect}
   [:get  "/register"]                       {:handler (render-page "/register")}
   [:get  "/review-institution"]             {:handler (render-page "/review-institution")}
   [:get  "/review-project"]                 {:handler     (render-page "/project-admin")
                                              :auth-type   :admin
                                              :auth-action :redirect}
   [:get  "/support"]                        {:handler (render-page "/support")}
   [:get  "/user-disagreement"]              {:handler (render-page "/user-disagreement")}
   [:get  "/terms-of-service"]               {:handler (render-page "/terms-of-service")}
   [:get  "/widget-layout-editor"]           {:handler     (render-page "/widget-layout-editor")
                                              :auth-type   :admin
                                              :auth-action :redirect}
   [:get  "/metrics"]                        {:handler     (render-page "/metrics")
                                              :auth-type   :metrics
                                              :auth-action :block}
   [:get  "/project-qaqc-dashboard"]         {:handler     (render-page "/project-qaqc-dashboard")
                                              :auth-type   :admin
                                              :auth-action :redirect}

   ;; Users API
   [:get  "/check-email-taken"]              {:handler     users/check-email-taken}
   [:post "/resend-validation-email"]        {:handler     users/resend-validation-email}
   [:get  "/get-institution-users"]          {:handler     users/get-institution-users
                                              :auth-type   :user
                                              :auth-action :block}
   [:get  "/get-user-admin-institutions"]    {:handler     users/get-user-admin-institutions
                                              :auth-type   :user
                                              :auth-action :block}
   [:get  "/get-user-stats"]                 {:handler     users/get-user-stats
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/account"]                        {:handler     users/update-account
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/login"]                          {:handler users/login}
   [:post "/logout"]                         {:handler users/logout}
   [:post "/update-user-institution-role"]   {:handler     users/update-institution-role
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/add-user-to-institution"]        {:handler     #'users/add-user-to-institution
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/request-institution-membership"] {:handler     users/request-institution-membership
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/password-request"]               {:handler users/password-request}
   [:post "/password-reset"]                 {:handler users/password-reset}
   [:post "/verify-email"]                   {:handler users/verify-email}
   [:post "/register"]                       {:handler users/register}
   [:post "/confirm-data-sharing"]           {:handler #'users/confirm-data-sharing!}
   ;; Projects API
   [:get  "/dump-project-aggregate-data"]    {:handler     projects/dump-project-aggregate-data!
                                              :auth-type   :admin
                                              :auth-action :block}
   [:get  "/dump-project-raw-data"]          {:handler     projects/dump-project-raw-data!
                                              :auth-type   :admin
                                              :auth-action :block}
   [:get  "/download-projects-bulk"]         {:handler     projects/download-projects-bulk
                                              :auth-type   :admin
                                              :auth-action :block}
   [:get  "/get-home-projects"]              {:handler projects/get-home-projects}
   [:get  "/get-institution-projects"]       {:handler projects/get-institution-projects}
   [:get  "/get-institution-dash-projects"]  {:handler projects/get-institution-dash-projects}
   [:get  "/get-project-by-id"]              {:handler projects/get-project-by-id}
   [:get  "/get-template-projects"]          {:handler projects/get-template-projects}
   [:get  "/get-template-by-id"]             {:handler projects/get-template-by-id}
   [:get  "/get-project-stats"]              {:handler projects/get-project-stats}
   [:get "/create-shape-files"]              {:handler     projects/create-shape-files!
                                              :auth-type   :user
                                              :auth-action :block}
   [:get  "/get-project-draft-by-id"]        {:handler     projects/get-project-draft-by-id
                                              :auth-type   :user
                                              :auth-action :block}
   [:get  "/get-project-drafts-by-user"]     {:handler     projects/get-project-drafts-by-user
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/archive-project"]                {:handler     (validate projects/archive-project!)
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/create-project"]                 {:handler     projects/create-project!
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/update-project"]                 {:handler     projects/update-project!
                                              :auth-type   :admin
                                              :auth-action :block}
   [:get "/delete-project-draft"]            {:handler     (validate projects/delete-project-draft!)
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/delete-projects-bulk"]           {:handler     (validate projects/delete-projects-bulk!)
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/edit-projects-bulk"]             {:handler     (validate projects/edit-projects-bulk!)
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/create-project-draft"]           {:handler     (validate projects/create-project-draft!)
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/update-project-draft"]           {:handler     (validate projects/update-project-draft!)
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/close-project"]                  {:handler     (validate projects/close-project!)
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/publish-project"]                {:handler     (validate projects/publish-project!)
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/copy-project"]                   {:handler     projects/copy-project!
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/check-plot-file"]                {:handler     projects/check-plot-file
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/import-ce-project"]              {:handler     (validate #'ce-project/import-ce-project)
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/start-plot-similarity"]          {:handler     #'geoai/start-plot-similarity!
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/recalculate-plot-similarity"]    {:handler     #'geoai/recalculate-plot-similarity
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/update-plot-similarity"]         {:handler     #'geoai/update-plot-similarity!
                                              :auth-type   :admin
                                              :auth-action :block}  
   ;; QAQC API
   [:get "/project-stats"]                   {:handler     #'qaqc/get-project-stats
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/sot-disagreement"]               {:handler     #'qaqc/disagreement-by-sot
                                              :auth-type   :admin
                                              :auth-action :block}
   [:get "/qaqc-plot"]                       {:handler     #'qaqc/get-qaqc-plot
                                              :auth-type   :admin
                                              :auth-action :block}
   [:get "/sot-example"]                     {:handler #'qaqc/get-sot-example}
   [:post "/disable-users"]                  {:handler #'qaqc/disable-users
                                              :auth-type   :admin
                                              :auth-action :block}
   [:post "/enable-users"]                   {:handler #'qaqc/enable-users
                                              :auth-type   :admin
                                              :auth-action :block}

   ;; DOI API
   [:post "/create-doi"]  {:handler     (validate doi/create-doi!)
                           :auth-type   :admin
                           :auth-action :block}
   [:post "/publish-doi"] {:handler     (validate doi/publish-doi!)
                           :auth-type   :admin
                           :auth-action :block}
   [:get "/doi"]          {:handler     (validate doi/get-doi-reference)}

   ;; Plots API
   [:get  "/get-collection-plot"]              {:handler     (validate plots/get-collection-plot)
                                                :auth-type   :collect
                                                :auth-action :block}
   [:get  "/get-plot-disagreement"]            {:handler     (validate plots/get-plot-disagreement)}
   [:get  "/get-plot-sample-geom"]             {:handler     (validate plots/get-plot-sample-geom)}
   [:get  "/get-plotters"]                     {:handler     (validate plots/get-plotters)
                                                :auth-type   :collect
                                                :auth-action :block}
   [:get  "/get-project-plots"]                {:handler     (validate plots/get-project-plots)}
   [:post "/add-user-samples"]                 {:handler     #'plots/add-user-samples
                                                :auth-type   :collect
                                                :auth-action :block}
   [:post "/flag-plot"]                        {:handler     (validate plots/flag-plot)
                                                :auth-type   :collect
                                                :auth-action :block}
   [:post "/release-plot-locks"]               {:handler     (validate plots/release-plot-locks)
                                                :auth-type   :collect
                                                :auth-action :block}
   [:post "/reset-plot-lock"]                  {:handler     (validate plots/reset-plot-lock)
                                                :auth-type   :collect
                                                :auth-action :block}
   ;; Institutions API
   [:get  "/get-all-institutions"]             {:handler     institutions/get-all-institutions}
   [:get  "/get-institution-by-id"]            {:handler     institutions/get-institution-by-id}
   [:post "/archive-institution"]              {:handler     institutions/archive-institution
                                                :auth-type   :admin
                                                :auth-action :block}
   [:post "/create-institution"]               {:handler     institutions/create-institution
                                                :auth-type   :user
                                                :auth-action :block}
   [:post "/update-institution"]               {:handler     institutions/update-institution
                                                :auth-type   :admin
                                                :auth-action :block}
   ;; Imagery API
   [:get  "/get-institution-imagery"]          {:handler     (validate imagery/get-institution-imagery)}
   [:get  "/get-project-imagery"]              {:handler     (validate imagery/get-project-imagery)
                                                :auth-type   :collect
                                                :auth-action :block}
   [:get  "/get-public-imagery"]               {:handler     imagery/get-public-imagery}
   [:post "/add-institution-imagery"]          {:handler     imagery/add-institution-imagery
                                                :auth-type   :admin
                                                :auth-action :block}
   [:post "/update-institution-imagery"]       {:handler     imagery/update-institution-imagery
                                                :auth-type   :admin
                                                :auth-action :block}
   [:post "/update-imagery-visibility"]        {:handler     (validate imagery/update-imagery-visibility)
                                                :auth-type   :admin
                                                :auth-action :block}
   [:post "/edit-imagery-bulk"]                {:handler     (validate imagery/bulk-update-imagery-visibility)
                                                :auth-type   :admin
                                                :auth-action :block}

   [:post "/archive-institution-imagery"]      {:handler     (validate imagery/archive-institution-imagery)
                                                :auth-type   :admin
                                                :auth-action :block}
   [:post "/bulk-archive-institution-imagery"] {:handler     (validate imagery/bulk-archive-institution-imagery)
                                                :auth-type   :admin
                                                :auth-action :block}

   ;; GeoDash API
   [:get  "/geo-dash/get-project-widgets"]  {:handler geodash/get-project-widgets}
   [:post "/geo-dash/copy-project-widgets"] {:handler geodash/copy-project-widgets}
   [:post "/geo-dash/create-widget"]        {:handler geodash/create-dashboard-widget-by-id}
   [:post "/geo-dash/delete-widget"]        {:handler geodash/delete-dashboard-widget-by-id}
   [:post "/geo-dash/gateway-request"]      {:handler geodash/gateway-request}
   [:get "/geo-dash/validate-vis-params"]   {:handler geodash/validate-vis-params}
   [:post "/geo-dash/update-widget"]        {:handler geodash/update-dashboard-widget-by-id}
   ;; Proxy Routes
   [:get  "/get-tile"]                      {:handler     proxy/proxy-imagery
                                             :auth-type   :no-cross
                                             :auth-action :block}
   [:get  "/get-securewatch-dates"]         {:handler     proxy/get-securewatch-dates
                                             :auth-type   :no-cross
                                             :auth-action :block}
   [:get "/get-tfo-dates"]                  {:handler     proxy/get-tfo-dates
                                             :auth-type   :no-cross
                                             :auth-action :block}
   [:get  "/get-tfo-tiles"]                 {:handler     proxy/get-tfo-tiles
                                             :auth-type   :no-cross
                                             :auth-action :block}

   ;; Metrics
   [:get  "/metrics/get-imagery-counts"]      {:handler     (validate metrics/get-imagery-counts)
                                               :auth-type   :metrics
                                               :auth-action :block}
   ;; [:get  "/metrics/get-plot-imagery-counts"] {:handler (validate metrics/get-plot-imagery-counts)}
   [:get  "/metrics/get-projects-with-gee"]   {:handler     (validate metrics/get-projects-with-gee)
                                               :auth-type   :metrics
                                               :auth-action :block}
   [:get  "/metrics/get-sample-plot-counts"]  {:handler     (validate metrics/get-sample-plot-counts)
                                               :auth-type   :metrics
                                               :auth-action :block}
   [:get  "/metrics/get-project-count"]       {:handler     (validate metrics/get-project-count)}
   [:post "/gcloud-listener"]                  {:handler gcloud/gcloud-handler}
   [:get  "/open-socket"]                      {:handler sse/sse-handler}
   [:post "/crumb-data"]                       {:handler crumb-data}
   }
  )

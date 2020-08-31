(ns org.openforis.ceo.routing
  (:require [org.openforis.ceo.remote-api :refer [api-handler]]
            [org.openforis.ceo.views      :refer [render-page]]
            [org.openforis.ceo.db.geodash      :as geodash]
            [org.openforis.ceo.db.imagery      :as imagery]
            [org.openforis.ceo.db.institutions :as institutions]
            [org.openforis.ceo.db.plots        :as plots]
            [org.openforis.ceo.db.projects     :as projects]
            [org.openforis.ceo.db.users        :as users]
            [org.openforis.ceo.proxy           :as proxy]))

;; TODO flatten url structure, conform name and fn
(def routes
  {;; Page Routes
   [:get "/"]                                {:handler (render-page "/home")}
   [:get "/about"]                           {:handler (render-page "/about")}
   [:get "/account"]                         {:handler (render-page "/account")}
   [:get "/collection"]                      {:handler     (render-page "/collection")
                                              :auth-type   :collect
                                              :auth-action :redirect}
   [:get "/create-institution"]              {:handler     (render-page "/create-institution")
                                              :auth-type   :user
                                              :auth-action :redirect}
   [:get "/create-project"]                  {:handler     (render-page "/create-project")
                                              :auth-type   :inst-admin
                                              :auth-action :redirect}
   [:get "/geo-dash"]                        {:handler (render-page "/geo-dash")}
   [:get "/geo-dash/geo-dash-help"]          {:handler (render-page "/geo-dash/geo-dash-help")}
   [:get "/home"]                            {:handler (render-page "/home")}
   [:get "/institution-dashboard"]           {:handler     (render-page "/institution-dashboard")
                                              :auth-type   :inst-admin
                                              :auth-action :redirect}
   [:get "/login"]                           {:handler (render-page "/login")}
   [:get "/password-request"]                {:handler (render-page "/password-request")}
   [:get "/password-reset"]                  {:handler (render-page "/password-reset")}
   [:get "/project-dashboard"]               {:handler     (render-page "/project-dashboard")
                                              :auth-type   :proj-admin
                                              :auth-action :redirect}
   [:get "/register"]                        {:handler (render-page "/register")}
   [:get "/review-institution"]              {:handler (render-page "/review-institution")}
   [:get "/review-project"]                  {:handler     (render-page "/review-project")
                                              :auth-type   :proj-admin
                                              :auth-action :redirect}
   [:get "/support"]                         {:handler (render-page "/support")}
   [:get "/widget-layout-editor"]            {:handler (render-page "/widget-layout-editor")}
   [:get "/mailing-list"]                    {:handler     (render-page "/mailing-list")
                                              :auth-type   :super
                                              :auth-action :redirect}
   [:get "/unsubscribe-mailing-list"]        {:handler (render-page "/unsubscribe-mailing-list")}
   ;; Users API
   [:get "/get-all-users"]                   {:handler     (api-handler users/get-all-users)
                                              :auth-type   :user
                                              :auth-action :block}
   [:get "/get-institution-users"]           {:handler     (api-handler users/get-institution-users)
                                              :auth-type   :user
                                              :auth-action :block}
   [:get "/get-user-details"]                {:handler     (api-handler users/get-user-details)
                                              :auth-type   :user
                                              :auth-action :block}
   [:get "/get-user-stats"]                  {:handler     (api-handler users/get-user-stats)
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/account"]                        {:handler (api-handler users/update-account)}
   [:post "/login"]                          {:handler (api-handler users/login)}
   [:post "/logout"]                         {:handler (api-handler users/logout)}
   [:post "/update-user-institution-role"]   {:handler     (api-handler users/update-institution-role)
                                              :auth-type   :inst-admin
                                              :auth-action :block}
   [:post "/request-institution-membership"] {:handler     (api-handler users/request-institution-membership)
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/send-to-mailing-list"]           {:handler     (api-handler users/submit-email-for-mailing-list)
                                              :auth-type   :super
                                              :auth-action :block}
   [:post "/password-request"]               {:handler (api-handler users/reset-password)}
   [:post "/password-reset"]                 {:handler (api-handler users/get-password-reset-key)}
   [:post "/register"]                       {:handler (api-handler users/register)}
   [:post "/unsubscribe-mailing-list"]       {:handler (api-handler users/unsubscribe-from-mailing-list)}
   ;; Projects API
   [:get "/dump-project-aggregate-data"]     {:handler     (api-handler projects/dump-project-aggregate-data)
                                              :auth-type   :proj-admin
                                              :auth-action :block}
   [:get "/dump-project-raw-data"]           {:handler     (api-handler projects/dump-project-raw-data)
                                              :auth-type   :proj-admin
                                              :auth-action :block}
   [:get "/get-all-projects"]                {:handler (api-handler projects/get-all-projects)}
   [:get "/get-project-by-id"]               {:handler     (api-handler projects/get-project-by-id)
                                              :auth-type   :collect
                                              :auth-action :block}
   [:get "/get-project-stats"]               {:handler     (api-handler projects/get-project-stats)
                                              :auth-type   :collect
                                              :auth-action :block}
   [:post "/archive-project"]                {:handler     (api-handler projects/archive-project)
                                              :auth-type   :proj-admin
                                              :auth-action :block}
   [:post "/close-project"]                  {:handler     (api-handler projects/close-project)
                                              :auth-type   :proj-admin
                                              :auth-action :block}
   [:post "/create-project"]                 {:handler     (api-handler projects/create-project)
                                              :auth-type   :inst-admin
                                              :auth-action :block}
   [:post "/publish-project"]                {:handler     (api-handler projects/publish-project)
                                              :auth-type   :proj-admin
                                              :auth-action :block}
   [:post "/update-project"]                 {:handler     (api-handler projects/update-project)
                                              :auth-type   :proj-admin
                                              :auth-action :block}
   ;; Plots API
   [:get "/get-next-plot"]                   {:handler     (api-handler plots/get-next-plot)
                                              :auth-type   :collect
                                              :auth-action :block}
   [:get "/get-plot-by-id"]                  {:handler     (api-handler plots/get-plot-by-id)
                                              :auth-type   :collect
                                              :auth-action :block}
   [:get "/get-prev-plot"]                   {:handler     (api-handler plots/get-prev-plot)
                                              :auth-type   :collect
                                              :auth-action :block}
   [:get "/get-project-plots"]               {:handler     (api-handler plots/get-project-plots)
                                              :auth-type   :collect
                                              :auth-action :block}
   [:get "/get-proj-plot"]                   {:handler     (api-handler plots/get-project-plot)
                                              :auth-type   :collect
                                              :auth-action :block}
   [:post "/add-user-samples"]               {:handler      (api-handler plots/add-user-samples)
                                              :auth-type   :collect
                                              :auth-action :block}
   [:post "/flag-plot"]                      {:handler     (api-handler plots/flag-plot)
                                              :auth-type   :collect
                                              :auth-action :block}
   [:post "/release-plot-locks"]             {:handler     (api-handler plots/release-plot-locks)
                                              :auth-type   :collect
                                              :auth-action :block}
   [:post "/reset-plot-lock"]                {:handler     (api-handler plots/reset-plot-lock)
                                              :auth-type   :collect
                                              :auth-action :block}
   ;; Institutions API
   [:get "/get-all-institutions"]            {:handler (api-handler institutions/get-all-institutions)}
   [:get "/get-institution-details"]         {:handler (api-handler institutions/get-institution-details)}
   [:post "/archive-institution"]            {:handler     (api-handler institutions/archive-institution)
                                              :auth-type   :inst-admin
                                              :auth-action :block}
   [:post "/create-institution"]             {:handler     (api-handler institutions/create-institution)
                                              :auth-type   :user
                                              :auth-action :block}
   [:post "/update-institution"]             {:handler     (api-handler institutions/update-institution)
                                              :auth-type   :inst-admin
                                              :auth-action :block}
   ;; Imagery API
   [:get "/get-institution-imagery"]         {:handler (api-handler imagery/get-institution-imagery)}
   [:get "/get-project-imagery"]             {:handler (api-handler imagery/get-project-imagery)}
   [:get "/get-public-imagery"]              {:handler (api-handler imagery/get-public-imagery)}
   [:post "/add-geodash-imagery"]            {:handler (api-handler imagery/add-geodash-imagery)}
   [:post "/add-institution-imagery"]        {:handler     (api-handler imagery/add-institution-imagery)
                                              :auth-type   :inst-admin
                                              :auth-action :block}
   [:post "/update-institution-imagery"]     {:handler     (api-handler imagery/update-institution-imagery)
                                              :auth-type   :inst-admin
                                              :auth-action :block}
   [:post "/archive-institution-imagery"]    {:handler     (api-handler imagery/archive-institution-imagery)
                                              :auth-type   :inst-admin
                                              :auth-action :block}
   ;; GeoDash API
   [:get "/geo-dash/get-by-projid"]          {:handler (api-handler geodash/geodash-id)}
   [:post "/geo-dash/create-widget"]         {:handler (api-handler geodash/create-dashboard-widget-by-id)}
   [:post "/geo-dash/delete-widget"]         {:handler (api-handler geodash/delete-dashboard-widget-by-id)}
   [:post "/geo-dash/gateway-request"]       {:handler (api-handler geodash/gateway-request)}
   [:post "/geo-dash/update-widget"]         {:handler (api-handler geodash/update-dashboard-widget-by-id)}
   ;; Proxy Routes
   [:get "/get-tile"]                        {:handler     (api-handler proxy/proxy-imagery)
                                              :auth-type   :no-cross
                                              :auth-action :block}
   [:get "/get-securewatch-dates"]           {:handler     (api-handler proxy/get-secure-watch-dates)
                                              :auth-type   :no-cross
                                              :auth-action :block}})

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
   [:get "/collection"]                      {:auth-type   :collect
                                              :auth-action :redirect
                                              :handler     (render-page "/collection")}
   [:get "/create-institution"]              {:auth-type   :user
                                              :auth-action :redirect
                                              :handler     (render-page "/create-institution")}
   [:get "/create-project"]                  {:auth-type   :inst-admin
                                              :auth-action :redirect
                                              :handler     (render-page "/create-project")}
   [:get "/geo-dash"]                        {:handler (render-page "/geo-dash")}
   [:get "/geo-dash/geo-dash-help"]          {:handler (render-page "/geo-dash/geo-dash-help")}
   [:get "/home"]                            {:handler (render-page "/home")}
   [:get "/institution-dashboard"]           {:auth-type   :inst-admin
                                              :auth-action :redirect
                                              :handler     (render-page "/institution-dashboard")}
   [:get "/login"]                           {:handler (render-page "/login")}
   [:get "/password-request"]                {:handler (render-page "/password-request")}
   [:get "/password-reset"]                  {:handler (render-page "/password-reset")}
   [:get "/project-dashboard"]               {:auth-type   :proj-admin
                                              :auth-action :redirect
                                              :handler     (render-page "/project-dashboard")}
   [:get "/register"]                        {:handler (render-page "/register")}
   [:get "/review-institution"]              {:handler (render-page "/review-institution")}
   [:get "/review-project"]                  {:auth-type   :proj-admin
                                              :auth-action :redirect
                                              :handler     (render-page "/review-project")}
   [:get "/support"]                         {:handler (render-page "/support")}
   [:get "/widget-layout-editor"]            {:handler (render-page "/widget-layout-editor")}
   [:get "/mailing-list"]                    {:auth-type   :super
                                              :auth-action :redirect
                                              :handler     (render-page "/mailing-list")}
   [:get "/unsubscribe-mailing-list"]        {:handler (render-page "/unsubscribe-mailing-list")}
   ;; Users API
   [:get "/get-all-users"]                   {:auth-type   :user
                                              :auth-action :block
                                              :handler     (api-handler users/get-all-users)}
   [:get "/get-institution-users"]           {:auth-type   :user
                                              :auth-action :block
                                              :handler     (api-handler users/get-institution-users)}
   [:get "/get-user-details"]                {:auth-type   :user
                                              :auth-action :block
                                              :handler     (api-handler users/get-user-details)}
   [:get "/get-user-stats"]                  {:auth-type   :user
                                              :auth-action :block
                                              :handler     (api-handler users/get-user-stats)}
   [:post "/account"]                        {:handler (api-handler users/update-account)}
   [:post "/login"]                          {:handler (api-handler users/login)}
   [:post "/logout"]                         {:handler (api-handler users/logout)}
   [:post "/update-user-institution-role"]   {:auth-type   :inst-admin
                                              :auth-action :block
                                              :handler     (api-handler users/update-institution-role)}
   [:post "/request-institution-membership"] {:auth-type   :user
                                              :auth-action :block
                                              :handler     (api-handler users/request-institution-membership)}
   [:post "/send-to-mailing-list"]           {:auth-type   :super
                                              :auth-action :block
                                              :handler     (api-handler users/submit-email-for-mailing-list)}
   [:post "/password-request"]               {:handler (api-handler users/reset-password)}
   [:post "/password-reset"]                 {:handler (api-handler users/get-password-reset-key)}
   [:post "/register"]                       {:handler (api-handler users/register)}
   [:post "/unsubscribe-mailing-list"]       {:handler (api-handler users/unsubscribe-from-mailing-list)}
             ;; Projects API
   [:get "/dump-project-aggregate-data"]     {:auth-type   :proj-admin
                                              :auth-action :block
                                              :handler     (api-handler projects/dump-project-aggregate-data)}
   [:get "/dump-project-raw-data"]           {:auth-type   :proj-admin
                                              :auth-action :block
                                              :handler     (api-handler projects/dump-project-raw-data)}
   [:get "/get-all-projects"]                {:handler (api-handler projects/get-all-projects)}
   [:get "/get-project-by-id"]               {:auth-type   :collect
                                              :auth-action :block
                                              :handler     (api-handler projects/get-project-by-id)}
   [:get "/get-project-stats"]               {:auth-type   :collect
                                              :auth-action :block
                                              :handler     (api-handler projects/get-project-stats)}
   [:post "/archive-project"]                {:auth-type   :proj-admin
                                              :auth-action :block
                                              :handler     (api-handler projects/archive-project)}
   [:post "/close-project"]                  {:auth-type   :proj-admin
                                              :auth-action :block
                                              :handler     (api-handler projects/close-project)}
   [:post "/create-project"]                 {:auth-type   :proj-admin
                                              :auth-action :block
                                              :handler     (api-handler projects/create-project)}
   [:post "/publish-project"]                {:auth-type   :proj-admin
                                              :auth-action :block
                                              :handler     (api-handler projects/publish-project)}
   [:post "/update-project"]                 {:auth-type   :proj-admin
                                              :auth-action :block
                                              :handler     (api-handler projects/update-project)}
   ;; Plots API
   [:get "/get-next-plot"]                   {:auth-type   :collect
                                              :auth-action :block
                                              :handler     (api-handler plots/get-next-plot)}
   [:get "/get-plot-by-id"]                  {:auth-type   :collect
                                              :auth-action :block
                                              :handler     (api-handler plots/get-plot-by-id)}
   [:get "/get-prev-plot"]                   {:auth-type   :collect
                                              :auth-action :block
                                              :handler     (api-handler plots/get-prev-plot)}
   [:get "/get-project-plots"]               {:auth-type   :collect
                                              :auth-action :block
                                              :handler     (api-handler plots/get-project-plots)}
   [:get "/get-proj-plot"]                   {:auth-type   :collect
                                              :auth-action :block
                                              :handler     (api-handler plots/get-project-plot)}
   [:post "/add-user-samples"]               {:auth-type   :collect
                                              :auth-action :block
                                              :handler      (api-handler plots/add-user-samples)}
   [:post "/flag-plot"]                      {:auth-type   :collect
                                              :auth-action :block
                                              :handler     (api-handler plots/flag-plot)}
   [:post "/release-plot-locks"]             {:auth-type   :collect
                                              :auth-action :block
                                              :handler     (api-handler plots/release-plot-locks)}
   [:post "/reset-plot-lock"]                {:auth-type   :collect
                                              :auth-action :block
                                              :handler     (api-handler plots/reset-plot-lock)}
   ;; Institutions API
   [:get "/get-all-institutions"]            {:handler (api-handler institutions/get-all-institutions)}
   [:get "/get-institution-details"]         {:handler (api-handler institutions/get-institution-details)}
   [:post "/archive-institution"]            {:auth-type   :inst-admin
                                              :auth-action :block
                                              :handler     (api-handler institutions/archive-institution)}
   [:post "/create-institution"]             {:auth-type   :user
                                              :auth-action :block
                                              :handler     (api-handler institutions/create-institution)}
   [:post "/update-institution"]             {:auth-type   :inst-admin
                                              :auth-action :block
                                              :handler     (api-handler institutions/update-institution)}
   ;; Imagery API
   [:get "/get-institution-imagery"]         {:handler (api-handler imagery/get-institution-imagery)}
   [:get "/get-project-imagery"]             {:handler (api-handler imagery/get-project-imagery)}
   [:get "/get-public-imagery"]              {:handler (api-handler imagery/get-public-imagery)}
   [:post "/add-geodash-imagery"]            {:handler (api-handler imagery/add-geodash-imagery)}
   [:post "/add-institution-imagery"]        {:auth-type   :inst-admin
                                              :auth-action :block
                                              :handler     (api-handler imagery/add-institution-imagery)}
   [:post "/update-institution-imagery"]     {:auth-type   :inst-admin
                                              :auth-action :block
                                              :handler     (api-handler imagery/update-institution-imagery)}
   [:post "/archive-institution-imagery"]    {:auth-type   :inst-admin
                                              :auth-action :block
                                              :handler     (api-handler imagery/archive-institution-imagery)}
   ;; GeoDash API
   [:get "/geo-dash/get-by-projid"]          {:handler (api-handler geodash/geodash-id)}
   [:post "/geo-dash/create-widget"]         {:handler (api-handler geodash/create-dashboard-widget-by-id)}
   [:post "/geo-dash/delete-widget"]         {:handler (api-handler geodash/delete-dashboard-widget-by-id)}
   [:post "/geo-dash/gateway-request"]       {:handler (api-handler geodash/gateway-request)}
   [:post "/geo-dash/update-widget"]         {:handler (api-handler geodash/update-dashboard-widget-by-id)}
   ;; Proxy Routes
   [:get "/get-tile"]                        {:auth-type   :no-cross
                                              :auth-action :block
                                              :handler     (api-handler proxy/proxy-imagery)}
   [:get "/get-securewatch-dates"]           {:auto        :no-cross
                                              :auth-action :block
                                              :handler     (api-handler proxy/get-secure-watch-dates)}})

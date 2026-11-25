(ns collect-earth-online.db.users
  (:import java.net.URLEncoder
           java.text.SimpleDateFormat
           java.util.Date
           java.time.format.DateTimeFormatter
           java.time.LocalDateTime
           java.util.UUID)
  (:require [clojure.string                 :as str]
            [collect-earth-online.utils.otp :as otp]
            [triangulum.database            :refer [call-sql sql-primitive]]
            [triangulum.type-conversion     :as tc]
            [triangulum.config              :refer [get-config]]
            [triangulum.email               :refer [email? send-mail get-base-url]]
            [triangulum.logging             :refer [log-str]]
            [triangulum.response            :refer [data-response]]))

;; 2FA code attempts per email, to limit guessing.
(def ^:private otp-attempts     (atom {}))
(def ^:private max-otp-attempts 5)
(def ^:private otp-lockout-ms   (* 15 60 1000))

;; Counts the attempt atomically and returns false once the limit is reached.
(defn- allow-otp-attempt! [email]
  (let [now             (System/currentTimeMillis)
        [before after]  (swap-vals! otp-attempts update email
                                    (fn [{:keys [tries since] :as attempts}]
                                      (cond (or (nil? attempts) (>= (- now since) otp-lockout-ms))
                                            {:tries 1 :since now}

                                            (< tries max-otp-attempts)
                                            (update attempts :tries inc)

                                            :else
                                            attempts)))]
    (not= (get before email) (get after email))))

(defn- clear-otp-attempts! [email]
  (swap! otp-attempts dissoc email))

(defn- get-otp-errors [email otp-secret otp-code]
  (cond (str/blank? otp-code)
        [401 "otp-required" "Enter the 6-digit code from your authenticator app."]

        (not (allow-otp-attempt! email))
        [429 "otp-locked" "Too many invalid authentication codes. Please wait 15 minutes and try again."]

        (not (otp/valid-code? otp-secret otp-code))
        [401 "invalid-otp" "Invalid authentication code. Please check your authenticator app and try again."]))

;; Returns [status reason message] when the login must be refused.
(defn- get-login-errors [email user otp-code]
  (cond (sql-primitive (call-sql "password_reset_required" {:log? false} email))
        [403 "password-reset-required" "We have rotated every password after a security update, please reset your password."]

        (nil? user)
        [401 "invalid-credentials" "Invalid email/password combination."]

        (not (:verified user))
        [403 "email-not-verified" "You have not verified your email. Please check your email for a link to verify your account, or click the forgot password link below to generate a new email."]

        (:otp_secret user)
        (get-otp-errors email (:otp_secret user) otp-code)))

(defn login [{:keys [params]}]
  (let [{:keys [email password otpCode]} params
        user      (first (call-sql "check_login" {:log? false} email password))
        user-info {:userId        (:user_id user)
                   :userName      email
                   :acceptedTOS   (:accept_tos user)
                   :userRole      (if (:administrator user) "admin" "user")}]
    (if-let [[status reason message] (get-login-errors email user (str otpCode))]
      (data-response {:reason reason :message message} {:status status})
      (do (clear-otp-attempts! email)
          (data-response "" {:session user-info})))))

(defn- get-register-errors [email password password-confirmation]
  (cond (sql-primitive (call-sql "email_taken" email -1))
        (str "Account " email " already exists.")

        (not (email? email))
        (str email " is not a valid email address.")

        (< (count password) 8)
        "Password must be at least 8 characters."

        (not= password password-confirmation)
        "Password and Password confirmation do not match."

        :else nil))

(defn register [{:keys [params]}]
  (let [reset-key             (str (UUID/randomUUID))
        email                 (str/lower-case (:email params))
        password              (:password params)
        password-confirmation (:passwordConfirmation params)]
    (if-let [error-msg (get-register-errors email password password-confirmation)]
      (data-response error-msg)
      (let [timestamp      (-> (DateTimeFormatter/ofPattern "yyyy/MM/dd HH:mm:ss")
                               (.format (LocalDateTime/now)))
            email-msg      (format (str "Dear %s,\n\n"
                                        "Thank you for signing up for CEO!\n\n"
                                        "Your Account Summary Details:\n\n"
                                        "  Email: %s\n"
                                        "  Created on: %s\n\n"
                                        "  Click the following link to verify your email:\n"
                                        "  %s/verify-email?email=%s&passwordResetKey=%s\n\n"
                                        "Kind Regards,\n"
                                        "  The CEO Team")
                                   email email timestamp (get-base-url) (URLEncoder/encode email) reset-key)
            auto-validate? (get-config :mail :auto-validate?)
            user-id        (sql-primitive (call-sql "add_user" {:log? false} email password reset-key))]
        (if auto-validate?
          (do (call-sql "user_verified" user-id)
              (data-response "You have successfully created an account"))
          (try
            (do              
              (send-mail email nil nil "Welcome to CEO!" email-msg :text)              
              (data-response ""))            
            (catch Exception _
              (data-response (str "A new user account was created but there was a server error.  Please contact support@sig-gis.com.")))))))))

(defn logout [_]
  (data-response "" {:session nil}))

(defn- get-update-account-errors [user-id current-email current-password new-email password password-confirmation]
  (cond (str/blank? current-password)
        "Current Password required"

        (empty? (call-sql "check_login" {:log? false} current-email current-password))
        "Invalid current password."

        (not (or (str/blank? new-email) (email? new-email)))
        (str new-email " is not a valid email address.")

        (and (not (str/blank? new-email))
             (sql-primitive (call-sql "email_taken" new-email user-id)))
        (str "An account with the email " new-email " already exists.")

        (and (not (str/blank? password)) (< (count password) 8))
        "New Password must be at least 8 characters."

        (not= password password-confirmation)
        "New Password and Password confirmation do not match."

        :else nil))

(defn update-account [{:keys [params]}]
  (let [user-id               (:userId params -1)
        current-email         (:userName params)
        current-password      (:currentPassword params)
        new-email             (:email params)
        password              (:password params)
        password-confirmation (:passwordConfirmation params)]
    (if-let [error-msg (get-update-account-errors user-id current-email current-password
                                                  new-email password password-confirmation)]
      (data-response error-msg)
      ;; TODO: Create a single "update_user_information" sql function, use user_id instead of email
      (let [updated-email (if (or (str/blank? new-email) (= new-email current-email))
                            current-email
                            (sql-primitive (call-sql "set_user_email" current-email new-email)))]
        (when-not (str/blank? password)
          (call-sql "update_password" {:log? false} updated-email password))
        (data-response "" {:session {:userName updated-email}})))))

(defn- get-user-otp [user-id]
  (first (call-sql "get_user_otp" {:log? false} user-id)))

(defn- get-user-email [user-id]
  (:email (first (call-sql "get_user_by_id" user-id))))

(defn- valid-password? [user-id password]
  (let [password (str password)]
    (and (not (str/blank? password))
         (seq (call-sql "check_login" {:log? false} (get-user-email user-id) password)))))

(defn- otp-key-response [user-id secret]
  (data-response {:secret secret
                  :uri    (otp/otpauth-uri (get-user-email user-id) secret)}))

(defn get-two-factor-status [{:keys [session]}]
  (data-response {:enabled (some? (:otp_secret (get-user-otp (:userId session -1))))}))

(defn get-two-factor-key [{:keys [session]}]
  (let [user-id (:userId session -1)]
    (if-let [secret (:otp_secret (get-user-otp user-id))]
      (otp-key-response user-id secret)
      (data-response "Two-factor authentication is not enabled." {:status 400}))))

(defn setup-two-factor [{:keys [session]}]
  (let [user-id (:userId session -1)
        secret  (otp/generate-secret)]
    (if (sql-primitive (call-sql "set_user_otp_pending_secret" {:log? false} user-id secret))
      (otp-key-response user-id secret)
      (data-response "Two-factor authentication is already enabled." {:status 400}))))

(defn enable-two-factor [{:keys [params session]}]
  (let [user-id        (:userId session -1)
        pending-secret (:otp_pending_secret (get-user-otp user-id))]
    (cond (not (valid-password? user-id (:currentPassword params)))
          (data-response "Invalid current password." {:status 400})

          (nil? pending-secret)
          (data-response "Please start the two-factor authentication setup again." {:status 400})

          (not (otp/valid-code? pending-secret (:otpCode params)))
          (data-response "Invalid authentication code. Please check your authenticator app and try again." {:status 400})

          (sql-primitive (call-sql "enable_user_otp" {:log? false} user-id pending-secret))
          (data-response "")

          :else
          (data-response "Please start the two-factor authentication setup again." {:status 400}))))

(defn disable-two-factor [{:keys [params session]}]
  (let [user-id (:userId session -1)]
    (cond (not (valid-password? user-id (:currentPassword params)))
          (data-response "Invalid current password." {:status 400})

          (not (otp/valid-code? (:otp_secret (get-user-otp user-id)) (:otpCode params)))
          (data-response "Invalid authentication code. Please check your authenticator app and try again." {:status 400})

          :else
          (do (call-sql "disable_user_otp" user-id)
              (data-response "")))))

(defn password-request [{:keys [params]}]
  (let [reset-key (str (UUID/randomUUID))
        email     (sql-primitive (call-sql "set_password_reset_key" {:log? false} (:email params) reset-key))
        email-msg (format (str "Hi %s,\n\n"
                               "  To reset your password, simply click the following link:\n\n"
                               "  %s/password-reset?email=%s&passwordResetKey=%s")
                          email (get-base-url) email reset-key)]
    (if email
      (try
        (send-mail email nil nil "Password reset on CEO" email-msg :text)
        (data-response "")
        (catch Exception _
          (data-response (str "A user with the email "
                              email
                              " was found, but there was a server error.  Please contact support@sig-gis.com."))))
      (data-response "There is no user with that email address."))))

(defn- get-password-reset-errors [user email reset-key password password-confirmation]
  (cond (nil? user)
        "There is no user with that email address."

        (or (nil? reset-key) (not= reset-key (:reset_key user)))
        (str "Invalid reset key for user " email ".")

        (< (count password) 8)
        "Password must be at least 8 characters."

        (not= password password-confirmation)
        "Password and Password confirmation do not match."

        :else nil))

(defn password-reset [{:keys [params]}]
  (let [email                 (:email params)
        reset-key             (:passwordResetKey params)
        password              (:password params)
        password-confirmation (:passwordConfirmation params)
        user                  (first (call-sql "get_user_by_email" email))]
    (if-let [error-msg (get-password-reset-errors user email reset-key password password-confirmation)]
      (data-response error-msg)
      (do
        (call-sql "update_password" {:log? false} email password)
        (data-response "")))))

(defn- get-verify-email-errors [user email reset-key]
  (cond (nil? user)
        "There is no user with that email address."

        (not= reset-key (:reset_key user))
        (str "Invalid reset key for user " email ".")

        :else nil))

(defn verify-email [{:keys [params]}]
  (let [email     (:email params)
        reset-key (:passwordResetKey params)
        user      (first (call-sql "get_user_by_email" email))]
    (if-let [error-msg (get-verify-email-errors user email reset-key)]
      (data-response error-msg)
      (do
        (call-sql "user_verified" (:user_id user))
        (data-response "")))))

(defn get-institution-users [{:keys [params]}]
  (let [institution-id (tc/val->int (:institutionId params))
        all-users      (mapv (fn [{:keys [user_id email institution_role]}]
                               {:id              user_id
                                :email           email
                                :institutionRole institution_role})
                             (call-sql "get_all_users_by_institution_id" institution-id))]
    (data-response all-users)))

(defn get-user-stats [{:keys [params]}]
  (let [account-id (tc/val->int (:accountId params))]    
    (if-let [stats (first (call-sql "get_user_stats" account-id))]
      (data-response {:totalProjects (:total_projects stats)
                      :totalPlots    (:total_plots stats)
                      :averageTime   (:average_time stats)
                      :perProject    (tc/jsonb->clj (:per_project stats))
                      :acceptTOS     (:accept_tos stats)})
      (data-response {}))))

(defn get-user-admin-institutions [{:keys [session]}]
  (let [user-id (:userId session -1)]
    (if (pos? user-id)
      (->> (call-sql "get_user_admin_institutions" user-id)
           (mapv (fn [{:keys [institution_id institution_name]}]
                   {:id   institution_id
                    :name institution_name}))
           (data-response))
      (data-response []))))

(defn- send-role-assignment-emails! [institution-id assignments]
  (when (seq assignments)
    (let [institution-name (:name (first (call-sql "select_institution_by_id" institution-id -1)))
          institution-url  (str (str/replace (str (get-base-url)) #"/+$" "")
                                "/review-institution?institutionId=" institution-id)
          timestamp        (-> (DateTimeFormatter/ofPattern "yyyy/MM/dd HH:mm:ss")
                               (.format (LocalDateTime/now)))]
      (future
        (doseq [{:keys [email role]} assignments]
          (try
            (send-mail email nil nil "User Role Assignment"
                       (format (str "Dear %s,\n\n"
                                    "You have been assigned the role of %s for %s on %s.\n\n"
                                    "To access the institution page, simply click the following link:\n\n"
                                    "%s\n\n"
                                    "Kind Regards,\n"
                                    "  The CEO Team")
                               email role institution-name timestamp institution-url)
                       :text)
            (catch Exception e
              (log-str "Failed to send the role assignment email to " email ": " (ex-message e)))))))))

(defn- assign-institution-role! [institution-id current-roles account-id role]
  (let [email (:email (first (call-sql "get_user_by_id" account-id)))]
    (cond
      (nil? email)
      {:message (str "User with id " account-id " not found.")}

      (= role (get current-roles account-id))
      {:message (str email " already has role " role ".")}

      (or (sql-primitive (call-sql "update_institution_user_role" institution-id account-id role))
          (sql-primitive (call-sql "add_institution_user" institution-id account-id role)))
      {:message  (str email " has been assigned role " role ".")
       :assigned {:email email :role role}}

      :else
      {:message (str "Could not assign role " role " to " email ".")})))

(defn update-institution-role [{:keys [params]}]
  (let [account-ids      (mapv tc/val->int (or (:accountIds params) []))
        institution-id   (tc/val->int (:institutionId params))
        institution-role (:institutionRole params)]
    (cond
      (= institution-role "not-member")
      (data-response
       (mapv (fn [aid]
               (let [email (:email (first (call-sql "get_user_by_id" aid)))]
                 (if (nil? email)
                   (str "User with id " aid " not found.")
                   (do
                     (call-sql "remove_institution_user_role" institution-id aid)
                     (str "User " email " has been removed.")))))
             account-ids))
      (seq account-ids)
      (let [current-roles (into {}
                                (map (juxt :user_id :institution_role))
                                (call-sql "get_all_users_by_institution_id" institution-id))
            results       (mapv #(assign-institution-role! institution-id current-roles % institution-role)
                                account-ids)]
        (send-role-assignment-emails! institution-id (keep :assigned results))
        (data-response (mapv :message results)))

      :else
      (data-response "No accountIds were provided."))))

(defn- process-user [institution-id {:keys [email role] :or {role "member"}}]
  (let [user (first (call-sql "get_user_by_email" email))]
    (cond
      (not user)
      {:email email :reason "User does not exist in CEO"}
      :else
      (try
        (if (sql-primitive (call-sql "add_institution_user" institution-id (:user_id user) role))
          {:email email :role role}
          {:email email :reason "Unknown database error"})
        (catch Exception _
          {:email email :reason "User is already assigned to this institution"})))))

(defn add-user-to-institution [{:keys [params]}]
  (let [{:keys [newUsers institutionId]} params
        institution-id (tc/val->int institutionId)]
    (if (empty? newUsers)
      (data-response [] {:status 200})
      (let [results  (mapv #(process-user institution-id %) newUsers)
            failures (filterv :reason results)]
        (send-role-assignment-emails! institution-id (remove :reason results))
        (data-response failures {:status (if (seq failures) 400 200)})))))

(defn request-institution-membership [{:keys [params session]}]
  (let [user-id        (:userId session -1)
        institution-id (tc/val->int (:institutionId params))]
    (if (pos? user-id)
      (do
        (call-sql "add_institution_user" institution-id user-id 3)
        (let [institution-name (:name (first (call-sql "select_institution_by_id" institution-id -1)))
              timestamp        (-> (DateTimeFormatter/ofPattern "yyyy/MM/dd HH:mm:ss")
                                   (.format (LocalDateTime/now)))
              user-email       (:email (first (call-sql "get_user_by_id" user-id)))
              admin-emails     (->> (call-sql "get_all_users_by_institution_id" institution-id)
                                    (filter (fn [{:keys [institution_role]}] (= institution_role "admin")))
                                    (map :email))
              email-msg       (format (str "User %s has requested the access to institution \"%s\" on %s.\n\n"
                                           "To access the institution page, simply click the following link:\n\n"
                                           "%sreview-institution?institutionId=%s")
                                      user-email
                                      institution-name
                                      timestamp
                                      (get-base-url)
                                      institution-id)]
          (try
            (send-mail admin-emails nil nil "CEO Membership Request" email-msg :text)
            (data-response (str "Membership has been requested for user " user-email "."))
            (catch Exception _
              (data-response (str user-email
                                  " has requested the membership to "
                                  institution-name
                                  ", but the email notification has failed."))))))
      (data-response "You must be logged into request membership."))))

(defn confirm-data-sharing!
  [req]
  (let [{:keys [params session]} req
        user-id          (:userId session)
        project-id       (tc/val->int (:projectId params))
        slug (-> params :interpreterName
                 (str ":user:" user-id ":"
                      (.format (SimpleDateFormat. "YYYYMMddHHmmss") (Date.))))]
    (try
      (if (= -1 user-id)
        (do
          (call-sql "guest_user_data_sharing" slug (or (:remote-addr req) ""))
          (data-response {:message "success"} {:session {:acceptedTOS slug}}))
        (do
          (call-sql "user_data_sharing" project-id user-id slug (or (:remote-addr req) "") slug)
          (data-response {:message "success"} {:session (assoc session :acceptedTOS slug)})))
      (catch Exception e
        (data-response {:message "error when accepting data sharing terms."} {:status 500})))))

(defn check-email-taken [{:keys [params]}]
  (let [email (:email params)]    
    (try (when (sql-primitive (call-sql "get_user_by_email" email))           
           (data-response true))
         (catch Exception e           
           (data-response false)))))

(defn resend-validation-email [{:keys [params]}]
  (let [email          (:email params)
        reset-key      (str (UUID/randomUUID))
        timestamp      (-> (DateTimeFormatter/ofPattern "yyyy/MM/dd HH:mm:ss")
                           (.format (LocalDateTime/now)))
        email-msg      (format (str "Dear %s,\n\n"
                                    "Thank you for signing up for CEO!\n\n"
                                    "Your Account Summary Details:\n\n"
                                    "  Email: %s\n"
                                    "  Created on: %s\n\n"
                                    "  Click the following link to verify your email:\n"
                                    "  %s/verify-email?email=%s&passwordResetKey=%s\n\n"
                                    "Kind Regards,\n"
                                    "  The CEO Team")
                               email email timestamp (get-base-url) (URLEncoder/encode email) reset-key)]
    (try
      (do (send-mail email nil nil "Welcome to CEO!" email-msg :text)
          (data-response (format "Email Sent. Please check all inboxes at %s for a new email with further instructions." email)))
      (catch Exception _
	(data-response  "A server error interrupted your request. Please try again or contact an administrator.")))))

(defn user-accept-tos [{:keys [params session]}]
  (let [user-id (tc/val->int (:userId session))
        slug (-> params :slug
                 (str ":user:" user-id ":"
                      (.format (SimpleDateFormat. "YYYYMMddHHmmss") (Date.))))]
    (try (do
           (call-sql "user_accept_tos" user-id slug)
           (data-response true))
         (catch Exception e
           (data-response {:message "error accepting TOS"} {:status 500})))))

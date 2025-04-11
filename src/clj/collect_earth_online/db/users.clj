(ns collect-earth-online.db.users
  (:import java.net.URLEncoder
           java.time.format.DateTimeFormatter
           java.time.LocalDateTime
           java.util.UUID)
  (:require [clojure.string             :as str]
            [triangulum.database        :refer [call-sql sql-primitive]]
            [triangulum.type-conversion :as tc]
            [triangulum.config          :refer [get-config]]
            [triangulum.email           :refer [email? send-mail get-base-url]]
            [triangulum.response        :refer [data-response]]))

(defn- get-login-errors [user]
  (cond (nil? user)
        "Invalid email/password combination."

        (not (:verified user))
        "You have not verified your email. Please check your email for a link to verify your account, or click the forgot password link below to generate a new email."))

(defn login [{:keys [params]}]
  (let [{:keys [email password]} params
        user      (first (call-sql "check_login" {:log? false} email password))
        user-info {:userId        (:user_id user)
                   :userName      email
                   :acceptedTerms (:accepted_terms user)
                   :userRole      (if (:administrator user) "admin" "user")}]
    (if-let [error-msg (get-login-errors user)]
      (data-response error-msg)
      (data-response "" {:session user-info}))))

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
                                        "  %sverify-email?email=%s&passwordResetKey=%s\n\n"
                                        "Kind Regards,\n"
                                        "  The CEO Team")
                                   email email timestamp (get-base-url) (URLEncoder/encode email) reset-key)
            auto-validate? (get-config :mail :auto-validate?)
            user-id        (sql-primitive (call-sql "add_user" {:log? false} email password reset-key))]
        (if auto-validate?
          (do (call-sql "user_verified" user-id)
              (data-response "You have successfully created an account"))
          (try
            (send-mail email nil nil "Welcome to CEO!" email-msg :text)
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

(defn password-request [{:keys [params]}]
  (let [reset-key (str (UUID/randomUUID))
        email     (sql-primitive (call-sql "set_password_reset_key" {:log? false} (:email params) reset-key))
        email-msg (format (str "Hi %s,\n\n"
                               "  To reset your password, simply click the following link:\n\n"
                               "  %spassword-reset?email=%s&passwordResetKey=%s")
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

        (not= reset-key (:reset_key user))
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
                      :perProject    (tc/jsonb->clj (:per_project stats))})
      (data-response {}))))

(defn update-institution-role [{:keys [params]}]
  (let [new-user-email   (:newUserEmail params)
        account-id       (if-let [id (:accountId params)]
                           (tc/val->int id)
                           (-> (call-sql "get_user_by_email" new-user-email)
                               (first)
                               (:user_id -1)))
        institution-id   (tc/val->int (:institutionId params))
        institution-role (:institutionRole params)
        email            (:email (first (call-sql "get_user_by_id" account-id)))]
    (cond
      (nil? email)
      (data-response (str "User " new-user-email " not found."))

      (= institution-role "not-member")
      (do
        (call-sql "remove_institution_user_role" institution-id account-id)
        (data-response (str "User " email " has been removed.")))

      :else
      (let [institution-name (:name (first (call-sql "select_institution_by_id" institution-id -1)))
            timestamp        (-> (DateTimeFormatter/ofPattern "yyyy/MM/dd HH:mm:ss")
                                 (.format (LocalDateTime/now)))
            inst-user-id     (sql-primitive (call-sql "update_institution_user_role"
                                                      institution-id
                                                      account-id
                                                      institution-role))
            email-msg        (format (str "Dear %s,\n\n"
                                          "You have been assigned the role of %s for %s on %s.\n\n"
                                          "Kind Regards,\n"
                                          "  The CEO Team")
                                     email institution-role institution-name timestamp)]
        (when-not inst-user-id (call-sql "add_institution_user" institution-id account-id institution-role))
        (try
          (send-mail email nil nil "User Role Assignment" email-msg :text)
          (data-response (str email " has been assigned role " institution-role "."))
          (catch Exception _
            (data-response (str email
                                " has been assigned role "
                                institution-role
                                ", but the email notification has failed."))))))))

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
        interpreter-name (:interpreterName params)]
    (try
      (if (= -1 user-id)
        (do
          (call-sql "guest_user_data_sharing" interpreter-name)
          (data-response {:message "success"} {:session {:acceptedTerms true}}))
        (do
          (call-sql "user_data_sharing" user-id interpreter-name (or (:remote-addr req) ""))
          (data-response {:message "success"} {:session (assoc session :acceptedTerms true)})))
      (catch Exception e
        (data-response {:message "error when accepting data sharing terms."} {:status 500})))))

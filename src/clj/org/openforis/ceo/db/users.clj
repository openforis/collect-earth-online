(ns org.openforis.ceo.db.users
  (:import java.time.Duration
           java.time.format.DateTimeFormatter
           java.time.LocalDateTime
           java.util.UUID)
  (:require [clojure.string :as str]
            [org.openforis.ceo.utils.type-conversion :as tc]
            [org.openforis.ceo.database   :refer [call-sql sql-primitive]]
            [org.openforis.ceo.utils.mail :refer [email?
                                                  send-mail
                                                  send-to-mailing-list
                                                  get-base-url
                                                  get-mailing-list-interval
                                                  get-mailing-list-last-sent
                                                  set-mailing-list-last-sent!]]
            [org.openforis.ceo.views      :refer [data-response]]))

(defn login [{:keys [params]}]
  (let [{:keys [email password]} params]
    (if-let [user (first (call-sql "check_login" {:log? false} email password))]
      (data-response ""
                     {:session {:userId   (:user_id user)
                                :userName email
                                :userRole (if (:administrator user) "admin" "user")}}) ; TODO user 1 is the only superuser
      (data-response "Invalid email/password combination."))))

(defn- get-register-errors [email password password-confirmation]
  (cond (not (email? email))
        (str email " is not a valid email address.")

        (< (count password) 8)
        "Password must be at least 8 characters."

        (not= password password-confirmation)
        "Password and Password confirmation do not match."

        (sql-primitive (call-sql "email_taken" email -1))
        (str "Account " email " already exists.")

        :else nil))

(defn register [{:keys [params]}]
  (let [email                 (:email params)
        password              (:password params)
        password-confirmation (:passwordConfirmation params)
        on-mailing-list?      (tc/val->bool (:onMailingList params))]
    (if-let [error-msg (get-register-errors email password password-confirmation)]
      (data-response error-msg)
      (let [user-id   (sql-primitive (call-sql "add_user" email password on-mailing-list?))
            timestamp (-> (DateTimeFormatter/ofPattern "yyyy/MM/dd HH:mm:ss")
                          (.format (LocalDateTime/now)))
            email-msg (format (str "Dear %s,\n\n"
                                   "Thank you for signing up for CEO!\n\n"
                                   "Your Account Summary Details:\n\n"
                                   "  Email: %s\n"
                                   "  Created on: %s\n\n"
                                   "Kind Regards,\n"
                                   "  The CEO Team")
                              email email timestamp)]
        (send-mail email nil nil "Welcome to CEO!" email-msg "text/plain")
        (data-response ""
                       {:session {:userId   user-id
                                  :userName email
                                  :userRole "user"}})))))

(defn logout [_]
  (data-response "" {:session nil}))

(defn- get-update-account-errors [user-id current-email current-password new-email password password-confirmation]
  (cond (str/blank? current-password)
        "Current Password required"

        (empty? (call-sql "check_login" current-email current-password))
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
        password-confirmation (:passwordConfirmation params)
        on-mailing-list?      (tc/val->bool (:onMailingList params))]
    (if-let [error-msg (get-update-account-errors user-id current-email current-password
                                                  new-email password password-confirmation)]
      (data-response error-msg)
      ;; TODO: Create a single "update_user_information" sql function, use userid instead of email
      (let [updated-email (if (or (str/blank? new-email) (= new-email current-email))
                            current-email
                            (sql-primitive (call-sql "set_user_email" current-email new-email)))]
        (when-not (str/blank? password)
          (call-sql "update_password" updated-email password))
        (call-sql "set_mailing_list" user-id on-mailing-list?)
        (data-response "" {:session {:userName updated-email}})))))

(defn password-request [{:keys [params]}]
  (let [reset-key (str (UUID/randomUUID))
        email     (sql-primitive (call-sql "set_password_reset_key" (:email params) reset-key))
        email-msg (format (str "Hi %s,\n\n"
                               "  To reset your password, simply click the following link:\n\n"
                               "  %spassword-reset?email=%s&passwordResetKey=%s")
                          email (get-base-url) email reset-key)]
    (if email
      (try
        (send-mail email nil nil "Password reset on CEO" email-msg "text/plain")
        (data-response "")
        (catch Exception _
          (data-response (str "A user with the email "
                              email
                              " was found, but there was a server error.  Please contact the system administrator."))))
      (data-response "There is no user with that email address."))))

(defn- get-password-reset-errors [email reset-key password password-confirmation user]
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
        user                  (first (call-sql "get_user" email))]
    (if-let [error-msg (get-password-reset-errors email reset-key password password-confirmation user)]
      (data-response error-msg)
      (do
        (call-sql "update_password" email password)
        (data-response "")))))

(defn get-institution-users [{:keys [params]}]
  (let [institution-id (tc/val->int (:institutionId params))
        all-users      (mapv (fn [{:keys [user_id email institution_role]}]
                               {:id              user_id
                                :email           email
                                :institutionRole institution_role})
                             (call-sql "get_all_users_by_institution_id" institution-id))]
    (data-response all-users)))

(defn get-user-details [{:keys [params]}]
  (let [user-id (:userId params -1)]
    (if-let [details (first (call-sql "get_user_details" user-id))]
      (data-response {:onMailingList (:on_mailing_list details)})
      (data-response ""))))

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
                           (-> (call-sql "get_user" new-user-email) (first) (:user_id -1)))
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
      (let [institution-name (:name (first (call-sql "select_institution_by_id" institution-id)))
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
          (send-mail email nil nil "User Role Assignment" email-msg "text/plain")
          (data-response (str email " has been assigned role " institution-role "."))
          (catch Exception _
            (data-response (str email
                                " has been assigned role "
                                institution-role
                                ", but the email notification has failed."))))))))

(defn request-institution-membership [{:keys [params]}]
  (let [user-id        (:userId params -1)
        institution-id (tc/val->int (:institutionId params))]
    (call-sql "add_institution_user" institution-id user-id 3)
    (data-response "")))

(defn- get-mailing-list-errors [subject body remaining-time]
  (cond (or (str/blank? subject) (str/blank? body))
        "Subject and Body are mandatory fields."

        (pos? remaining-time)
        (str "You must wait " remaining-time " more seconds before sending another message.")

        :else nil))

(defn submit-email-for-mailing-list [{:keys [params]}]
  (let [{:keys [subject body]} params
        remaining-time (->> (LocalDateTime/now)
                            (Duration/between (get-mailing-list-last-sent))
                            (.toSeconds)
                            (- (get-mailing-list-interval)))]
    (if-let [error-msg (get-mailing-list-errors subject body remaining-time)]
      (data-response error-msg)
      (do (set-mailing-list-last-sent! (LocalDateTime/now))
          (let [emails   (mapv :email (call-sql "get_all_mailing_list_users"))
                response (send-to-mailing-list emails subject body)]
            (data-response (str/join "\n" (:messages response []))
                           {:status (:status response)}))))))

(defn unsubscribe-from-mailing-list [{:keys [params]}]
  (let [email (:email params)]
    (if-let [user (first (call-sql "get_user" email))]
      (let [email-msg (format (str "Dear %s,\n\n"
                                   "We've just received your request to unsubscribe from our mailing list.\n\n"
                                   "You have been unsubscribed from our mailing list and will no longer"
                                   " receive a newsletter.\n\n"
                                   "You can resubscribe to our newsletter by going to your account page.\n\n"
                                   "Kind Regards,\n"
                                   "  The CEO Team")
                              email)]
        (call-sql "set_mailing_list" (:user_id user) false)
        (try
          (send-mail email nil nil "Successfully unsubscribed from CEO mailing list" email-msg "text/plain")
          (catch Exception _)) ; I normally don't need an empty catch, but something is going on here where I do.
        (data-response "You have been unsubscribed from the mailing list."))
      (data-response "There is no user with that email address."))))

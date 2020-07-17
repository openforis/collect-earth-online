(ns org.openforis.ceo.db.users
  (:import java.time.Duration
           java.time.format.DateTimeFormatter
           java.time.LocalDateTime
           java.util.UUID)
  (:require [clojure.string :as str]
            [clojure.data.json :as json]
            [org.openforis.ceo.database :refer [call-sql sql-primitive]]
            [org.openforis.ceo.db.institutions :refer [get-institution-by-id]]
            [org.openforis.ceo.utils.mail :refer [email?
                                                  send-mail
                                                  send-to-mailing-list
                                                  get-base-url
                                                  get-mailing-list-interval
                                                  get-mailing-list-last-sent
                                                  set-mailing-list-last-sent!]]))

(defn login [{:keys [params]}]
  (let [{:keys [email password]} params]
    (if-let [user (first (call-sql "check_login" email password))]
      {:status  200
       :headers {"Content-Type" "text/plain"}
       :body    ""
       :session {:userId   (:user_id user)
                 :userName email
                 :userRole (if (:administrator user) "admin" "user")}}
      {:status  200
       :headers {"Content-Type" "text/plain"}
       :body    "Invalid email/password combination."})))

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
        on-mailing-list?      (boolean (:onMailingList params))]
    (if-let [error-msg (get-register-errors email password password-confirmation)]
      {:status  200
       :headers {"Content-Type" "text/plain"}
       :body    error-msg}
      (let [user-id   (sql-primitive (call-sql "add_user" email password on-mailing-list?))
            timestamp (-> (DateTimeFormatter/ofPattern "yyyy/MM/dd HH:mm:ss")
                          (.format (LocalDateTime/now)))
            email-msg     (format (str/join "\n"
                                            ["Dear %s,\n"
                                             "Thank you for signing up for CEO!\n"
                                             "Your Account Summary Details:\n"
                                             "  Email: %s"
                                             "  Created on: %s\n"
                                             "Kind Regards,"
                                             "  The CEO Team"])
                                  email email timestamp)]
        (send-mail [email] nil nil "Welcome to CEO!" email-msg "text/plain")
        {:status  200
         :headers {"Content-Type" "text/plain"}
         :body    ""
         :session {:userId   user-id
                   :userName email
                   :userRole "user"}}))))

(defn logout [_]
  {:status  200
   :headers {"Content-Type" "text/plain"}
   :body    ""
   :session nil})

(defn- get-update-account-errors [stored-email email password password-confirmation current-password]
  (cond (str/blank? current-password)
        "Current Password required"

        (not (or (str/blank? email) (email? email)))
        (str email " is not a valid email address.")

        (and (not (str/blank? password)) (< (count password) 8))
        "New Password must be at least 8 characters."

        (not= password password-confirmation)
        "New Password and Password confirmation do not match."

        (empty? (call-sql "check_login" stored-email current-password))
        "Invalid current password."

        :else nil))

(defn- update-email [user-id old-email new-email]
  (if (sql-primitive (call-sql "email_taken" new-email user-id))
    {:status  200
     :headers {"Content-Type" "text/plain"}
     :body    (str "An account with the email " new-email " already exists.")}
    (do
      (call-sql "set_user_email" old-email new-email)
      {:status  200
       :headers {"Content-Type" "text/plain"}
       :body    ""
       :session {:userName new-email}})))

(defn update-account [{:keys [params]}]
  (let [user-id               (Integer/parseInt (or (:userId params) "-1"))
        stored-email          (:userName params)
        email                 (:email params)
        password              (:password params)
        password-confirmation (:passwordConfirmation params)
        current-password      (:currentPassword params)
        on-mailing-list?      (boolean (:onMailingList params))]
    (if-let [error-msg (get-update-account-errors stored-email email password password-confirmation current-password)]
      {:status  200
       :headers {"Content-Type" "text/plain"}
       :body    error-msg}
      (do
        (when (and (not (str/blank? email)) (not= email stored-email))
          (update-email user-id stored-email email))
        (when (not (str/blank? password))
          (call-sql "update_password" stored-email password))
        (call-sql "set_mailing_list" user-id on-mailing-list?)
        {:status  200
         :headers {"Content-Type" "text/plain"}
         :body    ""}))))

(defn get-password-reset-key [request]
  (let [email (-> request :params :email)]
    (if (first (call-sql "get_user" email))
      (let [reset-key (str (UUID/randomUUID))]
        (if (sql-primitive (call-sql "set_password_reset_key" email reset-key))
          (let [email-msg (format (str/join "\n"
                                            ["Hi %s,\n"
                                             "  To reset your password, simply click the following link:\n"
                                             "  %spassword-reset?email=%s&password-reset-key=%s"])
                                  email (get-base-url) email reset-key)]
            (send-mail [email] nil nil "Password reset on CEO" email-msg "text/plain")
            {:status  200
             :headers {"Content-Type" "text/plain"}
             :body    ""})
          {:status  200
           :headers {"Content-Type" "text/plain"}
           :body    "Failed to create a reset key. Please try again later"}))
      {:status  200
       :headers {"Content-Type" "text/plain"}
       :body    "There is no user with that email address."})))

(defn- get-reset-password-errors [password password-confirmation]
  (cond (< (count password) 8)
        "Password must be at least 8 characters."

        (not= password password-confirmation)
        "Password and Password confirmation do not match."

        :else nil))

(defn reset-password [{:keys [params]}]
  (let [email                 (:email params)
        reset-key             (:passwordResetKey params)
        password              (:password params)
        password-confirmation (:passwordConfirmation params)]
    (if-let [error-msg (get-reset-password-errors password password-confirmation)]
      {:status  200
       :headers {"Content-Type" "text/plain"}
       :body    error-msg}
      (if-let [user (first (call-sql "get_user" email))]
        (if (= reset-key (:reset_key user))
          (do
            (call-sql "update_password" email password)
            {:status  200
             :headers {"Content-Type" "text/plain"}
             :body    ""})
          {:status  200
           :headers {"Content-Type" "text/plain"}
           :body    (str "Invalid reset key for user " email ".")})
        {:status  200
         :headers {"Content-Type" "text/plain"}
         :body    "There is no user with that email address."}))))

(defn get-all-users [_]
  (let [all-users (mapv (fn [{:keys [user_id email administrator]}]
                          {:id    user_id
                           :email email
                           :role  (if administrator "admin" "user")})
                        (call-sql "get_all_users"))]
    {:status  200
     :headers {"Content-Type" "application/json"}
     :body    (json/write-str all-users)}))

(defn get-institution-users [request]
  (let [institution-id (Integer/parseInt (-> request :params :institutionId))
        all-users      (mapv (fn [{:keys [user_id email administrator reset_key institution_role]}]
                               {:id              user_id
                                :email           email
                                :role            (if administrator "admin" "user")
                                :resetKey        reset_key
                                :institutionRole institution_role})
                             (call-sql "get_all_users_by_institution_id" institution-id))]
    {:status  200
     :headers {"Content-Type" "application/json"}
     :body    (json/write-str all-users)}))

(defn get-user-details [{:keys [params]}]
  (let [user-id (Integer/parseInt (or (:userId params) "-1"))]
    (if-let [details (first (call-sql "get_user_details" user-id))]
      {:status  200
       :headers {"Content-Type" "application/json"}
       :body    (json/write-str {:onMailingList (:on_mailing_list details)})}
      {:status  200
       :headers {"Content-Type" "application/json"}
       :body    ""})))

;; FIXME: Change :userId to :accountId to avoid conflict with matching session key
(defn get-user-stats [{:keys [params]}]
  (let [account-id (Integer/parseInt (:userId params))]
    (if-let [stats (first (call-sql "get_user_stats" account-id))]
      {:status  200
       :headers {"Content-Type" "application/json"}
       :body    (json/write-str {:totalProjects (:total_projects stats)
                                 :totalPlots    (:total_plots stats)
                                 :averageTime   (:average_time stats)
                                 :perProject    (json/read-str (:per_project stats))})}
      {:status  200
       :headers {"Content-Type" "application/json"}
       :body    (json/write-str {})})))

;; FIXME: stub (This was also incomplete in the Java implementation.)
(defn update-project-user-stats [_]
  {:status  200
   :headers {"Content-Type" "application/json"}
   :body    ""})

;; FIXME: Convert me
(defn update-institution-role [request])

(defn request-institution-membership [{:keys [params]}]
  (let [user-id        (Integer/parseInt (:userId params))
        institution-id (Integer/parseInt (:institutionId params))]
    (call-sql "add_institution_user" institution-id user-id 3)
    {:status  200
     :headers {"Content-Type" "application/json"}
     :body    (json/write-str (get-institution-by-id institution-id))}))

(defn submit-email-for-mailing-list [{:keys [params]}]
  (let [{:keys [subject body]} params
        remaining-time (->> (LocalDateTime/now)
                            (Duration/between (get-mailing-list-last-sent))
                            (.toSeconds)
                            (- (get-mailing-list-interval)))]
    (if (pos? remaining-time)
      {:status  200
       :headers {"Content-Type" "application/json"}
       :body    (str "You must wait " remaining-time " more seconds before sending another message.")}
      (if (or (str/blank? subject) (str/blank? body))
        {:status  200
         :headers {"Content-Type" "application/json"}
         :body    "Subject and Body are mandatory fields."}
        (let [emails (mapv :email (call-sql "get_all_mailing_list_users"))]
          (send-to-mailing-list emails subject body "text/html")
          (set-mailing-list-last-sent! (LocalDateTime/now))
          {:status  200
           :headers {"Content-Type" "application/json"}
           :body    ""})))))

;; FIXME: Convert me
(defn unsubscribe-from-mailing-list [request])

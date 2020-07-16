(ns org.openforis.ceo.db.users
  (:require [org.openforis.ceo.database :refer [call-sql]]))

(defn login [{:keys [params] :as request}]
  (let [{:keys [email password]} params]
    (if-let [user (first (call-sql "check_login" email password))]
      ;; Authentication successful
      {:status  200
       :headers {"Content-Type" "text/plain"}
       :body    ""
       :session {:userId   (:user_id user)
                 :userName email
                 :userRole (if (:administrator user) "admin" "user")}}
      ;; Authentication failed
      {:status  200
       :headers {"Content-Type" "text/plain"}
       :body    "Invalid email/password combination."})))

(defn register [request])

(defn logout [request])

(defn update-account [request])

(defn get-password-reset-key [request])

(defn reset-password [request])

(defn get-all-users [request])

(defn get-institution-users [request])

(defn get-user-details [request])

(defn get-user-stats [request])

(defn update-project-user-stats [request])

(defn get-institution-roles [user-id]) ; Returns {int -> string}

(defn update-institution-role [request])

(defn request-institution-membership [request])

(defn submit-email-for-mailing-list [request])

(defn unsubscribe-from-mailing-list [request])

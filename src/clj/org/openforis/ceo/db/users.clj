(ns org.openforis.ceo.db.users)

(defn login [request])

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

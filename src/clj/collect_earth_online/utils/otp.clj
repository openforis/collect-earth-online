(ns collect-earth-online.utils.otp
  (:import java.net.URLEncoder
           java.nio.ByteBuffer
           java.nio.charset.StandardCharsets
           java.security.MessageDigest
           java.security.SecureRandom
           javax.crypto.Mac
           javax.crypto.spec.SecretKeySpec)
  (:require [clojure.string :as str]))

(def ^:private issuer         "Collect Earth Online")
(def ^:private secret-length  20)
(def ^:private code-digits    6)
(def ^:private step-seconds   30)
(def ^:private allowed-drift  1)

(def ^:private base32-alphabet "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")

(defn- bits->long [bits]
  (reduce (fn [acc bit] (+ (* acc 2) bit)) 0 bits))

(defn base32-encode [data]
  (->> data
       (mapcat (fn [b] (map #(bit-and (bit-shift-right b %) 1) (range 7 -1 -1))))
       (partition 5 5 (repeat 0))
       (map #(nth base32-alphabet (bits->long %)))
       (apply str)))

(defn base32-decode [s]
  (->> (str/upper-case s)
       (remove #{\space \- \=})
       (mapcat (fn [c]
                 (if-let [value (str/index-of base32-alphabet c)]
                   (map #(bit-and (bit-shift-right value %) 1) (range 4 -1 -1))
                   (throw (ex-info "Invalid Base32 character." {:character c})))))
       (partition 8)
       (map #(unchecked-byte (bits->long %)))
       (byte-array)))

(defn generate-secret []
  (let [secret (byte-array secret-length)]
    (.nextBytes (SecureRandom.) secret)
    (base32-encode secret)))

(defn- hotp [^bytes key counter digits]
  (let [mac          (doto (Mac/getInstance "HmacSHA1")
                       (.init (SecretKeySpec. key "HmacSHA1")))
        ^bytes hash  (.doFinal mac (.array (.putLong (ByteBuffer/allocate 8) (long counter))))
        offset       (bit-and (aget hash (dec (alength hash))) 0x0f)
        binary       (bit-and (.getInt (ByteBuffer/wrap hash) (int offset)) 0x7fffffff)]
    (format (str "%0" digits "d")
            (mod binary (long (Math/pow 10 digits))))))

(defn- codes-match? [^String expected ^String actual]
  (MessageDigest/isEqual (.getBytes expected StandardCharsets/UTF_8)
                         (.getBytes actual StandardCharsets/UTF_8)))

(defn valid-code?
  ([secret code]
   (valid-code? secret code (quot (System/currentTimeMillis) 1000)))
  ([secret code epoch-seconds]
   (let [code (str/replace (str code) #"\s" "")]
     (boolean
      (and (not (str/blank? secret))
           (re-matches (re-pattern (str "\\d{" code-digits "}")) code)
           (let [key     (base32-decode secret)
                 counter (quot epoch-seconds step-seconds)]
             (some #(codes-match? (hotp key (+ counter %) code-digits) code)
                   (range (- allowed-drift) (inc allowed-drift)))))))))

(defn otpauth-uri [email secret]
  (let [encode #(-> (URLEncoder/encode (str %) "UTF-8")
                    (str/replace "+" "%20"))]
    (format "otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d"
            (encode issuer)
            (encode email)
            secret
            (encode issuer)
            code-digits
            step-seconds)))

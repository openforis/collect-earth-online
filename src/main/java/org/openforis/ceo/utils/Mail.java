package org.openforis.ceo.utils;

import java.util.List;
import java.util.Properties;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import javax.mail.Address;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

public class Mail {

    public static final String CONTENT_TYPE_TEXT = "text/plain";

    public static final String CONTENT_TYPE_HTML = "text/html";

    public static boolean isEmail(String email) {
        var emailPattern = "(?i)[a-z0-9!#$%&'*+/=?^_`{|}~-]+" +
            "(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*" +
            "@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+" +
            "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";
        return Pattern.matches(emailPattern, email);
    }

    private static Address[] fromStringListToAddressArray(List<String> listString) {
        return listString.stream()
            .map(email -> {
                try {
                    return new InternetAddress(email);
                } catch (AddressException e) {
                    //e.printStackTrace();
                    return null;
                }
            })
            .collect(Collectors.toList())
            .toArray(new Address[0]);
    }

    public static void sendMail(String from, List<String> to, List<String> cc, List<String> bcc, String smtpServer, String smtpPort,
                                String smtpPassword, String subject, String body, String contentType) {
        try {
            // Get system properties
            var properties = new Properties();

            // Setup mail server
            properties.setProperty("mail.smtp.auth", "true");
            properties.setProperty("mail.smtp.starttls.enable", "true");
            properties.setProperty("mail.smtp.host", smtpServer);
            properties.setProperty("mail.smtp.port", smtpPort);

            if (smtpPort.equals("465")) {
                // Use the following if you need SSL
                properties.put("mail.smtp.socketFactory.port", smtpPort);
                properties.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
                properties.put("mail.smtp.socketFactory.fallback", "false");
            }

            // Get the default Session object.
            var session = Session.getInstance(properties,
                                              new javax.mail.Authenticator() {
                                                  protected PasswordAuthentication getPasswordAuthentication() {
                                                      return new PasswordAuthentication(from, smtpPassword);
                                                  }
                                              });

            // Create a default MimeMessage object.
            var message = new MimeMessage(session);

            // Set From: header field of the header.
            message.setFrom(new InternetAddress(from));

            // Set To: header field of the header.
            if (to != null && to.size() > 0) {
                message.addRecipients(Message.RecipientType.TO, fromStringListToAddressArray(to));
            }

            // Set Cc: header field of the header.
            if (cc != null && cc.size() > 0) {
                message.addRecipients(Message.RecipientType.CC, fromStringListToAddressArray(cc));
            }

            // Set Bcc: header field of the header.
            if (bcc != null && bcc.size() > 0) {
                message.addRecipients(Message.RecipientType.BCC, fromStringListToAddressArray(bcc));
            }

            // Set Subject: header field
            message.setSubject(subject);

            if (contentType == null || contentType.equals(Mail.CONTENT_TYPE_TEXT)) {
                // Now set the actual message
                message.setText(body);
            } else if (contentType.equals(Mail.CONTENT_TYPE_HTML)) {
                // Send the actual HTML message, as big as you like
                message.setContent(body, "text/html");
            }

            // Send message
            Transport.send(message);
        } catch (MessagingException e) {
            // e.printStackTrace();
            System.out.println("Error sending mail: " + e.getMessage());
        }
    }

}

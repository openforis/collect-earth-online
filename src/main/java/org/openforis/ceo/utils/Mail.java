package org.openforis.ceo.utils;

import java.util.Properties;
import java.util.regex.Pattern;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

public class Mail {

    public static boolean isEmail(String email) {
        var emailPattern = "(?i)[a-z0-9!#$%&'*+/=?^_`{|}~-]+" +
            "(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*" +
            "@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+" +
            "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";
        return Pattern.matches(emailPattern, email);
    }

    public static void sendMail(String from, String to, String smtpServer, String smtpPort,
                                String smtpPassword, String subject, String body) {
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
            message.addRecipient(Message.RecipientType.TO, new InternetAddress(to));

            // Set Subject: header field
            message.setSubject(subject);

            // Now set the actual message
            message.setText(body);

            // Send message
            Transport.send(message);
        } catch (MessagingException e) {
            // e.printStackTrace();
            System.out.println("Error sending mail: " + e.getMessage());
        }
    }

}

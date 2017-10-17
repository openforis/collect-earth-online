package org.openforis.ceo;

import java.util.Properties;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

public class Mail {

    public static void sendMail(String from, String to, String smtpServer, String smtpPort, String smtpPassword, String subject, String body) {
        try {
            // Get system properties
            Properties properties = new Properties();

            // Setup mail server
            properties.setProperty("mail.smtp.auth", "true");
            properties.setProperty("mail.smtp.starttls.enable", "true");
            properties.setProperty("mail.smtp.host", smtpServer);
            properties.setProperty("mail.smtp.port", smtpPort);

            // Get the default Session object.
            Session session = Session.getInstance(properties,
                                                  new javax.mail.Authenticator() {
                                                      protected PasswordAuthentication getPasswordAuthentication() {
                                                          return new PasswordAuthentication(from, smtpPassword);
                                                      }
                                                  });

            // Create a default MimeMessage object.
            MimeMessage message = new MimeMessage(session);

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
            e.printStackTrace();
        }
    }

}

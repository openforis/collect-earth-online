package org.openforis.ceo;

// import javax.mail.Properties;
// import javax.mail.Session;
// import javax.mail.MimeMessage;
// import javax.mail.Message;
// import javax.mail.InternetAddress;
// import javax.mail.Transport;
// import javax.mail.MessagingException;

import java.util.*;
import javax.mail.*;
import javax.mail.internet.*;
import javax.activation.*;

public class Mail {

    public static void sendMail(String from, String to, String smtpServer, String subject, String body) {
        try {
            // Get system properties
            Properties properties = System.getProperties();

            // Setup mail server
            properties.setProperty("mail.smtp.host", smtpServer);

            // Get the default Session object.
            Session session = Session.getDefaultInstance(properties);

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

package org.openforis.ceo.utils;

import java.nio.file.Paths;
import java.util.Collection;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicInteger;
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
import org.openforis.ceo.env.CeoConfig;

public class Mail {

    public static final String CONTENT_TYPE_TEXT = "text/plain";
    public static final String CONTENT_TYPE_HTML = "text/html";
    private static final String BASE_URL         = CeoConfig.baseUrl;

    public static boolean isEmail(String email) {
        var emailPattern = "(?i)[a-z0-9!#$%&'*+/=?^_`{|}~-]+" +
            "(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*" +
            "@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+" +
            "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";
        return Pattern.matches(emailPattern, email);
    }

    private static Address[] fromStringListToAddressArray(Collection<String> listString) {
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

    public static void sendMail(String from, Collection<String> to, Collection<String> cc, Collection<String> bcc, String smtpServer, String smtpPort,
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

            // Set Content
            message.setContent(body, contentType != null && contentType.equals(Mail.CONTENT_TYPE_HTML) ? Mail.CONTENT_TYPE_HTML : Mail.CONTENT_TYPE_TEXT);

            // Send message
            Transport.send(message);
        } catch (MessagingException e) {
            // e.printStackTrace();
            System.out.println("Error sending mail: " + e.getMessage());
        }
    }

    // TODO, there is no way to pick up errors from here.
    public static void sendToMailingList(String from, List<String> bcc, String smtpServer, String smtpPort,
                                         String smtpPassword, String subject, String body, String contentType, int chunkSize) {
        var counter = new AtomicInteger();
        if (bcc.size() > 0) {
            var unsubscribeUrl = Paths.get(BASE_URL, "unsubscribe-mailing-list");
            var newBody = body + "<br><hr><p><a href=\"https://" + unsubscribeUrl + "\">Unsubscribe</a></p>";
            bcc.stream()
                .collect(Collectors.groupingBy(it -> counter.getAndIncrement() / chunkSize))
                .values()
                .forEach(chunkBcc -> {
                    sendMail(from, null, null, chunkBcc, smtpServer, smtpPort, smtpPassword, subject, newBody, contentType);
                }
            );
        }
    }

}

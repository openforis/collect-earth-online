package org.openforis.ceo.env;

import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import spark.servlet.SparkFilter;

public class CeoSparkFilter extends SparkFilter {

    // Read context parameters from webapp/WEB-INF/web.xml
    public void init(FilterConfig filterConfig) throws ServletException {
        var context                   = filterConfig.getServletContext();
        CeoConfig.documentRoot        = context.getInitParameter("documentRoot");
        CeoConfig.databaseType        = context.getInitParameter("databaseType");
        CeoConfig.baseUrl             = context.getInitParameter("baseUrl");
        CeoConfig.smtpUser            = context.getInitParameter("smtpUser");
        CeoConfig.smtpServer          = context.getInitParameter("smtpServer");
        CeoConfig.smtpPort            = context.getInitParameter("smtpPort");
        CeoConfig.smtpPassword        = context.getInitParameter("smtpPassword");
        CeoConfig.smtpRecipientLimit  = context.getInitParameter("smtpRecipientLimit");
        CeoConfig.mailingListInterval = context.getInitParameter("mailingListInterval");
        super.init(filterConfig);
    }

}

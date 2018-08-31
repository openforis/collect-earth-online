package org.openforis.ceo.env;

import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import spark.servlet.SparkFilter;

public class CeoSparkFilter extends SparkFilter {

    // Read context parameters from webapp/WEB-INF/web.xml
    public void init(FilterConfig filterConfig) throws ServletException {
        var context             = filterConfig.getServletContext();
        CeoConfig.documentRoot  = context.getInitParameter("documentRoot");
        CeoConfig.baseUrl       = context.getInitParameter("baseUrl");
        CeoConfig.collectApiUrl = context.getInitParameter("collectApiUrl");
        CeoConfig.ofUsersApiUrl = context.getInitParameter("ofUsersApiUrl");
        CeoConfig.smtpUser      = context.getInitParameter("smtpUser");
        CeoConfig.smtpServer    = context.getInitParameter("smtpServer");
        CeoConfig.smtpPort      = context.getInitParameter("smtpPort");
        CeoConfig.smtpPassword  = context.getInitParameter("smtpPassword");
        super.init(filterConfig);
    }

}

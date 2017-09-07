package org.openforis.ceo;

import javax.servlet.FilterConfig;
import javax.servlet.ServletException;

import spark.servlet.SparkFilter;

public class CeoSparkFilter extends SparkFilter {

	public void init(FilterConfig filterConfig) throws ServletException {
		CeoConfig.collectApiUrl = filterConfig.getServletContext().getInitParameter("collectApiUrl");
		CeoConfig.ofUsersApiUrl = filterConfig.getServletContext().getInitParameter("ofUsersApiUrl");
		super.init(filterConfig);
	}

}

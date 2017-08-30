package org.openforis.ceo;

import javax.servlet.FilterConfig;
import javax.servlet.ServletException;

import spark.servlet.SparkFilter;

public class CeoSparkFilter extends SparkFilter {

	public void init(FilterConfig filterConfig) throws ServletException {
		String collectApiSurveyUrl = filterConfig.getServletContext().getInitParameter("collectApiSurveyUrl");
		CeoConfig.collectApiSurveyUrl = collectApiSurveyUrl;
		super.init(filterConfig);
	}

}

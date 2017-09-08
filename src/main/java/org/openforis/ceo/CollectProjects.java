package org.openforis.ceo;

import static org.openforis.ceo.JsonUtils.*;
import static org.openforis.ceo.JsonUtils.parseJson;
import static org.openforis.ceo.PartUtils.partToString;
import static org.openforis.ceo.PartUtils.partsToJsonObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.servlet.MultipartConfigElement;

import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpContent;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.http.json.JsonHttpContent;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.GenericData;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

import spark.Request;
import spark.Response;

public class CollectProjects {

    static final String COLLECT_API_URL = CeoConfig.collectApiUrl;
    static final HttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    static final JsonFactory JSON_FACTORY = new JacksonFactory();

    public static HttpRequestFactory createRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
            request.setParser(new JsonObjectParser(JSON_FACTORY));
        });
    }

    /**
     * Call Collect's REST API to QUERY the database.
     * @param req
     * @param res
     * @return the JSON array of JSON objects (one per project) that match the relevant query filters
     */
    public static String getAllProjects(Request req, Response res) {
        String userId = req.queryParams("userId");
        String institutionId = req.queryParams("institutionId");
        String url = COLLECT_API_URL + "survey";
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userId", userId);
        params.put("groupId", institutionId);
        params.put("full", true);
        params.put("includeCodeListValues", true);
        return getFromCollect(url, params);
    }

	/**
     * Call Collect's REST API to QUERY the database.
     * @param req
     * @param res
     * @return the JSON object for project with matching id or an empty
     */
    public static String getProjectById(Request req, Response res) {
        String projectId = req.params(":id");
		String url = "survey/" + projectId;
        return getFromCollect(url);
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return JSON array of plot objects if numPlots < maxPlots.
    // Otherwise, select an evenly spaced sample of the plots of
    // size maxPlots.
    //
    // ==> "[{},{},{}]" where [].length <= maxPlots
    public static String getProjectPlots(Request req, Response res) {
        String projectId = req.params(":id");
        int maxPlots = Integer.parseInt(req.params(":max"));
        String samplingPointItemsJson = getFromCollect("survey/" + projectId + "/sampling_point_data.json");
        JsonArray samplingPointItems = parseJson(samplingPointItemsJson).getAsJsonArray();
        int numPlots = samplingPointItems.size();
        
        JsonArray filteredSamplingPointItems;
        if (numPlots > maxPlots) {
            double stepSize = 1.0 * numPlots / maxPlots;
            filteredSamplingPointItems = 
        		Stream.iterate(0.0, i -> i + stepSize)
		            .limit(maxPlots)
		            .map(i -> (JsonObject) samplingPointItems.get(Math.toIntExact(Math.round(i))))
		            .collect(intoJsonArray);
        } else {
        	filteredSamplingPointItems = samplingPointItems;
        }
        //convert Collect SamplingPointItems into CEO plots
        JsonArray convertedItems = toElementStream(filteredSamplingPointItems).map(el -> {
        	JsonObject samplingItemObj = (JsonObject) el;
        	JsonObject centerObj = new JsonObject();
        	centerObj.add("type", new JsonPrimitive("Point"));
        	centerObj.add("coordinates", Arrays.asList(samplingItemObj.get("y"), samplingItemObj.get("x")).stream().collect(intoJsonArray));
        	JsonObject obj = new JsonObject();
        	obj.add("center", centerObj);
        	obj.add("id", samplingItemObj.get("levelCodes").getAsJsonArray().get(0));
            
        	//TODO load records from Collect to extract this information
        	obj.add("flagged", new JsonPrimitive("false"));
        	obj.add("analyses", new JsonPrimitive(0));
        	obj.add("user", null);
        	return obj;
        }).collect(intoJsonArray);

        return convertedItems.toString();
        //[{center: "{\"type\":\"Point\",\"coordinates\":[102.999640127073,22.0468074686287]}", id: 4289, flagged: false, analyses: 0, user: null,
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return a JSON object with several computed integer fields
    //
    // ==> "{flaggedPlots:#,analyzedPlots:#,unanalyzedPlots:#,members:#,contributors:#}"
    public static String getProjectStats(Request req, Response res) {
        String projectId = req.params(":id");
        // ...
        return "{flaggedPlots:0,analyzedPlots:0,unanalyzedPlots:0,members:0,contributors:0}";
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return a JSON object representing a randomly selected plot
    // with attributes flagged=false and analyses=0. If no such
    // plots exist in the database, return the string "done".
    //
    // ==> "{flagged:false,analyses:0,...}" | "done"
    public static String getUnanalyzedPlot(Request req, Response res) {
        String projectId = req.params(":id");
        // ...
        return "done";
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Read in the project and plot data for a project with
    // matching id, compute several plot-level aggregate
    // statistics, write these to a file in CSV format, and return
    // a string representing the URL from which this CSV may be
    // downloaded.
    //
    // ==> "/downloads/ceo-<projectName>-<currentDate>.csv"
    public static String dumpProjectAggregateData(Request req, Response res) {
        String projectId = req.params(":id");
        // ...
        return "/downloads/ceo-i-dont-exist-today.csv";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Change the availability attribute to "published" for the
    // project with matching id. Return the empty string.
    //
    // ==> ""
    public static synchronized String publishProject(Request req, Response res) {
        String projectId = req.params(":id");
        return patchToCollect("survey/publish/" + projectId);
    }

	// Call Collect's REST API to MODIFY the database.
    //
    // Change the availability attribute to "closed" for the
    // project with matching id. Return the empty string.
    //
    // ==> ""
    public static synchronized String closeProject(Request req, Response res) {
        String projectId = req.params(":id");
        // ...
        return "";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Change the availability attribute to "archived" and the
    // archived attribute to true for the project with matching
    // id. Return the empty string.
    //
    // ==> ""
    public static synchronized String archiveProject(Request req, Response res) {
        String projectId = req.params(":id");
        // ...
        return "";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Increment the analyses attribute and set the user attribute
    // to userName for the plot with matching projectId and
    // plotId. Set the value attribute to userSamples[sampleId]
    // for each sample belonging to the selected plot. Return the
    // empty string.
    //
    // ==> ""
    public static synchronized String addUserSamples(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String projectId = jsonInputs.get("projectId").getAsString();
        String plotId = jsonInputs.get("plotId").getAsString();
        String userName = jsonInputs.get("userId").getAsString();
        JsonObject userSamples = jsonInputs.get("userSamples").getAsJsonObject();
        // ...
        return "";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Change the flagged attribute to true for the project with
    // matching id. Return the empty string.
    //
    // ==> ""
    public static synchronized String flagPlot(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String projectId = jsonInputs.get("projectId").getAsString();
        String plotId = jsonInputs.get("plotId").getAsString();
        // ...
        return "";
    }

    // NOTE: This function is extremely complicated. We will need to
    // work together to move it to Collect.
    //
    // Create a new project and compute the layout and attributes of
    // its plots and sample points. Return the new project id as a
    // string.
    //
    // ==> "<newProjectId>"
    public static synchronized String createProject(Request req, Response res) {
        try {
            // Create a new multipart config for the servlet
            // NOTE: This is for Jetty. Under Tomcat, this is handled in the webapp/META-INF/context.xml file.
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));

            // Read the input fields into a new JsonObject (NOTE: fields will be camelCased)
            JsonObject newProject = partsToJsonObject(req,
                                                      new String[]{"institution", "privacy-level", "lon-min", "lon-max", "lat-min", "lat-max",
                                                                   "base-map-source", "imagery-year", "stacking-profile", "plot-distribution",
                                                                   "num-plots", "plot-spacing", "plot-shape", "plot-size", "sample-distribution",
                                                                   "samples-per-plot", "sample-resolution", "sample-values"});

            // Manually add the name and description fields since they may be invalid JSON
            newProject.addProperty("name", partToString(req.raw().getPart("name")));
            newProject.addProperty("description", partToString(req.raw().getPart("description")));

            
            GenericData data = convertToCollectProjectParameters(newProject);
			
            HttpRequest collectRequest = createRequestFactory().buildPostRequest(new GenericUrl(COLLECT_API_URL + "survey/simple"), 
					new JsonHttpContent(JSON_FACTORY, data));
			return collectRequest.execute().parseAsString();
        } catch (Exception e) {
            // Indicate that an error occurred with project creation
            throw new RuntimeException(e);
        }
    }

	private static GenericData convertToCollectProjectParameters(JsonObject newProject) {
		GenericData data = new GenericData();
		data.put("name", newProject.get("name").getAsString());
		data.put("description", newProject.get("description").getAsString());
		data.put("userGroupId", newProject.get("institution").getAsLong());
		GenericData samplingPointGenerationData = new GenericData();
		data.put("samplingPointGenerationSettings", samplingPointGenerationData);
		
		List<GenericData> aoiBoundary = extractAoiBoundaryData(newProject);
		samplingPointGenerationData.put("aoiBoundary", aoiBoundary);
		
		List<GenericData> samplingPointSettings = new ArrayList<GenericData>(2);
		GenericData plotLevelSettings = new GenericData();
		plotLevelSettings.put("numPoints", newProject.get("num-plots").getAsInt());
		plotLevelSettings.put("shape", newProject.get("plot-shape").getAsString().toUpperCase());
		plotLevelSettings.put("distribution", newProject.get("plot-distribution").getAsString().toUpperCase());
		plotLevelSettings.put("resolution", newProject.get("plot-spacing").getAsDouble());
		plotLevelSettings.put("pointWidth", newProject.get("plot-size").getAsDouble());
		samplingPointSettings.add(plotLevelSettings);
		
		GenericData sampleLevelSettings = new GenericData();
		sampleLevelSettings.put("numPoints", newProject.get("samples-per-plot").getAsInt());
		sampleLevelSettings.put("shape", "CIRCLE");
		sampleLevelSettings.put("distribution", newProject.get("sample-distribution").getAsString().toUpperCase());
		sampleLevelSettings.put("resolution", newProject.get("sample-resolution").getAsDouble());
		sampleLevelSettings.put("pointWidth", 10.0d);
		samplingPointSettings.add(sampleLevelSettings);
		
		List<GenericData> valueItems = new ArrayList<GenericData>();
		JsonArray values = newProject.get("sample-values").getAsJsonArray();
		for (JsonElement valEl: values) {
			valueItems.add(convertToCodeItemData((JsonObject) valEl));
		}
		data.put("values", valueItems);
		return data;
	}

	private static GenericData convertToCodeItemData(JsonObject valEl) {
		GenericData codeItem = new GenericData();
		codeItem.put("code", valEl.get("id").getAsString());
		codeItem.put("label", valEl.get("name").getAsString());
		codeItem.put("color", valEl.get("color").getAsString());
		return codeItem;
	}

	private static List<GenericData> extractAoiBoundaryData(JsonObject jsonObj) {
		return Arrays.asList(
				extractCoordinateData(jsonObj, "lat-min", "lon-min"),
				extractCoordinateData(jsonObj, "lat-min", "lon-max"),
				extractCoordinateData(jsonObj, "lat-max", "lon-min"),
				extractCoordinateData(jsonObj, "lat-max", "lon-max")
		);
	}

	private static GenericData extractCoordinateData(JsonObject jsonObj, String latMember, String lonMember) {
		GenericData data = new GenericData();
		data.put("x", jsonObj.get(latMember).getAsDouble());
		data.put("y", jsonObj.get(lonMember).getAsDouble());
		data.put("srsId", "EPSG:4326");
		return data;
	}

	private static String getFromCollect(String url) {
		return getFromCollect(url, null);
	}

	private static String getFromCollect(String url, Map<String, Object> params) {
        try {
            HttpRequestFactory requestFactory = createRequestFactory();
			HttpRequest request = requestFactory.buildGetRequest(new GenericUrl(COLLECT_API_URL + url));
			request.getUrl().putAll(params);
            return request.execute().parseAsString();
        } catch (IOException e) {
            e.printStackTrace();
            return "";
        }
	}


    private static String patchToCollect(String url) {
    	return patchToCollect(url, null);
    }
    
	private static String patchToCollect(String url, Object data) {
    	try {
            HttpRequestFactory requestFactory = createRequestFactory();
			HttpContent content = data == null ? null : new JsonHttpContent(JSON_FACTORY, data);
			HttpRequest request = requestFactory.buildPatchRequest(new GenericUrl(COLLECT_API_URL + url), content);
            return request.execute().parseAsString();
        } catch (IOException e) {
            e.printStackTrace();
            return "";
        }
	}

}

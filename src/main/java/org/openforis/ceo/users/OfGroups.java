package org.openforis.ceo.users;

import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.getMemberValue;
import static org.openforis.ceo.utils.JsonUtils.mapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.toStream;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.RequestUtils.getResponseAsJson;
import static org.openforis.ceo.utils.RequestUtils.prepareDeleteRequest;
import static org.openforis.ceo.utils.RequestUtils.prepareGetRequest;
import static org.openforis.ceo.utils.RequestUtils.preparePatchRequest;
import static org.openforis.ceo.utils.RequestUtils.preparePostRequest;

import com.google.api.client.http.ByteArrayContent;
import com.google.api.client.http.HttpHeaders;
import com.google.api.client.http.HttpMediaType;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.MultipartContent;
import com.google.api.client.util.GenericData;
import com.google.api.client.util.Maps;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.Part;
import org.openforis.ceo.db_api.Institutions;
import org.openforis.ceo.env.CeoConfig;
import spark.Request;
import spark.Response;
import spark.utils.IOUtils;

public class OfGroups implements Institutions {

    private static final String OF_USERS_API_URL = CeoConfig.ofUsersApiUrl;

    public static JsonArray getAllInstitutions(String username) {
        try {
            var url = OF_USERS_API_URL + "group";
            var response = prepareGetRequest(url).execute(); // get all groups
            var privateInstitutionName = username == null ? null : username.replaceAll("\\W", "_") + "_private_group";
            if (response.isSuccessStatusCode()) {
                var groups = getResponseAsJson(response).getAsJsonArray();
                var hiddenInstitutions = Arrays.asList("default_public_group", "admin_private_group");
                var visibleGroups = filterJsonArray(groups, group ->
                                                    group.get("enabled").getAsBoolean() == true
                                                    && (!group.get("name").getAsString().endsWith("_private_group") || 
                                                        privateInstitutionName != null && group.get("name").getAsString().equals(privateInstitutionName)) 
                                                    && !hiddenInstitutions.contains(group.get("name").getAsString()));
                var institutions = mapJsonArray(visibleGroups, group -> {
                        var institution = new JsonObject();
                        var institutionId = getMemberValue(group, "id", Integer.class);
                        institution.addProperty("id", institutionId);
                        institution.addProperty("name", getMemberValue(group, "label", String.class));
                        addUsersInGroup(institutionId, institution);
                        return institution;
                    });
                return institutions;
            } else {
                // FIXME: Raise a red flag that an error just occurred in communicating with the database
                return new JsonArray();
            }
        } catch (IOException e) {
            e.printStackTrace(); // TODO
            // FIXME: Raise a red flag that an error just occurred in communicating with the database
            return new JsonArray();
        }
    }

    public String getAllInstitutions(Request req, Response res) {
        var username = (String) req.raw().getSession().getAttribute("username");
		return getAllInstitutions(username).toString();
    }

    private static Optional<JsonObject> getInstitutionById(int institutionId) {
        try {
            var groupUrl = String.format(OF_USERS_API_URL + "group/%d", institutionId);
            var groupResponse = prepareGetRequest(groupUrl).execute(); // get group
            if (groupResponse.isSuccessStatusCode()) {
                var group = getResponseAsJson(groupResponse).getAsJsonObject();
                addUsersInGroup(institutionId, group);
                return Optional.ofNullable(group);
            } else {
                // FIXME: Raise a red flag that an error just occurred in communicating with the database
                return Optional.empty();
            }
        } catch (IOException e) {
            e.printStackTrace(); // TODO
            // FIXME: Raise a red flag that an error just occurred in communicating with the database
            return Optional.empty();
        }
    }

    private static void addUsersInGroup(int institutionId, JsonObject group) {
    	try {
	        var groupUsersUrl = String.format(OF_USERS_API_URL + "group/%d/users", institutionId);
	        var groupUsersResponse = prepareGetRequest(groupUsersUrl).execute(); // get group's users
	        var groupUsers = getResponseAsJson(groupUsersResponse).getAsJsonArray();
	        var members = new JsonArray();
	        var admins = new JsonArray();
	        var pending = new JsonArray();
	        toStream(groupUsers)
	            .forEach(groupUser -> {
	                    if (groupUser.get("statusCode").getAsString().equals("P")) pending.add(groupUser.get("userId"));
	                    else if (groupUser.get("roleCode").getAsString().equals("ADM")) admins.add(groupUser.get("userId"));
	                    else if (groupUser.get("roleCode").getAsString().equals("OWN")) admins.add(groupUser.get("userId"));
	                    else if (groupUser.get("roleCode").getAsString().equals("OPR")) members.add(groupUser.get("userId"));
	                    else if (groupUser.get("roleCode").getAsString().equals("VWR")) members.add(groupUser.get("userId"));
	                });
	        group.add("admins", admins);
	        group.add("members", members);
	        group.add("pending", pending);
    	} catch (IOException e) {
    		throw new RuntimeException(e);
    	}
    }

    public String getInstitutionDetails(Request req, Response res) {
        var institutionId = Integer.parseInt(req.params(":id"));
        var matchingInstitution = getInstitutionById(institutionId);
        if (matchingInstitution.isPresent()) {
            return matchingInstitution.get().toString();
        } else {
            var noInstitutionFound = new JsonObject();
            noInstitutionFound.addProperty("id", "-1");
            noInstitutionFound.addProperty("name", "No institution with ID=" + institutionId);
            noInstitutionFound.addProperty("logo", "");
            noInstitutionFound.addProperty("url", "");
            noInstitutionFound.addProperty("description", "");
            return noInstitutionFound.toString();
        }
    }

    public String updateInstitution(Request req, Response res) {
        try {
            var institutionId = req.params(":id");

            // Create a new multipart config for the servlet
            // NOTE: This is for Jetty. Under Tomcat, this is handled in the webapp/META-INF/context.xml file.
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));

            var userid = Integer.parseInt(partToString(req.raw().getPart("userid")));
            var name = partToString(req.raw().getPart("institution-name"));
            var url = partToString(req.raw().getPart("institution-url"));
            var description = partToString(req.raw().getPart("institution-description"));

            if (institutionId.equals("0")) {
                // NOTE: This branch creates a new institution

                var members = new JsonArray();
                var admins = new JsonArray();
                var pending = new JsonArray();
                var imagery = new JsonArray();
                members.add(1); // adding the admin user by default
                admins.add(1); // adding the admin user by default
                if (userid != 1) {
                    members.add(userid);
                    admins.add(userid);
                }

                // FIXME: Remove this code once the Institution page supports adding new imagery entries
                imagery.add(1);
                imagery.add(2);
                imagery.add(3);
                imagery.add(4);
                imagery.add(5);
                imagery.add(6);

                // Add parameters
                var parameters = Map.of("userid",      "" + userid,
                                        "name",        name,
                                        "url",         url,
                                        "description", description);
                var content = new MultipartContent().setMediaType(new HttpMediaType("multipart/form-data").setParameter("boundary", "__END_OF_PART__"));
                for (var key : parameters.keySet()) {
                    var part = new MultipartContent.Part(new ByteArrayContent(null, parameters.get(key).getBytes()));
                    part.setHeaders(new HttpHeaders().set("Content-Disposition", String.format("form-data; name=\"%s\"", key)));
                    content.addPart(part);
                }
                // Add file
                var logo = req.raw().getPart("institution-logo");
                var fileName = logo.getSubmittedFileName();
                if (fileName != null) {
                    var contentType = logo.getContentType();
                    var bytes = IOUtils.toByteArray(logo.getInputStream());
                    var part1 = new MultipartContent.Part(new ByteArrayContent(req.raw().getContentType(), bytes));
                    part1.setHeaders(new HttpHeaders().set("Content-Disposition", String.format("form-data; name=\"logo\"; filename=\"%s\"", fileName)));
                    content.addPart(part1);
                    var part2 = new MultipartContent.Part(new ByteArrayContent(null, contentType.getBytes()));
                    part2.setHeaders(new HttpHeaders().set("Content-Disposition", String.format("form-data; name=\"contentType\"", contentType)));
                    content.addPart(part2);
                }
                var response = preparePostRequest(OF_USERS_API_URL + "group", content).execute(); // create a new group
                if (response.isSuccessStatusCode()) {
                    var group = getResponseAsJson(response).getAsJsonObject();

                    var data = new GenericData();
                    data.put("roleCode", "ADM");
                    data.put("statusCode", "A");
                    preparePostRequest(String.format(OF_USERS_API_URL + "group/%s/user/%s", group.get("id").getAsString(), 1), data).execute();
                    if (userid != 1) {
                        preparePostRequest(String.format(OF_USERS_API_URL + "group/%s/user/%s", group.get("id").getAsString(), userid), data).execute();
                    }

                    var newInstitution = new JsonObject();
                    newInstitution.addProperty("id", group.get("id").getAsString());
                    newInstitution.addProperty("name", name);
                    newInstitution.addProperty("logo", "");
                    newInstitution.addProperty("url", url);
                    newInstitution.addProperty("description", description);
                    newInstitution.addProperty("archived", false);
                    newInstitution.add("members", members);
                    newInstitution.add("admins", admins);
                    newInstitution.add("pending", pending);
                    newInstitution.add("imagery", imagery);
                    return newInstitution.toString();
                }
            } else {
                // NOTE: This branch edits an existing institution
                // Add parameters
                var parameters = Map.of("userid", "" + userid,
                                        "name", name,
                                        "url", url,
                                        "description", description);
                var content = new MultipartContent().setMediaType(new HttpMediaType("multipart/form-data").setParameter("boundary", "__END_OF_PART__"));
                for (var key : parameters.keySet()) {
                    var part = new MultipartContent.Part(new ByteArrayContent(null, parameters.get(key).getBytes()));
                    part.setHeaders(new HttpHeaders().set("Content-Disposition", String.format("form-data; name=\"%s\"", key)));
                    content.addPart(part);
                }
                // Add file
                var logo = req.raw().getPart("institution-logo");
                var fileName = logo.getSubmittedFileName();
                if (fileName != null) {
                    var contentType = logo.getContentType();
                    var bytes = IOUtils.toByteArray(logo.getInputStream());
                    var part1 = new MultipartContent.Part(new ByteArrayContent(req.raw().getContentType(), bytes));
                    part1.setHeaders(new HttpHeaders().set("Content-Disposition", String.format("form-data; name=\"logo\"; filename=\"%s\"", fileName)));
                    content.addPart(part1);
                    var part2 = new MultipartContent.Part(new ByteArrayContent(null, contentType.getBytes()));
                    part2.setHeaders(new HttpHeaders().set("Content-Disposition", String.format("form-data; name=\"contentType\"", contentType)));
                    content.addPart(part2);
                }
                // Request
                var response = preparePatchRequest(OF_USERS_API_URL + "group/" + institutionId, content).execute(); // create a new group
                if (response.isSuccessStatusCode()) {
                    var group = getResponseAsJson(response).getAsJsonObject();
                    //
                    var newInstitution = new JsonObject();
                    newInstitution.addProperty("id", group.get("id").getAsString());
                    newInstitution.addProperty("name", name);
                    newInstitution.addProperty("logo", "");
                    newInstitution.addProperty("url", url);
                    newInstitution.addProperty("description", description);
                    return newInstitution.toString();
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return "";
    }

    public String archiveInstitution(Request req, Response res) {
        var institutionId = req.params(":id");
        var url = String.format(OF_USERS_API_URL + "group/%s", institutionId);
        var data = new GenericData();
        data.put("enabled", false);
        try {
            preparePatchRequest(url, data).execute(); // change group
            return "";
        } catch (IOException e) {
            e.printStackTrace(); // TODO
            // FIXME: Raise a red flag that an error just occurred in communicating with the database
            return "";
        }
    }
    
    public static JsonArray getResourceIds(int institutionId, String resourceType) throws IOException {
        var url = String.format(OF_USERS_API_URL + "group/%d/resources/%s", institutionId, resourceType);
        var response = prepareGetRequest(url).execute();
        return getResponseAsJson(response).getAsJsonArray();
    }
    
    public static String associateResource(int institutionId, String resourceType, String resourceId) throws IOException {
        preparePostRequest(String.format(OF_USERS_API_URL + "group/%d/resources/%s/%s", institutionId, resourceType, resourceId))
            .execute();
        return "";
    }

    public static String disassociateResource(int institutionId, String resourceType, String resourceId) throws IOException {
        prepareDeleteRequest(String.format(OF_USERS_API_URL + "group/%d/resources/%s/%s", institutionId, resourceType, resourceId))
            .execute();
        return "";
    }

}

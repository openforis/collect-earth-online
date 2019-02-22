package org.openforis.ceo.postgres;

import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.parseJson;


import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import java.io.StringWriter;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.PreparedStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.http.HttpServletResponse;
import org.openforis.ceo.db_api.Plots;
import spark.Request;
import spark.Response;



public class PostgresPlots implements Plots {

    private static JsonObject buildPlotJson(ResultSet rs) {
        var singlePlot = new JsonObject();
        try {
            singlePlot.addProperty("id",rs.getInt("id"));
            singlePlot.addProperty("projectId",rs.getInt("project_id"));
            singlePlot.addProperty("center",rs.getString("center"));
            singlePlot.addProperty("flagged",rs.getInt("flagged") == 0 ? false : true);
            singlePlot.addProperty("analyses",rs.getInt("assigned"));
            singlePlot.addProperty("user",rs.getString("username"));
            singlePlot.addProperty("confidence",rs.getInt("confidence"));
            singlePlot.addProperty("collectionTime", rs.getString("collection_time"));
            singlePlot.addProperty("analysisDuration", rs.getString("analysis_duration"));
            singlePlot.addProperty("plotId",rs.getString("plotId"));
            singlePlot.addProperty("geom",rs.getString("geom"));
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return singlePlot;
    }

    public  String getProjectPlots(Request req, Response res) {
        var projectId =     req.params(":id");
        var maxPlots =      Integer.parseInt(req.params(":max"));
        
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project_plots(?,?)")) {

            var plots = new JsonArray();
            pstmt.setInt(1,Integer.parseInt(projectId));
            pstmt.setInt(2,maxPlots);
            try(var rs = pstmt.executeQuery()){
                while (rs.next()) {
                    plots.add(buildPlotJson(rs));
                }
            }
            return  plots.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getProjectPlot(Request req, Response res) {
        var projectId = req.params(":project-id");
        var plotId = req.params(":plot-id");

        return "";
    }

    private static JsonArray getSampleJsonArray(Integer plot_id, Integer proj_id) {
        try (var conn = connect();
             var samplePstmt = conn.prepareStatement("SELECT * FROM select_plot_samples(?,?)")) {
            
            samplePstmt.setInt(1, plot_id);
            samplePstmt.setInt(2, proj_id);
            var samples = new JsonArray();
            try(var sampleRs = samplePstmt.executeQuery()){
                while (sampleRs.next()) {
                    var sample = new JsonObject();
                    sample.addProperty("id", sampleRs.getString("id"));
                    sample.addProperty("point", sampleRs.getString("point"));
                    sample.addProperty("sampleId",sampleRs.getString("sampleId"));
                    sample.addProperty("geom",sampleRs.getString("geom"));
                    if (sampleRs.getString("value").length() > 2) sample.add("value", parseJson(sampleRs.getString("value")).getAsJsonObject());
                    samples.add(sample);
                }
            }
            return samples;
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return new JsonArray();
        }
    }

    private String queryPlot(PreparedStatement pstmt, Integer projectId) {
        var plotData = new JsonObject();
        try (var rs = pstmt.executeQuery()) {
            while (rs.next()) {
                plotData = buildPlotJson(rs);
                plotData.add("samples", getSampleJsonArray(plotData.get("id").getAsInt(), projectId));
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
        return plotData.size() > 0 ? plotData.toString() : "done";
    }

    public String getPlotById(Request req, Response res) {
        final var projectId = Integer.parseInt(req.params(":projid"));
        final var plotId = Integer.parseInt(req.params(":id"));
        final var userName = req.queryParamOrDefault("userName", "");

        try (var conn = connect()) {
            if (userName.length() > 0) {
                try (var pstmt = conn.prepareStatement("SELECT * FROM select_user_plot_by_id(?,?,?)")) {
                    pstmt.setInt(1, projectId);
                    pstmt.setInt(2, plotId);
                    pstmt.setString(3, userName);
                    return queryPlot(pstmt, projectId);
                }
            } else {
                try (var pstmt = conn.prepareStatement("SELECT * FROM select_unassigned_plot_by_id(?,?)")) {
                    pstmt.setInt(1, projectId);
                    pstmt.setInt(2, plotId);
                    return queryPlot(pstmt, projectId);
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getNextPlot(Request req, Response res) {
        final var projectId =     Integer.parseInt(req.params(":projid"));
        final var plotId =        Integer.parseInt(req.params(":id"));
        final var userName =    req.queryParamOrDefault("userName", "");

        try (var conn = connect()) {
            if (userName.length() > 0) {
                try (var pstmt = conn.prepareStatement("SELECT * FROM select_next_user_plot(?,?,?)")) {
                    pstmt.setInt(1, projectId);
                    pstmt.setInt(2, plotId);
                    pstmt.setString(3, userName);
                    return queryPlot(pstmt, projectId);
                }
            } else {
                try (var pstmt = conn.prepareStatement("SELECT * FROM select_next_unassigned_plot(?,?)")) {
                    pstmt.setInt(1, projectId);
                    pstmt.setInt(2, plotId);
                    return queryPlot(pstmt, projectId);
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getPrevPlot(Request req, Response res) {
        final var projectId =     Integer.parseInt(req.params(":projid"));
        final var plotId =        Integer.parseInt(req.params(":id"));
        final var userName =    req.queryParamOrDefault("userName", "");

        try (var conn = connect()) {
            if (userName.length() > 0) {
                try (var pstmt = conn.prepareStatement("SELECT * FROM select_prev_user_plot(?,?,?)")) {
                    pstmt.setInt(1, projectId);
                    pstmt.setInt(2, plotId);
                    pstmt.setString(3, userName);
                    return queryPlot(pstmt, projectId);
                }
            } else {
                try (var pstmt = conn.prepareStatement("SELECT * FROM select_prev_unassigned_plot(?,?)")) {
                    pstmt.setInt(1, projectId);
                    pstmt.setInt(2, plotId);
                    return queryPlot(pstmt, projectId);
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String resetPlotLock(Request req, Response res) {return "";}
    public String releasePlotLock(Request req, Response res) {return "";}

    private static String unlockPlot(Integer plotId, Integer userId) {return "";}
    private static String lockPlot(Integer plotId, Integer userId, Integer seconds) {return "";}

    private static String valueOrBlank(String input) {

        return input == null || input.equals("null") ? "" : input;
    }

    public String addUserSamples(Request req, Response res) {
        final var jsonInputs =            parseJson(req.body()).getAsJsonObject();
        final var projectId =             jsonInputs.get("projectId").getAsString();
        final var plotId =                jsonInputs.get("plotId").getAsString();
        final var userName =              jsonInputs.get("userId").getAsString();
        final var confidence =            jsonInputs.get("confidence").getAsInt();
        final var collectionStart =       jsonInputs.get("collectionStart").getAsString();
        final var userSamples =           jsonInputs.get("userSamples").getAsJsonObject();
        final var userImages =            jsonInputs.get("userImages").getAsJsonObject();

        // check if valid user before adding (should be from UI, but its one less join and partial spam security)
        try (var conn = connect();
            final var userPstmt = conn.prepareStatement("SELECT * FROM get_user(?)")) {
            
            userPstmt.setString(1, userName);
            try(var userRs = userPstmt.executeQuery()){
                if (userRs.next()){
                    final var userId = userRs.getInt("id");
                    // check if user has already saved
                    try(var usPstmt = conn.prepareStatement("SELECT * FROM check_user_plots(?,?,?)")) {
                        usPstmt.setInt(1, Integer.parseInt(projectId));
                        usPstmt.setInt(2, Integer.parseInt(plotId));
                        usPstmt.setInt(3, userId);
                        try(var usRs = usPstmt.executeQuery()) {
                            // update existing
                            if (usRs.next()) {
                                final var userPlotId = usRs.getInt("user_plots_id");
                                final var SQL = "SELECT * FROM update_user_samples(?,?,?,?,?::int,?::timestamp,?::jsonb,?::jsonb)";
                                final var pstmt = conn.prepareStatement(SQL) ;
                                pstmt.setInt(1, userPlotId);
                                pstmt.setInt(2, Integer.parseInt(projectId));
                                pstmt.setInt(3, Integer.parseInt(plotId));
                                pstmt.setInt(4, userId);
                                pstmt.setString(5, confidence == -1 ? null : Integer.toString(confidence));
                                pstmt.setTimestamp(6, new Timestamp(Long.parseLong(collectionStart)));
                                pstmt.setString(7, userSamples.toString());
                                pstmt.setString(8, userImages.toString());
                                pstmt.execute();                                
                                return plotId;
                            // add new
                            } else {
                                final var SQL = "SELECT * FROM add_user_samples(?,?,?,?::int,?::timestamp,?::jsonb,?::jsonb)";
                                final var pstmt = conn.prepareStatement(SQL) ;
                                pstmt.setInt(1, Integer.parseInt(projectId));
                                pstmt.setInt(2, Integer.parseInt(plotId));
                                pstmt.setInt(3, userId);
                                pstmt.setString(4, confidence == -1 ? null : Integer.toString(confidence));
                                pstmt.setTimestamp(5, new Timestamp(Long.parseLong(collectionStart)));
                                pstmt.setString(6, userSamples.toString());
                                pstmt.setString(7, userImages.toString());
                                pstmt.execute();
                                return plotId;
                            }
                        }
                    }
                }
                return "";
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String flagPlot(Request req, Response res) {
        var jsonInputs =        parseJson(req.body()).getAsJsonObject();
        var plotId =            jsonInputs.get("plotId").getAsString();
        var userName =          jsonInputs.get("userId").getAsString();
        
        try (var conn = connect();
            var pstmt = conn.prepareStatement("SELECT * FROM flag_plot(?,?,?::int)")) {
            
            pstmt.setInt(1,Integer.parseInt(plotId));
            pstmt.setString(2,userName);
            pstmt.setString(3,null); //confidence
            try(var rs = pstmt.executeQuery()){
                var idReturn = 0;
                if (rs.next()) {
                    idReturn = rs.getInt("flag_plot");
                }
                return Integer.toString(idReturn);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }
}

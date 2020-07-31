package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.parseJson;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import org.openforis.ceo.db_api.Plots;
import spark.Request;
import spark.Response;

public class PostgresPlots implements Plots {

    private static JsonObject buildPlotJson(ResultSet rs) {
        var singlePlot = new JsonObject();
        try {
            singlePlot.addProperty("id", rs.getInt("plot_id"));
            singlePlot.addProperty("center", rs.getString("center"));
            singlePlot.addProperty("flagged", rs.getInt("flagged") == 0 ? false : true);
            singlePlot.addProperty("analyses", rs.getInt("assigned"));
        } catch (Exception e) {
            System.out.println(e.getMessage());
        }
        return singlePlot;
    }

    private static JsonObject getExtraPlotInfo(ResultSet rs) {
        try {
            var extraPlotInfo = parseJson(rs.getString("extra_plot_info")).getAsJsonObject();
            extraPlotInfo.remove("gid");
            extraPlotInfo.remove("lat");
            extraPlotInfo.remove("lon");
            extraPlotInfo.remove("plotid");
            return extraPlotInfo;
        } catch (Exception e) {
            return new JsonObject();
        }
    }

    private static JsonObject buildPlotCollectionJson(ResultSet rs, int projectId) {
        try {
            var singlePlot = new JsonObject();
            singlePlot.addProperty("id", rs.getInt("plot_id"));
            singlePlot.addProperty("projectId", rs.getInt("project_id"));
            singlePlot.addProperty("center", rs.getString("center"));
            singlePlot.addProperty("flagged", rs.getInt("flagged") == 0 ? false : true);
            singlePlot.addProperty("analyses", rs.getInt("assigned"));
            singlePlot.addProperty("plotId", rs.getString("plotId"));
            singlePlot.addProperty("geom", rs.getString("geom"));
            singlePlot.add("extraPlotInfo", getExtraPlotInfo(rs));
            singlePlot.add("samples", getSampleJsonArray(singlePlot.get("id").getAsInt(), projectId));
            return singlePlot;
        } catch (Exception e) {
            System.out.println(e.getMessage());
            return new JsonObject();
        }
    }

    public String getProjectPlots(Request req, Response res) {
        var projectId =     Integer.parseInt(req.queryParams("projectId"));
        var maxPlots =      Integer.parseInt(req.queryParams("max"));

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_limited_project_plots(?,?)")) {

            var plots = new JsonArray();
            pstmt.setInt(1, projectId);
            pstmt.setInt(2, maxPlots);
            try (var rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    plots.add(buildPlotJson(rs));
                }
            }
            return plots.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getProjectPlot(Request req, Response res) {
        final var projectId =   Integer.parseInt(req.queryParams("projectId"));
        final var plotId =      Integer.parseInt(req.queryParams("plotId"));

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_plot_by_id(?,?)")) {

            pstmt.setInt(1, projectId);
            pstmt.setInt(2, plotId);
            try (var rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return buildPlotCollectionJson(rs, projectId).toString();
                } else {
                    return "";
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    private static JsonArray getSampleJsonArray(Integer plot_id, Integer proj_id) {
        try (var conn = connect();
             var samplePstmt = conn.prepareStatement("SELECT * FROM select_plot_samples(?,?)")) {

            samplePstmt.setInt(1, plot_id);
            samplePstmt.setInt(2, proj_id);
            var samples = new JsonArray();
            try (var sampleRs = samplePstmt.executeQuery()) {
                while (sampleRs.next()) {
                    var sample = new JsonObject();
                    sample.addProperty("id", sampleRs.getString("sample_id"));
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

    private static String queryPlot(PreparedStatement pstmt, Integer projectId, Integer userId) {
        try (var rs = pstmt.executeQuery()) {
            if (rs.next()) {
                var plotData = buildPlotCollectionJson(rs, projectId);
                unlockPlots(userId);
                lockPlot(plotData.get("id").getAsInt(), userId);
                return plotData.toString();
            }  else {
                return "done";
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public synchronized String getPlotById(Request req, Response res) {
        final var getUserPlots =       Boolean.parseBoolean(req.queryParams("getUserPlots"));
        final var projectId =          Integer.parseInt(req.queryParams("projectId"));
        final var plotId =             Integer.parseInt(req.queryParams("plotId"));
        final var userId =             Integer.parseInt(req.queryParams("userId"));
        final var userName =           req.queryParams("userName");

        try (var conn = connect()) {
            try (var plotPstmt = conn.prepareStatement("SELECT * FROM select_plot_by_id(?,?)")) {
                plotPstmt.setInt(1, projectId);
                plotPstmt.setInt(2, plotId);
                try (var rs = plotPstmt.executeQuery()) {
                    if (rs.next()) {
                        if (getUserPlots) {
                            try (var pstmt = conn.prepareStatement("SELECT * FROM select_user_plot_by_id(?,?,?)")) {
                                pstmt.setInt(1, projectId);
                                pstmt.setInt(2, plotId);
                                pstmt.setString(3, userName);
                                return queryPlot(pstmt, projectId, userId);
                            }
                        } else {
                            try (var pstmt = conn.prepareStatement("SELECT * FROM select_unassigned_plot_by_id(?,?)")) {
                                pstmt.setInt(1, projectId);
                                pstmt.setInt(2, plotId);
                                return queryPlot(pstmt, projectId, userId);
                            }
                        }
                    } else {
                        return "not found";
                    }
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public synchronized String getNextPlot(Request req, Response res) {
        final var getUserPlots =       Boolean.parseBoolean(req.queryParams("getUserPlots"));
        final var projectId =          Integer.parseInt(req.queryParams("projectId"));
        final var institutionId =      Integer.parseInt(req.queryParams("institutionId"));
        final var plotId =             Integer.parseInt(req.queryParams("plotId"));
        final var userId =             Integer.parseInt(req.queryParams("userId"));
        final var userName =           req.queryParams("userName");

        try (var conn = connect()) {
            if (getUserPlots) {
                var isAdmin = false;
                var query1 = conn.prepareStatement("SELECT administrator FROM users WHERE user_uid=? LIMIT 1");
                query1.setInt(1, userId);
                try(var result1 = query1.executeQuery()) {
                    if (result1.next()) {
                        if (result1.getBoolean("administrator")) {
                            isAdmin = true;
                        } else {
                            var query2 = conn.prepareStatement("SELECT * FROM get_institution_user_roles(?)");
                            query2.setInt(1, userId);
                            try (var result2 = query2.executeQuery()) {
                                while (result2.next()) {
                                    if (result2.getInt("institution_rid") == institutionId && result2.getString("role").equals("admin")) {
                                        isAdmin = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                if (isAdmin) {
                    try (var pstmt = conn.prepareStatement("SELECT * FROM select_next_user_plot_by_admin(?,?)")) {
                        pstmt.setInt(1, projectId);
                        pstmt.setInt(2, plotId);
                        return queryPlot(pstmt, projectId, userId);
                    }
                } else {
                    try (var pstmt = conn.prepareStatement("SELECT * FROM select_next_user_plot(?,?,?)")) {
                        pstmt.setInt(1, projectId);
                        pstmt.setInt(2, plotId);
                        pstmt.setString(3, userName);
                        return queryPlot(pstmt, projectId, userId);
                    }
                }
            } else {
                try (var pstmt = conn.prepareStatement("SELECT * FROM select_next_unassigned_plot(?,?)")) {
                    pstmt.setInt(1, projectId);
                    pstmt.setInt(2, plotId);
                    return queryPlot(pstmt, projectId, userId);
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public synchronized String getPrevPlot(Request req, Response res) {
        final var getUserPlots =       Boolean.parseBoolean(req.queryParams("getUserPlots"));
        final var projectId =          Integer.parseInt(req.queryParams("projectId"));
        final var institutionId =      Integer.parseInt(req.queryParams("institutionId"));
        final var plotId =             Integer.parseInt(req.queryParams("plotId"));
        final var userId =             Integer.parseInt(req.queryParams("userId"));
        final var userName =           req.queryParams("userName");

        try (var conn = connect()) {
            if (getUserPlots) {
                var isAdmin = false;
                var query1 = conn.prepareStatement("SELECT administrator FROM users WHERE user_uid=? LIMIT 1");
                query1.setInt(1, userId);
                try(var result1 = query1.executeQuery()) {
                    if (result1.next()) {
                        if (result1.getBoolean("administrator")) {
                            isAdmin = true;
                        } else {
                            var query2 = conn.prepareStatement("SELECT * FROM get_institution_user_roles(?)");
                            query2.setInt(1, userId);
                            try (var result2 = query2.executeQuery()) {
                                while (result2.next()) {
                                    if (result2.getInt("institution_rid") == institutionId && result2.getString("role").equals("admin")) {
                                        isAdmin = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                if (isAdmin) {
                    try (var pstmt = conn.prepareStatement("SELECT * FROM select_prev_user_plot_by_admin(?,?)")) {
                        pstmt.setInt(1, projectId);
                        pstmt.setInt(2, plotId);
                        return queryPlot(pstmt, projectId, userId);
                    }
                } else {
                    try (var pstmt = conn.prepareStatement("SELECT * FROM select_prev_user_plot(?,?,?)")) {
                        pstmt.setInt(1, projectId);
                        pstmt.setInt(2, plotId);
                        pstmt.setString(3, userName);
                        return queryPlot(pstmt, projectId, userId);
                    }
                }
            } else {
                try (var pstmt = conn.prepareStatement("SELECT * FROM select_prev_unassigned_plot(?,?)")) {
                    pstmt.setInt(1, projectId);
                    pstmt.setInt(2, plotId);
                    return queryPlot(pstmt, projectId, userId);
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String resetPlotLock(Request req, Response res) {
        final var jsonInputs =            parseJson(req.body()).getAsJsonObject();
        final var plotId =                jsonInputs.get("plotId").getAsInt();
        final var userId =                jsonInputs.get("userId").getAsInt();

        try (var conn = connect();
             var lockPstmt = conn.prepareStatement("SELECT * FROM lock_plot_reset(?,?,?)")) {

            lockPstmt.setInt(1, plotId);
            lockPstmt.setInt(2, userId);
            lockPstmt.setTimestamp(3, new Timestamp(System.currentTimeMillis() + (5 * 60 * 1000)));
            lockPstmt.execute();
            return "";
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String releasePlotLocks(Request req, Response res) {
        final var userId = Integer.parseInt(req.queryParams("userId"));
        return unlockPlots(userId);
    }

    private static String unlockPlots(Integer userId) {
        try (var conn = connect();
             var lockPstmt = conn.prepareStatement("SELECT * FROM unlock_plots(?)")) {
            lockPstmt.setInt(1, userId);
            lockPstmt.execute();
            return "";
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    private static String lockPlot(Integer plotId, Integer userId) {
        try (var conn = connect();
             var lockPstmt = conn.prepareStatement("SELECT * FROM lock_plot(?,?,?)")) {

            lockPstmt.setInt(1, plotId);
            lockPstmt.setInt(2, userId);
            lockPstmt.setTimestamp(3, new Timestamp(System.currentTimeMillis() + (5 * 60 * 1000)));
            lockPstmt.execute();
            return "";
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String addUserSamples(Request req, Response res) {
        final var jsonInputs =      parseJson(req.body()).getAsJsonObject();
        final var projectId =       jsonInputs.get("projectId").getAsString();
        final var plotId =          jsonInputs.get("plotId").getAsString();
        final var userId =          jsonInputs.get("userId").getAsInt();
        final var confidence =      jsonInputs.get("confidence").getAsInt();
        final var collectionStart = jsonInputs.get("collectionStart").getAsString();
        final var userSamples =     jsonInputs.get("userSamples").getAsJsonObject();
        final var userImages =      jsonInputs.get("userImages").getAsJsonObject();

        try (var conn = connect();
            final var usPstmt = conn.prepareStatement("SELECT * FROM check_user_plots(?,?,?)")) {
            usPstmt.setInt(1, Integer.parseInt(projectId));
            usPstmt.setInt(2, Integer.parseInt(plotId));
            usPstmt.setInt(3, userId);
            try (var usRs = usPstmt.executeQuery()) {
                unlockPlots(userId);
                // update existing
                if (usRs.next()) {
                    final var userPlotId = usRs.getInt("user_plot_id");
                    final var SQL = "SELECT * FROM update_user_samples(?,?,?,?,?::int,?::timestamp,?::jsonb,?::jsonb)";
                    final var pstmt = conn.prepareStatement(SQL) ;
                    pstmt.setInt(1,       userPlotId);
                    pstmt.setInt(2,       Integer.parseInt(projectId));
                    pstmt.setInt(3,       Integer.parseInt(plotId));
                    pstmt.setInt(4,       userId);
                    pstmt.setString(5,    confidence == -1 ? null : Integer.toString(confidence));
                    pstmt.setTimestamp(6, new Timestamp(Long.parseLong(collectionStart)));
                    pstmt.setString(7,    userSamples.toString());
                    pstmt.setString(8,    userImages.toString());
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
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String flagPlot(Request req, Response res) {
        var jsonInputs =        parseJson(req.body()).getAsJsonObject();
        var plotId =            jsonInputs.get("plotId").getAsString();
        var userId =            jsonInputs.get("userId").getAsInt();

        try (var conn = connect();
            var pstmt = conn.prepareStatement("SELECT * FROM flag_plot(?,?,?::int)")) {

            pstmt.setInt(1,Integer.parseInt(plotId));
            pstmt.setInt(2,userId);
            pstmt.setString(3,null); //confidence
            try (var rs = pstmt.executeQuery()) {
                var idReturn = 0;
                if (rs.next()) {
                    unlockPlots(userId);
                    idReturn = rs.getInt("flag_plot");
                }
                return Integer.toString(idReturn);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String unflagPlot(Request req, Response res) {
        var jsonInputs =        parseJson(req.body()).getAsJsonObject();
        var plotId =            jsonInputs.get("plotId").getAsString();
        var userId =            jsonInputs.get("userId").getAsInt();

        try (var conn = connect();
            var pstmt = conn.prepareStatement("SELECT * FROM unflag_plot(?,?)")) {

            pstmt.setInt(1,Integer.parseInt(plotId));
            pstmt.setInt(2,userId);
            pstmt.executeQuery();
            try (var rs = pstmt.executeQuery()) {
                var idReturn = 0;
                if (rs.next()) {
                    unlockPlots(userId);
                    idReturn = rs.getInt("unflag_plot");
                }
                return Integer.toString(idReturn);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }
}

package org.openforis.ceo.utils;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.stream.JsonWriter;

import java.io.IOException;
import java.io.StringWriter;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;

public class DatabaseUtils {

    // FIXME: Pull these from CeoConfig via web.xml or a JSON file read in Server.main()
    private static final String url = "jdbc:postgresql://localhost:5432/ceo";
    private static final String user = "ceo";
    private static final String password = "ceo";

    public static final Gson gson = new Gson();

    //Returns a connection to the database
    public static Connection connect() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

    public static String convertResultSetToJson(ResultSet rs) throws IOException {
        var result = new StringWriter();
        var writer = new JsonWriter(result);
        if (rs == null) {
            return null;
        }

        try {
            var metadata = rs.getMetaData();
            writer.beginArray();
            while (rs.next()) {
                writer.beginObject();
                for (int i = 1; i <= metadata.getColumnCount(); i++) {
                    writer.name(metadata.getColumnName(i));
                    Class<?> t = Class.forName(metadata.getColumnClassName(i));
                    gson.toJson(rs.getObject(i), t, writer);
                }
                writer.endObject();
            }
            writer.endArray();
            return result.toString();
        }
        catch (Exception e) {
            return null;
        }
    }
}

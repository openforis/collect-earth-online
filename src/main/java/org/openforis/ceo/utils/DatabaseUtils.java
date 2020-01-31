package org.openforis.ceo.utils;

import com.google.gson.Gson;
import com.google.gson.stream.JsonWriter;
import java.io.IOException;
import java.io.StringWriter;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;

public class DatabaseUtils {

    //Returns a connection to the database
    public static Connection connect() throws SQLException {
        // FIXME: Pull these from CeoConfig via web.xml or a JSON file read in Server.main()
        final var url      = "jdbc:postgresql://localhost:5432/ceo";
        final var user     = "ceo";
        final var password = "ceo";
        return DriverManager.getConnection(url, user, password);
    }

    // TODO: make a similar generic function to excute query
    public static String convertResultSetToJsonString(ResultSet rs) throws IOException {
        if (rs == null) {
            return "";
        } else {
            try {
                final var gson = new Gson();
                var result     = new StringWriter();
                var writer     = new JsonWriter(result);
                var metadata   = rs.getMetaData();
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
            } catch (Exception e) {
                return "";
            }
        }
    }
}

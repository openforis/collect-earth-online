package org.openforis.ceo.utils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseUtils {

    // FIXME: Pull these from CeoConfig via web.xml or a JSON file read in Server.main()
    private static final String url = "jdbc:postgresql://localhost:5432/ceo";
    private static final String user = "ceo";
    private static final String password = "ceo";

    //Returns a connection to the database
    public static Connection connect() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

}

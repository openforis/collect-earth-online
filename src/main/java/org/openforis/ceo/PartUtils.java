package org.openforis.ceo;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.stream.JsonReader;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.stream.Collectors;
import javax.servlet.http.Part;
import spark.Request;

public class PartUtils {

    public static String camelCase(String kebabString) {
        String camelString = Arrays.stream(kebabString.split("-"))
            .map(word -> word.substring(0,1).toUpperCase() + word.substring(1))
            .collect(Collectors.joining(""));
        return camelString.substring(0,1).toLowerCase() + camelString.substring(1);
    }

    public static String partToString(Part part) {
        if (part == null) {
            return null;
        } else {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(part.getInputStream()))) {
                return reader.lines().collect(Collectors.joining("\n"));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }

    public static JsonElement partToJson(Part part) {
        if (part == null) {
            return null;
        } else {
            try (JsonReader reader = new JsonReader(new InputStreamReader(part.getInputStream()))) {
                return (new JsonParser()).parse(reader);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }

    public static JsonObject partsToJsonObject(Request req, String[] fields) {
        JsonObject obj = new JsonObject();
        Arrays.stream(fields)
            .forEach(field -> {
                    try {
                        obj.add(camelCase(field), partToJson(req.raw().getPart(field)));
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }});
        return obj;
    }

    public static String writeFilePart(Request req, String partName, String outputFilePrefix) {
        try {
            // Extract the part from the request
            Part part = req.raw().getPart(partName);

            String inputFileName = part.getSubmittedFileName();
            if (inputFileName == null) {
                return null;
            } else {
                // Append the uploaded file extension to outputFilePrefix
                String inputFileType = inputFileName.substring(inputFileName.lastIndexOf(".") + 1);
                String outputFileName = outputFilePrefix + "." + inputFileType;

                // Write the file to the current multipart config directory and return the filename
                part.write(outputFileName);
                return outputFileName;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // public static String[][] parseCSV(String filePath) {
    //     return new String[][]{};
    // }

}

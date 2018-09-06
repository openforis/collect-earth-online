package org.openforis.ceo.utils;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.stream.JsonReader;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.stream.Collectors;
import javax.servlet.http.Part;
import spark.Request;

import static org.openforis.ceo.utils.JsonUtils.parseJson;

public class PartUtils {

    public static String camelCase(String kebabString) {
        var camelString = Arrays.stream(kebabString.split("-"))
            .map(word -> word.substring(0,1).toUpperCase() + word.substring(1))
            .collect(Collectors.joining(""));
        return camelString.substring(0,1).toLowerCase() + camelString.substring(1);
    }

    public static String partToString(Part part) {
        if (part == null) {
            return null;
        } else {
            try (var reader = new BufferedReader(new InputStreamReader(part.getInputStream()))) {
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
            try (var reader = new JsonReader(new InputStreamReader(part.getInputStream()))) {
                return (new JsonParser()).parse(reader);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }

    public static JsonObject partsToJsonObject(Request req, String[] fields) {
        var obj = new JsonObject();
        Arrays.stream(fields)
            .forEach(field -> {
                    try {
                        obj.add(camelCase(field), partToJson(req.raw().getPart(field)));
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }});
        return obj;
    }

    public static String writeFilePart(Request req, String partName, String outputDirectory, String outputFilePrefix) {
        try {
            // Extract the part from the request
            var part = req.raw().getPart(partName);

            var inputFileName = part.getSubmittedFileName();
            if (inputFileName == null) {
                return null;
            } else {
                // Append the uploaded file extension to outputFilePrefix
                var inputFileType = inputFileName.substring(inputFileName.lastIndexOf(".") + 1);
                var outputFileName = outputFilePrefix + "." + inputFileType;

                // Write the file to outputDirectory and return the filename
                try (var input = part.getInputStream()) {
                    Files.copy(input, (new File(outputDirectory, outputFileName)).toPath(), StandardCopyOption.REPLACE_EXISTING);
                }
                return outputFileName;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

}

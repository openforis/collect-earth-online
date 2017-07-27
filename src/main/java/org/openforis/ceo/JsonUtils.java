package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.Comparator;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collector;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

public class JsonUtils {

    public static String expandResourcePath(String filename) {
        return JsonUtils.class.getResource(filename).getFile();
    }

    public static JsonElement parseJson(String jsonString) {
        return (new JsonParser()).parse(jsonString);
    }

    public static JsonElement readJsonFile(String filename) {
        String jsonDataDir = expandResourcePath("/json/");
        try (FileReader fileReader = new FileReader(new File(jsonDataDir, filename))) {
            return (new JsonParser()).parse(fileReader);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static void writeJsonFile(String filename, JsonElement data) {
        String jsonDataDir = expandResourcePath("/json/");
        try (FileWriter fileWriter = new FileWriter(new File(jsonDataDir, filename))) {
            fileWriter.write(data.toString());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // Note: The JSON array may contain elements of any type.
    public static Stream<JsonElement> toElementStream(JsonArray array) {
        return StreamSupport.stream(array.spliterator(), false);
    }

    // Note: The JSON array must only contain JSON objects.
    public static Stream<JsonObject> toStream(JsonArray array) {
        return toElementStream(array).map(element -> element.getAsJsonObject());
    }

    public static Collector<JsonElement, ?, JsonArray> intoJsonArray =
        Collector.of(JsonArray::new, JsonArray::add,
                     (left, right) -> { left.addAll(right); return left; });

    public static JsonArray mapJsonArray(JsonArray array, Function<JsonObject, JsonObject> mapper) {
        return toStream(array)
            .map(mapper)
            .collect(intoJsonArray);
    }

    public static JsonArray filterJsonArray(JsonArray array, Predicate<JsonObject> predicate) {
        return toStream(array)
            .filter(predicate)
            .collect(intoJsonArray);
    }

    public static Optional<JsonObject> findInJsonArray(JsonArray array, Predicate<JsonObject> predicate) {
        return toStream(array)
            .filter(predicate)
            .findFirst();
    }

    public static void forEachInJsonArray(JsonArray array, Consumer<JsonObject> action) {
        toStream(array)
            .forEach(action);
    }

    // Note: All objects in the JSON array must contain "id" fields.
    public static int getNextId(JsonArray array) {
        return toStream(array)
            .map(object -> object.get("id").getAsInt())
            .max(Comparator.naturalOrder())
            .get() + 1;
    }

    // Note: The JSON file must contain an array of objects.
    public static void mapJsonFile(String filename, Function<JsonObject, JsonObject> mapper) {
        JsonArray array = readJsonFile(filename).getAsJsonArray();
        JsonArray updatedArray = mapJsonArray(array, mapper);
        writeJsonFile(filename, updatedArray);
    }

    // Note: The JSON file must contain an array of objects.
    public static void filterJsonFile(String filename, Predicate<JsonObject> predicate) {
        JsonArray array = readJsonFile(filename).getAsJsonArray();
        JsonArray updatedArray = filterJsonArray(array, predicate);
        writeJsonFile(filename, updatedArray);
    }

}

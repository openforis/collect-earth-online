package org.openforis.ceo;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collector;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class JsonUtils {

    public static String expandResourcePath(String filename) {
        try {
            URI uri = JsonUtils.class.getResource(filename).toURI();
            return Paths.get(uri).toFile().getAbsolutePath();
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
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

    public static JsonArray flatMapJsonArray(JsonArray array, Function<JsonObject, Stream<JsonObject>> mapper) {
        return toStream(array)
            .flatMap(mapper)
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

//    private static JsonElement walkJsonPath(JsonElement currentEl, String path, Stream<String> pathParts) {
//        Optional<String> maybePathPart = pathParts.findFirst();
//        if (maybePathPart.isPresent()) {
//            String pathPart = maybePathPart.get();
//            if (currentEl instanceof JsonObject) {
//                JsonObject currentObj = (JsonObject) currentEl;
//                Pattern arrayIndexPattern = Pattern.compile("(\\w+)\\[(\\d+)\\]");
//                Matcher arrayIndexMatcher = arrayIndexPattern.matcher(pathPart);
//                if (arrayIndexMatcher.matches()) {
//                    String arrayObjName = arrayIndexMatcher.group(1);
//                    String arrayIdxStr = arrayIndexMatcher.group(2);
//                    JsonArray array = currentObj.get(arrayObjName).getAsJsonArray();
//                    JsonElement nextEl = array.get(Integer.parseInt(arrayIdxStr));
//                    return walkJsonPath(nextEl, path, pathParts.skip(1));
//                } else {
//                    Pattern propertyNamePattern = Pattern.compile("\\w+");
//                    Matcher propertyNameMatcher = propertyNamePattern.matcher(pathPart);
//                    if (propertyNameMatcher.matches()) {
//                        String propertyName = propertyNameMatcher.group();
//                        JsonElement nextEl = currentObj.get(propertyName);
//                        return walkJsonPath(nextEl, path, pathParts.skip(1));
//                    } else {
//                        throw new IllegalArgumentException("Unexpected path part for a JSON object : " + pathPart);
//                    }
//                }
//            } else {
//                throw new IllegalArgumentException("Invalid path for JSON object : " + path);
//            }
//        } else {
//            return currentEl;
//        }
//    }
//
//    public static JsonElement findElement(JsonObject jsonObj, String path) {
//        return walkJsonPath(jsonObj, path, Arrays.stream(path.split("\\.")));
//    }
    
    public static JsonElement findElement(JsonObject jsonObj, String path) {
        String[] pathParts = path.split("\\.");
        JsonElement currentEl = jsonObj;
        for (String pathPart : pathParts) {
            if (currentEl instanceof JsonObject) {
                JsonObject currentObj = (JsonObject) currentEl;
                Pattern arrayIndexPattern = Pattern.compile("(\\w+)\\[(\\d+)\\]");
                Matcher arrayIndexMatcher = arrayIndexPattern.matcher(pathPart);
                if (arrayIndexMatcher.matches()) {
                    String arrayObjName = arrayIndexMatcher.group(1);
                    String arrayIdxStr = arrayIndexMatcher.group(2);
                    JsonArray array = currentObj.get(arrayObjName).getAsJsonArray();
                    currentEl = array.get(Integer.parseInt(arrayIdxStr));
                } else {
                    Pattern propertyNamePattern = Pattern.compile("\\w+");
                    Matcher propertyNameMatcher = propertyNamePattern.matcher(pathPart);
                    if (propertyNameMatcher.matches()) {
                        String propertyName = propertyNameMatcher.group();
                        currentEl = currentObj.get(propertyName);
                    } else {
                        throw new IllegalArgumentException("Unexpected path parth for a JSON object : " + pathPart);
                    }
                }
            } else if (currentEl instanceof JsonNull) {
            	return currentEl;
            } else {
                throw new IllegalArgumentException("Invalid path for JSON object : " + path);
            }
        }
        return currentEl;
    }
    
    @SuppressWarnings("unchecked")
	public static <T> T getMemberValue(JsonObject obj, String property, Class<T> type) {
    	JsonElement el = obj.get(property);
    	if (el.isJsonNull()) {
    		return (T) null;
    	} else if (type == String.class) {
    		return (T) el.getAsString();
    	} else if (type == Double.class) {
    		return (T) Double.valueOf(el.getAsDouble());
    	} else if (type == Integer.class) {
    		return (T) Integer.valueOf(el.getAsInt());
    	} else {
    		throw new IllegalArgumentException("Unsupported type: " + type);
    	}
    }

}

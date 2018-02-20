package org.openforis.ceo;

import static org.openforis.ceo.utils.JsonUtils.findElement;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

public class ServerTest extends TestCase {
    /**
     * Create the test case
     *
     * @param testName name of the test case
     */
    public ServerTest(String testName) {
        super(testName);
    }

    /**
     * @return the suite of tests being tested
     */
    public static Test suite() {
        return new TestSuite(ServerTest.class);
    }

    /**
     * Rigourous Test :-)
     */
    public void testServer() {
        assertTrue(true);
    }

    public void testFindElement() {
        JsonObject a = new JsonObject();
        JsonArray b = new JsonArray();
        JsonObject c = new JsonObject();
        a.add("array", b);
        b.add(c);
        c.addProperty("field", "storedValue");

        String storedValue = findElement(a, "array[0].field").getAsString();
        assert(storedValue.equals("storedValue"));
    }

}

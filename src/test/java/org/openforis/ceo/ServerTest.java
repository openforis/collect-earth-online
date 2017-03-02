package org.openforis.ceo;

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
}

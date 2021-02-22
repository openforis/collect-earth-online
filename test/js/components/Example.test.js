// Testing Components
import React from "react";
import {render, unmountComponentAtNode} from "react-dom";
import {act} from "react-dom/test-utils";
import {beforeEach, afterEach, expect, it} from "@jest/globals";

// An example component
function Hello(props) {
    if (props.name) {
        return <h1>Hello, {props.name}!</h1>;
    } else {
        return <span>Hey, stranger</span>;
    }
}

// Test fixture, setup/cleanup
let container = null;
beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
});

afterEach(() => {
    unmountComponentAtNode(container);
    container.remove();
    container = null;
});

// Attempt to follow the "Arrange/Act/Assert" pattern
it("renders with or without a name", () => {
    // Act
    act(() => {
        // Arrange
        render(<Hello />, container);
    });
    // Assert
    expect(container.textContent).toBe("Hey, stranger");

    // Act
    act(() => {
        // Arrange
        render(<Hello name="Jenny" />, container);
    });
    // Assert
    expect(container.textContent).toBe("Hello, Jenny!");

    act(() => {
        render(<Hello name="Margaret" />, container);
    });
    expect(container.textContent).toBe("Hello, Margaret!");
});


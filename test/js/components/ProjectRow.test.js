// Testing src/js/components/ProjectRow.js
import React from "react";
import {render, unmountComponentAtNode} from "react-dom";
import {act} from "react-dom/test-utils";
import ProjectRow from "../../../src/js/components/ProjectRow";
import {beforeEach, afterEach, expect, it} from "@jest/globals";


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

it("Renders project name", () => {
    act(() => {
        render(<ProjectRow />, container);
    });
    expect(container.querySelector("a").textContent).toBe("*un-named*");

    act(() => {
        render(<ProjectRow name="Watershed Mapping"/>, container);
    });
    expect(container.querySelector("a").textContent).toBe("Watershed Mapping");

    act(() => {
        render(<ProjectRow name="Treecover Mapping"/>, container);
    });
    expect(container.querySelector("a").textContent).toBe("Treecover Mapping");
});

it("Show/hide edit button", () => {
    act(() => {
        render(<ProjectRow editable={false}/>, container);
    });
    expect(container.querySelector("edit-button")).toBeNull();

    act(() => {
        render(<ProjectRow editable/>, container);
    });
    expect(container.querySelector("edit-button > a").textContent).toBe("EDIT");
});

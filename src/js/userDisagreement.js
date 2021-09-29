import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";

function UserDisagreement({visibleId, plotId}) {
    return (
        <div style={{display: "flex", flexDirection: "column", margin: "5rem"}}>
            <p>This page is under construction.</p>
            <p>Plot check: {plotId}</p>
            <p>Visible plot check: {visibleId}</p>
        </div>
    );
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar
            userId={args.userId}
            userName={args.userName}
            version={args.version}
        >
            <UserDisagreement
                plotId={args.plotId}
                visibleId={args.visibleId}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}

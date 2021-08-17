import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";

function NotFound() {
    return (
        <div className="container absolute-center">
            <section className="row justify-content-center" id="page-not-found">
                <div className="col-sm-6">
                    <h1 className="display-1 text-danger">&#x20E0;</h1>
                    <h2 className="text-danger">Page Not Found</h2>
                    <p className="error-message">
                        There&apos;s no page at the address you requested. If you entered
                        it by hand, check for typos. If you followed a link or a
                        bookmark, it may need to be updated.
                    </p>
                </div>
            </section>
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
            <NotFound/>
        </NavigationBar>,
        document.getElementById("app")
    );
}

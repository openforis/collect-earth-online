import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";

function NotFound() {
    return (
        <div className="container absolute-center">
            <section id="page-not-found" className="row justify-content-center">
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
        <NavigationBar userName={args.userName} userId={args.userId}>
            <NotFound/>
        </NavigationBar>,
        document.getElementById("app")
    );
}

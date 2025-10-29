import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";
import SvgIcon from "./components/svg/SvgIcon";

function NotFound() {
  return (
    <div className="container absolute-center">
      <section className="row justify-content-center" id="page-not-found">
        <div className="col-sm-6">
          <div
            className="text-danger"
            style={{
              alignItems: "center",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SvgIcon icon="alert" size="5rem" />
            <h2 className="text-danger">Page Not Found</h2>
          </div>
          <p className="error-message">
            There&apos;s no page at the address you requested. If you entered it by hand, check for
            typos. If you followed a link or a bookmark, it may need to be updated.
          </p>
        </div>
      </section>
    </div>
  );
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumb={{display: "Not Found",
                id:"not-found",
                onClick:()=>{}}}
      />
      <NotFound />
    </NavigationBar>,
    document.getElementById("app")
  );
}

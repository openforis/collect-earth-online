import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar, LogoBanner, BreadCrumbs } from "./components/PageComponents";

function About() {
  return (
    <section className="container pt-3" id="about">
      <div className="col-xl-8 offset-xl-2 col-lg-10 justify-content-center">
        <h1>About Collect Earth Online</h1>
        <p>
          Collect Earth Online is a custom built, open-source, satellite image viewing and
          interpretation system developed by SERVIR - a joint NASA and USAID program in partnership
          with regional technical organizations around the world - and the FAO as a tool for use in
          projects that require land cover and/or land use reference data. Collect Earth Online
          promotes consistency in locating, interpreting, and labeling reference data plots for use
          in classifying and monitoring land cover / land use change. The full functionality of
          Collect Earth Online, including collaborative compilation of reference point databases, is
          implemented online so there is no need for desktop installation. The Collect Earth Online
          codebase is shared through the Open Foris Initiative of the Food And Agriculture
          Organization of the United Nations.
        </p>
        <p>
          Please view our <a href="/terms-of-service">Terms of Service here.</a>
        </p>
        <p>
          Please access&nbsp;
          <a
            href="http://www.openforis.org/tools/sepal.html"
            rel="noreferrer noopener"
            target="_blank"
          >
            OpenForis-SEPAL
          </a>
          &nbsp;for more information about SEPAL.
        </p>
        <LogoBanner />
      </div>
    </section>
  );
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumbs={[
          {display: "About",
           id:"about"}]}
      />
      <About />
    </NavigationBar>,
    document.getElementById("app")
  );
}

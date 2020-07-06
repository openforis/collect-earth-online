import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar, LogoBanner } from "./components/PageComponents";

function About() {
    return (
        <section id="about" className="container">
            <div className="col-xl-8 offset-xl-2 col-lg-10 justify-content-center">
                <h1>About Collect Earth Online</h1>
                <p>
                    Collect Earth Online is a custom built, open-source,
                    satellite image viewing and interpretation system
                    developed by SERVIR - a joint NASA and USAID program
                    in partnership with regional technical organizations
                    around the world - and the FAO as a tool for use in projects
                    that require land cover and/or land use reference data.
                    Collect Earth Online promotes consistency in locating,
                    interpreting, and labeling reference data plots for use in
                    classifying and monitoring land cover / land use change.
                    The full functionality of Collect Earth Online, including
                    collaborative compilation of reference point databases, is
                    implemented online so there is no need for desktop
                    installation. The Collect Earth Online codebase is
                    shared through the Open Foris Initiative of the Food And
                    Agriculture Organization of the United Nations.
                </p>
                <h1>Disclaimers</h1>
                <p>
                    The SERVIR Network, NASA, and USAID make no express or
                    implied warranty of this application and associated data
                    as to the merchantability or fitness for a particular
                    purpose. Neither the US Government nor its contractors
                    shall be liable for special, consequential or incidental
                    damages attributed to this application and associated
                    data.
                </p>
                <p>
                    FAO declines all responsibility for errors or deficiencies
                    in the database or software or in the documentation
                    accompanying it, for program maintenance and upgrading as
                    well as for any damage that may arise from them.
                </p>
                <p className="mb-4">
                    FAO also declines any responsibility for updating the data
                    and assumes no responsibility for errors and omissions in
                    the data provided. Users are, however, kindly asked to
                    report any errors or deficiencies in this product.
                </p>
                <p>
                    Please access
                    <a
                        href="http://www.openforis.org/tools/sepal.html"
                        target="_blank"
                        rel="noreferrer noopener"
                    >
                        OpenForis-SEPAL
                    </a>
                    for more information about SEPAL.
                </p>
                <LogoBanner/>
            </div>
        </section>
    );
}


export function renderAboutPage(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <About/>
        </NavigationBar>,
        document.getElementById("about")
    );
}

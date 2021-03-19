import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";

function TermsOfService() {
    return (
        <section id="about" className="container pt-3">
            <div className="col-xl-8 offset-xl-2 col-lg-10 justify-content-center">
                <h1>Collect Earth Online Terms of Service</h1>

                <h2>Disclaimers</h2>
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

                <h2>Data Retention Policy</h2>
                <p>
                    Collect Earth Online makes no guarentee of retention of data.  Please ensure that you keep local copies of any information used to create a project and any results downloaded.
                </p>
                <p>
                    Specific clean up activities are described below:
                </p>
                <ul>
                    <li>Projects will be removed when the survey has not been collected in a certain amount of time.
                        <ul>
                            <li>The project has been inactive for 180 days, and the phase is not published, and the number of plots collected is under 5%</li>
                            <li>The project has been inactive for 270 days, and the number of plots collected is under 5%</li>
                            <li>The project has been inactive for 730 days, and the number of plots collected is under 20%</li>
                        </ul>
                    </li>
                    <li>Institutions will be removed when there contain no Projects
                        <ul>
                            <li>Institutions with no projects, and was created over 180 days ago</li>
                        </ul>
                    </li>
                </ul>
                <p>
                    Admin discretion can be used at any point for projects or institutions that are created with malformed or test data.
                </p>
            </div>
        </section>
    );
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <TermsOfService/>
        </NavigationBar>,
        document.getElementById("app")
    );
}

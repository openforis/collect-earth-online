import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";

function TermsOfService() {
  return (
    <section className="container pt-3" id="about">
      <div className="col-xl-8 offset-xl-2 col-lg-10 justify-content-center">
        <h1 className="py-4">Collect Earth Online Terms of Service</h1>

        <h2>Email policy</h2>
        <p>
          By creating an institution you become an &quot;admin&quot; user for that institution.
          Doing so will automatically subscribe you for the mailing list. This mailing list is run
          through a service called <a href="https://www.hubspot.com/">HubSpot</a>. You will be able
          to unsubscribe by clicking &quot;unsubscribe&quot; from within any email from CEO. In
          addition, any user that you make an admin of your institution will be added to the mailing
          list.
        </p>
        <p>
          The content of the emails from the mailing list will be limited to updates about features
          and release dates, with the very occasional feedback survey.
        </p>
        <p>Your email will not be shared with any third party organization.</p>

        <h2>Disclaimers</h2>
        <p>
          The SERVIR Network, NASA, and USAID make no express or implied warranty of this
          application and associated data as to the merchantability or fitness for a particular
          purpose. Neither the US Government nor its contractors shall be liable for special,
          consequential or incidental damages attributed to this application and associated data.
        </p>
        <p>
          FAO declines all responsibility for errors or deficiencies in the database or software or
          in the documentation accompanying it, for program maintenance and upgrading as well as for
          any damage that may arise from them.
        </p>
        <p className="mb-4">
          FAO also declines any responsibility for updating the data and assumes no responsibility
          for errors and omissions in the data provided. Users are, however, kindly asked to report
          any errors or deficiencies in this product.
        </p>

        <h2>Data Retention Policy</h2>
        <p>
          Collect Earth Online makes no guarantee of retention of data. Please ensure that you keep
          local copies of any information used to create a project and any results downloaded.
        </p>
        <p>Specific clean up activities are described below:</p>
        <ul>
          <li>
            Projects will be removed when the survey has not been collected in a certain amount of
            time.
            <ul>
              <li>
                The project has been inactive for 180 days, and the phase is not published, and the
                number of plots collected is under 5%
              </li>
              <li>
                The project has been inactive for 270 days, and the number of plots collected is
                under 5%
              </li>
              <li>
                The project has been inactive for 730 days, and the number of plots collected is
                under 20%
              </li>
            </ul>
          </li>
          <li>
            Institutions will be removed when there contain no Projects
            <ul>
              <li>Institutions with no projects, and was created over 180 days ago</li>
            </ul>
          </li>
        </ul>
        <p>
          Admin discretion can be used at any point for projects or institutions that are created
          with malformed or test data.
        </p>
      </div>
    </section>
  );
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumb={{display: "Terms of Service",
                id:"tos",
                onClick: (e)=>{console.log("terms of service");}}}
      />
      <TermsOfService />
    </NavigationBar>,
    document.getElementById("app")
  );
}

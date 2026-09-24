import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";

function TermsOfService() {
  return (
    <section className="container pt-3" id="about">
      <div className="col-xl-8 offset-xl-2 col-lg-10 justify-content-center" style={{marginTop: "30px"}}>
        <h1 className="py-4">Collect Earth Online Terms of Service</h1>

        {/**/}
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
        {/**/}
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

        <h2>The Institution (Project Owner) Elections</h2>
        <h3>Private – Restricted Use Data Designation</h3>
        <p>The Project administrator organization (“Institution”) designates this Project as a
          Private-Restricted Use Project. The Institution acknowledges and agrees that all data, content,
          materials, comments, classifications, imagery interpretations, metadata, or other contributions
          (“Contributions”) submitted, uploaded, contributed or otherwise provided to the Project,
          (a) will be treated as restricted-use and accessible only to the Institution and its authorized
          users; and (b) will not be accepted from any third party contributors (each, a “Contributor”)
          unless Contributors grant the Institution the restricted-use rights to their Contributions in
          accordance with this designation.</p>
        <h3>Public - Open Use Data Designation</h3>
        <p>The Project administrator organization (“Institution”) designates this Project as a Public-Open
          Use Data Project. The Institution acknowledges and agrees that all data, content, materials,
          comments, classifications, imagery interpretations, metadata, or other contributions
          (“Contributions”) submitted, uploaded, contributed or otherwise provided to the Project,
          (a) will be made publicly available and distributed under an open-data or open-content license
          designated by the Institution (e.g., Creative Commons Attribution 4.0 International (CC BY 4.0)
          license, or a substantially similar open license); (b) will not be accepted from any third party
          contributors (each a “Contributor”) unless such Contributor has expressly agreed that their
          submissions will be publicly accessible and may be reused, modified, distributed, and
          commercialized by third parties pursuant to the applicable open data or open-content licenses,
          and (c) once released under the open license, this designation cannot be reversed for such
          Contributions.</p>

        <h2>Contributor Licenses</h2>
        <h3>Contributor License –Private - Restricted Use Data Designation </h3>
        <p>By submitting, uploading, contributing, annotating, labeling, reviewing, or otherwise providing
          any data, content, materials, comments, classifications, imagery interpretations, metadata, or
          other contributions (“Contributions”) to the Project, you ("Contributor") hereby grant to the
          Project administrator organization (the “Institution”), its affiliates, successors, and assigns,
          a perpetual, irrevocable, worldwide, non-exclusive, transferable, sublicensable, royalty-free,
          fully paid-up license to use, host, store, reproduce, modify, adapt, publish, translate, create
          derivative works from, distribute, transmit, publicly display, publicly perform, commercialize,
          and otherwise exploit such Contributions, in whole or in part, in any manner and for any purpose
          whatsoever, whether commercial, non-commercial, research,  governmental, operational, or
          otherwise, in any media or format now known or later developed, without further notice, consent,
          attribution, or compensation.</p>
        <p>Contributor represents and warrants to the Institution that Contributor has all rights necessary to grant the foregoing license and that the
          Contributions do not infringe or violate the rights of any third party.</p>

        <h3>Contributor License  - Public - Open Use Data Designation</h3>
        <p>By submitting, uploading, contributing, annotating, labeling, reviewing, or otherwise providing
          any data, content, materials, comments, classifications, imagery interpretations, metadata, or
          other contributions (“Contributions”) to the Project, you (“Contributor”) hereby grant to the
          Project administrator organization (the “Institution”), its affiliates, successors, and assigns,
          a perpetual, irrevocable, worldwide, non-exclusive, transferable, sublicensable, royalty-free,
          fully paid-up license to use, host, store, reproduce, modify, adapt, publish, translate, create
          derivative works from, distribute, transmit, publicly display, publicly perform, commercialize,
          and otherwise exploit such Contributions, in whole or in part, in any manner and for any purpose
          whatsoever, whether commercial, non-commercial, research, governmental, operational, or
          otherwise, in any media or format now known or later developed, without further notice, consent,
          attribution, or compensation.</p>
        <p>Contributor acknowledges and agrees that Contributions will be made publicly available and
          distributed by the Institution under an open-data or open-content license, including without
          limitation the Creative Commons Attribution 4.0 International (CC BY 4.0) license, or a
          substantially similar open license, and that any member of the public may use the Contributions
          pursuant to such license terms. To the maximum extent permitted by applicable law, Contributor
          hereby irrevocably and unconditionally waives all rights, interests, and claims of any kind in
          and to the Contributions, including without limitation all copyright, moral rights (including
          rights of attribution, integrity, disclosure, and withdrawal), rights to collect royalties or
          other compensation, and all associated claims, demands, and causes of action, whether now known
          or hereafter arising, with respect to the Contributions. </p>
        <p>Contributor represents and warrants to the Institution that Contributor has all rights
          necessary to grant the foregoing licenses and waiver of rights and that the Contributions do not
          infringe or violate the rights of any third party.</p>
      </div>
    </section>
  );
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumbs={[
          {display: "Terms of Service",
           id:"tos",}]}
      />
      <TermsOfService />
    </NavigationBar>,
    document.getElementById("app")
  );
}

import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";

function DataLicense() {
  return (
    <section className="container pt-3" id="data-license">
      <div className="col-xl-8 offset-xl-2 col-lg-10 justify-content-center" style={{marginTop: "30px"}}>
        <h1 className="py-4">Collect Earth Online Data License Agreement</h1>

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
          {display: "Data License Agreement",
           id: "data-license"}]}
      />
      <DataLicense />
    </NavigationBar>,
    document.getElementById("app")
  );
}

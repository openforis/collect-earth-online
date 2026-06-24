import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import DataTable from "react-data-table-component";
import SvgIcon from "./components/svg/SvgIcon";
import Modal from "./components/Modal";

import { LoadingModal, NavigationBar, BreadCrumbs } from "./components/PageComponents";


const InstitutionDashboard = ({ institutionId }) => {
  const [projectList, setProjectList] = useState([]);
  const [modalMessage, setModalMessage] = useState(null);
  const [modal, setModal] = useState(null);
  const [filterText, setFilterText] = useState("");

  /// Lifecycle

  useEffect(() => {
    processModal(
      "Loading project list",
      getProjectList().catch((response) => {
        console.error(response);
        setModal({
          alert: {
            alertType: "Project Lst Retrieval Error",
            alertMessage: "Error retrieving the project list. See console for details.",
          },
        });
      })
    );
  }, []);

  /// API Calls

  const getProjectList = () =>
    fetch(`/get-institution-dash-projects?institutionId=${institutionId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => setProjectList(data));

  /// Helpers

  const processModal = (message, promise) => {
    setModalMessage(message);
    promise.finally(() => setModalMessage(null));
  };

  const columns = [
    {
      name: "Project Id",
      selector: (row) => row.id,
      sortable: true,
    },
    {
      name: "Project Name",
      selector: (row) => row.name,
      minWidth: "15rem",
      sortable: true,
    },
    {
      name: "Users Assigned",
      selector: (row) => row.stats.usersAssigned,
      center: true,
      sortable: true,
    },
    {
      name: "Contributors",
      selector: (row) => row.stats.contributors,
      center: true,
      sortable: true,
    },
    {
      name: "Total Plots",
      selector: (row) => row.stats.totalPlots,
      center: true,
      sortable: true,
    },
    {
      name: "Plot Assignments",
      selector: (row) => row.stats.plotAssignments,
      center: true,
      sortable: true,
    },
    {
      name: "Flagged Plots",
      selector: (row) => row.stats.flaggedPlots,
      center: true,
      sortable: true,
    },
    {
      name: "Analyzed Plots",
      selector: (row) => row.stats.analyzedPlots,
      center: true,
      sortable: true,
    },
    {
      name: "Partial Plots",
      selector: (row) => row.stats.partialPlots,
      center: true,
      sortable: true,
    },
    {
      name: "Unanalyzed Plots",
      selector: (row) => row.stats.unanalyzedPlots,
      center: true,
      sortable: true,
    },
  ];

  const filteredItems = useMemo(() => {
    return projectList.filter(
      (item) =>
        item.name &&
          item.name.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [filterText, projectList]);

  const subHeaderComponentMemo = useMemo(() => {
    const handleExport = () => {
      let csv = "Project Id,Project Name,Users Assigned,Contributors,Total Plots,Plot Assignments,Flagged Plots,Analyzed Plots,Partial Plots,Unanalyzed Plots\n";
      filteredItems.forEach((row) => {
        csv += `${row.id},"${row.name}",${row.stats.usersAssigned},${row.stats.contributors},${row.stats.totalPlots},${row.stats.plotAssignments},${row.stats.flaggedPlots},${row.stats.analyzedPlots},${row.stats.partialPlots},${row.stats.unanalyzedPlots}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "institution_projects_export.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    return (
      <div className="d-flex w-100 justify-content-start align-items-center">
        <input
          type="text"
          placeholder="Filter by Project Name"
          className="form-control"
          style={{ width: "250px", marginRight: "10px" }}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <button 
          className="btn bg-darkgreen text-white" 
          onClick={handleExport}
        >
          Export
        </button>
      </div>
    );
  }, [filterText, filteredItems]);

  return (
    <div className="row justify-content-center" id="institution-dashboard">
      {modalMessage && <LoadingModal message={modalMessage} />}
      {modal?.alert && (
        <Modal title={modal.alert.alertType} onClose={() => setModal(null)}>
          {modal.alert.alertMessage}
        </Modal>
      )}

      <div
        className="bg-darkgreen mb-3 no-container-margin"
        style={{ width: "100%", marginTop: "50px" }}
      >
        <h1>Institution Dashboard</h1>
      </div>
      {projectList.length > 0 ? (
        <div id="srd" style={{ width: "100%", margin: "10px", padding: "3%" }}>
          <DataTable
            columns={columns}
            data={filteredItems}
            subHeader
            subHeaderComponent={subHeaderComponentMemo}
          />
        </div>
      ) : (
        <div className="mx-4 d-flex">
          <SvgIcon icon="alert" size="1.2rem" />
          <p style={{ marginLeft: "0.4rem" }}>
            Your dashboard is empty. In order to view project data here, please
            create a new project.
          </p>
        </div>
      )}
    </div>
  );
};

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumbs={[
          {display:"Institution Dashboard",
           id: "inst-dash",}]}
      />
      <InstitutionDashboard institutionId={params.institutionId || "0"} />
    </NavigationBar>,
    document.getElementById("app")
  );
}

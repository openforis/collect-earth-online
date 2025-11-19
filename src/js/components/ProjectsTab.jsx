import React, { useMemo, useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import SvgIcon from "./svg/SvgIcon";
import { BulkActions } from "./BulkActions";

import '../../css/institution.css';

export const ProjectsTab = ({
  institutionId,
  projectList = [],
  isAdmin,
  deleteProjectsBulk,
  editProjectsBulk,
  downloadProjectsBulk,
}) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterText, setFilterText] = useState("");
  
  const filteredProjects = useMemo(() => {
    const lower = filterText.toLowerCase();
    return projectList.filter((p) => p.name?.toLowerCase().includes(lower));
  }, [projectList, filterText]);

  const columns = useMemo(
    () => [
      
      {
        name: "Visibility",
        selector: (row) => row.privacyLevel || "—",
        sortable: true,
        grow: 0.8,
      },
      {
        name: "Project Name",
        selector: (row) => row.name,
        sortable: true,
        cell: (row) => (
			<a
			className="projects-table-name"
			href={
			  isAdmin ?
			    `/review-project?projectId=${row.id}&institutionId=${institutionId}` 
			    : `/collection?projectId=${row.id}&institutionId=${institutionId}`}>
			{row.name}
			</a>
			),
      },
      {
        name: "Date Created",
        selector: (row) => row.createdDate,
        sortable: true,
        grow: 1.2,
        cell: (row) =>
          row.createdDate
            ? row.createdDate
            : "—",
      },
      {
        name: "Total Plots",
        selector: (row) => row.numPlots ?? 0,
        sortable: true,
        right: true,
      },
      {
        name: "Completion %",
        selector: (row) => row.percentComplete != null
          ? `${Number(row.percentComplete).toFixed(2)}`
          : "—",
        sortable: true,
        right: true,
      },
      {
        name: "Publication",
        selector: (row) => row.availability ?? "Unpublished",
        sortable: true,
      },
      
      {omit: !isAdmin,
       grow: .2,
       cell: (row)=> <div
                       className="btn-red"
                       style={{borderRadius:".5rem"}}
                       onClick={()=> {
				      window.open(`/review-project?projectId=${row.id}&institutionId=${institutionId}`);
				      }}
                     >
                       <SvgIcon icon="edit" size="2rem"/>
                     </div>
      },
      {cell: (row)=> <input
                       className="btn btn-outline-lightgreen btn-sm w-100"
                       onClick={() => window.open(`/collection?projectId=${row.id}&institutionId=${institutionId}`)
                               }
                       type="button"
                       value="Collect"
                     />}
    ],
    [isAdmin]
  );
  
  const customStyles = {
    headCells: {
      style: {
        backgroundColor: "#f0f2f1",
        fontWeight: 600,
        fontSize: "0.9rem",
      },
    },
    rows: {
      style: {
        minHeight: "48px",
        "&:hover": { backgroundColor: "#f7f9f8" },
      },
    },
  };

  const handleDelete = () => {
    if (selectedRows.length === 0) return;
    deleteProjectsBulk(selectedRows.map((r) => r.id));
  };

  const handleDownload = (selectedFiles) => {
    if (selectedRows.length === 0) return;
    downloadProjectsBulk(selectedRows.map((r) => r.id), selectedFiles);
  };

  const conditionalRowStyles = [
    { // Simplified: Blue
      when: row => row.type === "simplified",
      style: {
        borderLeft: '4px solid #9286D3',
      },
    },
    { // No Plots Collected: Red
      when: row => row.type !== "simplified" && row.percentComplete == 0,
      style: {
        borderLeft: '4px solid #D98EB2',
      },
    },
    { // Some Plots Collected: Yellow
      when: row => row.type !== "simplified" && (100 > row.percentComplete && row.percentComplete > 0),
      style: {
        borderLeft: '4px solid #FEBD5B',
      },
    },
    { // All Plots Collected: Green
      when: row => row.type !== "simplified" &&  row.percentComplete == 100,
      style: {
        borderLeft: '4px solid #84D0AC',
      },
    },  
  ];
  
  return (
    <div className="tab-container">
      <div className="tab-header">
        <h2 className="tab-title">
          Projects ({projectList.length})
        </h2>

        {isAdmin && (
          <button
            id="new-project-button"
            className="filled-button"
            onClick={() =>
              window.location.assign(`/create-project?institutionId=${institutionId}`)
            }
          >
            <SvgIcon icon="plus" size="1rem" />
            Add New Project
          </button>
        )}
      </div>

      <div className="tab-filter">
        <input
          type="text"
          placeholder="Search by name"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>
      
        <div className="projects-legend">
          {[
            ["No Plots collected", "#D98EB2"],
            ["Some Plots collected", "#FEBD5B"],
            ["All Plots collected", "#84D0AC"],
            ["Simplified", "#9286D3"]
          ].map(([title, color]) => (
            <div key={title} className="projects-legend-item">
              <span className="projects-legend-symbol" style={{ color }}>⯀</span>
              <span className="projects-legend-label">: {title}</span>
            </div>
          ))}
        </div>

      {isAdmin && (
        <BulkActions
          isAdmin={isAdmin}
          visibilityOptions={["public", "users", "institution", "private"]}
          showDownload={true}
          onChangeVisibility={editProjectsBulk}
          onDownload={handleDownload}
          onDelete={handleDelete}
          selectedRows={selectedRows}
        />
      )}

      <DataTable
        columns={columns}
        data={filteredProjects}
        selectableRows
        onSelectedRowsChange={({ selectedRows }) => setSelectedRows(selectedRows)}
        pagination
        paginationPerPage={100}
        paginationRowsPerPageOptions={[25, 50, 100, 250]}
        highlightOnHover
        conditionalRowStyles={conditionalRowStyles}
        customStyles={customStyles}
        noDataComponent="No projects found."
        sortIcon={<SvgIcon icon="downCaret" size="0.9rem" />}
      />
    </div>
  );
};

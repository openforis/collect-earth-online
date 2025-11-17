import React, { useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import SvgIcon from "./svg/SvgIcon";
import { BulkActions } from "./BulkActions";

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
            href={
              isAdmin ? `/collection?projectId=${row.id}&institutionId=${institutionId}`: `/review-project?projectId=${row.id}&institutionId=${institutionId}`}
            style={{
              color: "#2f615e",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
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
        name: "Project Type",
        selector: (row) => row.type ?? 'regular',
        sortable: true,
        center: true,
      },
      {
        name: "Publication",
        selector: (row) => row.availability ?? "Unpublished",
        sortable: true,
      },
      {cell: (row)=> <input
                    className="btn btn-outline-lightgreen btn-sm w-100"
                    onClick={() => window.open(`/collection?projectId=${row.id}&institutionId=${institutionId}`)
                            }
                    type="button"
                    value="Collect"
                  />}
    ],
    []
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

  const handleDownload = () => {
    if (selectedRows.length === 0) return;
    downloadProjectsBulk(selectedRows.map((r) => r.id), { csv: true });
  };

  return (
    <div
      style={{
        marginLeft: "18vw",
        padding: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2f615e" }}>
          Projects ({projectList.length})
        </h2>

        {isAdmin ?
         <button
           style={{
             background: "#2f615e",
             color: "white",
             border: "none",
             padding: "8px 16px",
             borderRadius: "4px",
             cursor: "pointer",
             display: "flex",
             alignItems: "center",
             gap: "6px",
           }}
           onClick={() => window.location.assign(`/create-project?institutionId=${institutionId}`)}
         >
           <SvgIcon icon="plus" size="1rem" />
           Add New Project
         </button>
         : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <input
          type="text"
          placeholder="Search by name"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>
      {isAdmin &&
       <BulkActions
         isAdmin={isAdmin}
         visibilityOptions={["public", "users", "institution", "private"]}
         showDownload={true}
         onChangeVisibility={editProjectsBulk}
         onDownload={handleDownload}
         onDelete={handleDelete}
         selectedRows={selectedRows}
       />
      }
      <DataTable
        columns={columns}
        data={filteredProjects}
        selectableRows
        onSelectedRowsChange={({ selectedRows }) => setSelectedRows(selectedRows)}
        pagination
        paginationPerPage={100}
        paginationRowsPerPageOptions={[25, 50, 100, 250]}
        highlightOnHover
        customStyles={customStyles}
        noDataComponent="No projects found."
        sortIcon={<SvgIcon icon="downCaret" size="0.9rem" />}
      />
    </div>
  );
};

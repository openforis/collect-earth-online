import React, { useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { BulkActions } from "./BulkActions";
import SvgIcon from "./svg/SvgIcon";

export const ImageryTab = ({
  imageryList = [],
  editImagery,
  deleteImagery,
  isAdmin,
}) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterText, setFilterText] = useState("");

  const filteredImagery = useMemo(() => {
    const lower = filterText.toLowerCase();
    return imageryList.filter((img) => img.title?.toLowerCase().includes(lower));
  }, [imageryList, filterText]);

  const columns = useMemo(
    () => [
      {
        name: "Visibility",
        selector: (row) => row.visibility || "—",
        sortable: true,
        grow: 0.8,
      },
      {
        name: "Title",
        selector: (row) => row.title,
        sortable: true,
        cell: (row) => (
          <span style={{ color: "#2f615e", fontWeight: 600 }}>{row.title}</span>
        ),
      },
      {
        name: "Created Date",
        selector: (row) => row.createdDate || row.createDate || "—",
        sortable: true,
        grow: 1.2,
      },
      ...(isAdmin
        ? [
            {
              name: "Actions",
              cell: (row) => (
                <button
                  style={{
                    border: "1px solid #3D7F7A",
                    color: "#3D7F7A",
                    background: "white",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                  onClick={() => console.log("Edit imagery", row.id || row.imagery_uid)}
                >
                  Edit
                </button>
              ),
              ignoreRowClick: true,
              allowOverflow: true,
              button: true,
            },
          ]
        : []),
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
    deleteImagery(selectedRows.map((r) => r.imagery_uid || r.id));
  };

  return (
    <div style={{ marginLeft: "18vw", padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2f615e" }}>
          Imagery ({imageryList.length})
        </h2>

        {isAdmin && (
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
            onClick={() => window.location.assign("/create-imagery")}
          >
            <SvgIcon icon="plus" size="1rem" />
            Add New Imagery
          </button>
        )}
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
          placeholder="Search imagery"
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

      {isAdmin && (
        <BulkActions
          isAdmin={isAdmin}
          visibilityOptions={["public", "private"]}
          showDownload={false}
          onChangeVisibility={editImagery}
          onDelete={handleDelete}
          selectedRows={selectedRows}
        />
      )}

      <DataTable
        columns={columns}
        data={filteredImagery}
        selectableRows
        onSelectedRowsChange={({ selectedRows }) => setSelectedRows(selectedRows)}
        pagination
        paginationPerPage={100}
        paginationRowsPerPageOptions={[25, 50, 100, 250]}
        highlightOnHover
        customStyles={customStyles}
        noDataComponent="No imagery found."
        sortIcon={<SvgIcon icon="downCaret" size="0.9rem" />}
      />
    </div>
  );
};

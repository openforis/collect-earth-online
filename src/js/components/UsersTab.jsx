import React, { useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { BulkActions } from "./BulkActions";
import SvgIcon from "./svg/SvgIcon";
import Modal from "./Modal";

import "../../css/institution.css";

export const UsersTab = ({
  usersList = [],
  editUsersBulk,
  addUsersBulk,
  isAdmin,
}) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [showAddUsers, setShowAddUsers] = useState(false);

  const filteredUsers = useMemo(() => {
    const lower = filterText.toLowerCase();
    return usersList.filter((u) => u.email?.toLowerCase().includes(lower));
  }, [usersList, filterText]);

  const columns = useMemo(
    () => [
      {
        name: "Email",
        selector: (row) => row.email,
        sortable: true,
        grow: 2,
        cell: (row) => (
          <span style={{ color: "#2f615e", fontWeight: 500 }}>{row.email}</span>
        ),
      },
      {
        name: "Role",
        selector: (row) => row.institutionRole || "—",
        sortable: true,
        grow: 1,
        cell: (row) => (
          <span style={{ textTransform: "capitalize" }}>
            {row.institutionRole}
          </span>
        ),
      },
      {
        name: "Actions",
        cell: (row) => (
          <button
            className="outlined-btn"
            onClick={() =>
              window.location.assign(`/account?accountId=${row.id}`)
            }
          >
            View User Stats
          </button>
        ),
        ignoreRowClick: true,
        allowOverflow: true,
        button: true,
      },
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

  const handleRemove = () => {
    if (selectedRows.length === 0) return;
    editUsersBulk(selectedRows.map((r) => r.id), "not-member");
  };

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h2 classname="tab-title">
          Users ({usersList.length})
        </h2>

        {isAdmin && (
          <button
            className="filled-button"
            onClick={() => setShowAddUsers(true)}
          >
            <SvgIcon icon="plus" size="1rem" />
            Add User
          </button>
        )}
      </div>

      <div className="tab-filter">
        <input
          type="text"
          placeholder="Search by email"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      {isAdmin && (
        <BulkActions
          isAdmin={isAdmin}
          showDownload={false}
          visibilityOptions={["admin", "member"]}
          onChangeVisibility={editUsersBulk}
          onDelete={handleRemove}
          selectedRows={selectedRows}
        />
      )}

      <DataTable
        columns={columns}
        data={filteredUsers}
        selectableRows
        onSelectedRowsChange={({ selectedRows }) => setSelectedRows(selectedRows)}
        pagination
        paginationPerPage={100}
        paginationRowsPerPageOptions={[25, 50, 100, 250]}
        highlightOnHover
        customStyles={customStyles}
        noDataComponent="No users found."
        sortIcon={<SvgIcon icon="downCaret" size="0.9rem" />}
      />
      {showAddUsers &&
       <AddUsersModal
         onClose={() => setShowAddUsers(false)}
         onAdd={(rows) => addUsersBulk(rows)}
       />
      }
    </div>
  );
};

export const AddUsersModal = ({ onClose, onAdd }) => {
  const [rows, setRows] = useState([
    { email: "", role: "admin" },
  ]);

  const addRow = () =>
    setRows((prev) => [...prev, { email: "", role: "admin" }]);

  const updateRow = (index, key, value) =>
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      )
    );

  const deleteRow = (index) =>
    setRows((prev) => prev.filter((_, i) => i !== index));

  const handleConfirm = () => {
    onAdd(rows);
    onClose();
  };

  return (
    <Modal
      title="Add Users"
      closeText="Cancel"
      confirmText="Add Users"
      onClose={onClose}
      onConfirm={handleConfirm}
    >
      <div className="add-users-container">

        {rows.map((row, i) => (
          <div key={i} className="add-users-row">
            <div>
              <label className="form-label">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter"
                value={row.email}
                onChange={(e) => updateRow(i, "email", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">
                Role <span className="required">*</span>
              </label>
              <select
                className="form-control"
                value={row.role}
                onChange={(e) => updateRow(i, "role", e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            </div>

            {rows.length > 1 && (
              <button
                className="remove-user-btn"
                onClick={() => deleteRow(i)}
              >
                <SvgIcon icon="trash" size="1rem" color="#C62828" />
              </button>
            )}
          </div>
        ))}

        <button className="add-user-btn" onClick={addRow}>
          <SvgIcon icon="plus" size="1rem" />
          Add User
        </button>
      </div>
    </Modal>

  );
};

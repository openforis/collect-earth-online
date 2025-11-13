import React, { useMemo, useState, useEffect } from "react";
import DataTable from "react-data-table-component";


import { BulkActions } from "./BulkActions";
import SvgIcon from "./svg/SvgIcon";
import { imageryOptions } from "../imagery/imageryOptions";
import Modal from "./Modal";

export const ImageryTab = ({
  imageryList = [],
  editImagery,
  deleteImagery,
  getImageryList,
  isAdmin,
  institutionId,
  tfoLayers = [],
}) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [showNewImagery, setShowNewImagery] = useState(false);
  const [imageryToEdit, setImageryToEdit] = useState({ id: -1 });

  const filteredImagery = useMemo(() => {
    const lower = filterText.toLowerCase();
    return imageryList.filter((img) => img.title?.toLowerCase().includes(lower));
  }, [imageryList, filterText]);

  const handleOpenNewImagery = (imagery = { id: -1 }) => {
    setImageryToEdit(imagery);
    setShowNewImagery(true);
  };

  const handleCloseNewImagery = () => {
    setImageryToEdit({ id: -1 });
    setShowNewImagery(false);
  };

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
                  onClick={() => handleOpenNewImagery(row)}
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
    <div style={{ marginLeft: "22vw", padding: "2rem" }}>
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
            onClick={() => handleOpenNewImagery()}
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

      {showNewImagery && (
        <NewImagery
          institutionId={institutionId}
          imageryToEdit={imageryToEdit}
          getImageryList={getImageryList}
          tfoLayers={tfoLayers}
          onClose={handleCloseNewImagery}
        />
      )}
    </div>
  );
};


export const NewImagery = ({
  institutionId,
  imageryToEdit,
  tfoLayers = [],
  getImageryList,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState(0);
  const [imageryTitle, setImageryTitle] = useState("");
  const [imageryAttribution, setImageryAttribution] = useState("");
  const [imageryParams, setImageryParams] = useState({});
  const [isProxied, setIsProxied] = useState(false);
  const [addToAllProjects, setAddToAllProjects] = useState(false);
  const [modal, setModal] = useState(null);

  const isNewImagery = imageryToEdit.id === -1;

  const getImageryParams = (type, params) => {
    if (type === "GeoServer") {
      const {
        geoserverUrl,
        geoserverParams: { LAYERS, ...cleanParams },
      } = params;
      return { geoserverUrl, LAYERS, geoserverParams: JSON.stringify(cleanParams) };
    } else if (type === "SecureWatch") {
      const {
        geoserverParams: { CONNECTID },
        startDate,
        endDate,
        baseUrl,
      } = params;
      return { connectid: CONNECTID, startDate, endDate, baseUrl };
    }
    return params;
  };

  const sanitizeParams = (typeIndex, params) => {
    const sanitized = { ...params };
    imageryOptions[typeIndex].params.forEach((p) => {
      if (p.sanitizer) sanitized[p.key] = p.sanitizer(sanitized[p.key]);
    });
    return sanitized;
  };

  const validateParams = (typeIndex, params) => {
    const paramErrors = imageryOptions[typeIndex].params.map(
      (p) =>
      (p.required !== false &&
       (!params[p.key] || params[p.key].length === 0) &&
       `${p.display} is required.`) ||
        (p.validator && p.validator(params[p.key]))
    );
    const imageryError =
          imageryOptions[typeIndex].validator && imageryOptions[typeIndex].validator(params);
    return [...paramErrors, imageryError].filter(Boolean);
  };

  const stackParams = (params) => {
    try {
      const imageryParams = imageryOptions[selectedType].params;
      return Object.keys(params)
        .sort((a) => (imageryParams.find((p) => p.key === a).parent ? 1 : -1))
        .reduce(
          (a, c) => {
            const parentStr = imageryParams.find((p) => p.key === c).parent;
            if (parentStr) {
              const parentObj = JSON.parse(a[parentStr] || "{}");
              return { ...a, [parentStr]: { ...parentObj, [c]: params[c] } };
            } else {
              return { ...a, [c]: params[c] };
            }
          },
          { type: imageryOptions[selectedType].type }
        );
    } catch {
      return {};
    }
  };

  const buildSecureWatch = (sourceConfig) => {
    if (sourceConfig.type === "SecureWatch") {
      sourceConfig.geoserverUrl = `${sourceConfig.baseUrl}/mapservice/wmsaccess`;
      sourceConfig.geoserverParams = {
        VERSION: "1.1.1",
        STYLES: "",
        LAYERS: "DigitalGlobe:Imagery",
        CONNECTID: sourceConfig.connectid,
      };
      delete sourceConfig.connectid;
    }
    return sourceConfig;
  };

  const getImageryAttribution = (type) =>
        type === "BingMaps"
        ? "Bing Maps API: Aerial | © Microsoft Corporation"
        : type.includes("Planet")
        ? "Planet Labs Global Mosaic | © Planet Labs, Inc"
        : type === "SecureWatch"
        ? "SecureWatch Imagery | © Maxar Technologies Inc."
        : ["Sentinel1", "Sentinel2", "DynamicWorld"].includes(type) || type.includes("GEE")
        ? "Google Earth Engine | © Google LLC"
        : type.includes("MapBox")
        ? "© Mapbox"
        : type === "OSM"
        ? "Open Street Map"
        : "";

  const imageryTypeChangeHandler = (val) => {
    const { type, params, defaultProxy } = imageryOptions[val];
    const defaultState = params.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.key]: cur.type === "select" ? cur.options[0].value : "",
      }),
      {}
    );
    setSelectedType(val);
    setImageryAttribution(getImageryAttribution(type));
    setIsProxied(defaultProxy);
    setImageryParams(defaultState);
  };

  const setImageryToEdit = () => {
    const { title, attribution, isProxied, sourceConfig } = imageryToEdit;
    const { type, ...params } = sourceConfig;
    const typeIndex = imageryOptions.findIndex((io) => io.type === type);
    setSelectedType(typeIndex);
    setImageryTitle(title);
    setImageryAttribution(attribution);
    setIsProxied(isProxied);
    setImageryParams(getImageryParams(type, params));
  };

  useEffect(() => {
    if (imageryToEdit.id !== -1) setImageryToEdit();
    else imageryTypeChangeHandler(0);
  }, []);

  const formInput = (title, type, value, callback, required = false) => (
    <div className="mb-3">
      <label className="form-label">
        {title} {required && <span style={{ color: "red" }}>*</span>}
      </label>
      <input
        autoFocus={title === "Title"}
        type={type}
        className="form-control"
        value={value || ""}
        onChange={(e) => callback(e.target.value)}
        placeholder="Enter"
      />
    </div>
  );

  const formTemplate = (o) => (
    <div key={o.key} className="mb-3">
      <label className="form-label">
        {o.display} {o.required !== false && <span style={{ color: "red" }}>*</span>}
      </label>
      {o.type === "textarea" || o.type === "JSON" ? (
        <textarea
          className="form-control"
          value={imageryParams[o.key] || ""}
          onChange={(e) => setImageryParams((prev) => ({ ...prev, [o.key]: e.target.value }))}
          placeholder="Enter"
        />
      ) : o.type === "select" ? (
        <select
          className="form-control"
          value={imageryParams[o.key] || ""}
          onChange={(e) => setImageryParams((prev) => ({ ...prev, [o.key]: e.target.value }))}
        >
          {o.options.map((el) => (
            <option key={el.value} value={el.value}>
              {el.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={o.type || "text"}
          className="form-control"
          value={imageryParams[o.key] || ""}
          onChange={(e) => setImageryParams((prev) => ({ ...prev, [o.key]: e.target.value }))}
          placeholder="Enter"
        />
      )}
    </div>
  );

  const uploadCustomImagery = (isNew) => {
    const sanitized = sanitizeParams(selectedType, imageryParams);
    const messages = validateParams(selectedType, sanitized);

    if (messages.length > 0) {
      setModal({
        alert: { alertType: "Imagery Upload", alertMessage: messages.join(", ") },
      });
      return;
    }

    const sourceConfig = buildSecureWatch(stackParams(sanitized));
    if (imageryTitle.length === 0 || (imageryAttribution.length === 0 && selectedType !== "14")) {
      setModal({
        alert: {
          alertType: "Imagery Upload Error",
          alertMessage: "You must include a title and attribution.",
        },
      });
      return;
    }

    fetch(isNew ? "/add-institution-imagery" : "/update-institution-imagery", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institutionId,
        imageryId: imageryToEdit.id,
        imageryTitle,
        imageryAttribution,
        isProxied,
        addToAllProjects,
        sourceConfig,
      }),
    }).then((response) => {
      if (response.ok) {
        getImageryList();
        onClose();
      } else {
        console.error(response);
        setModal({
          alert: {
            alertType: "Imagery Upload Error",
            alertMessage: "Error uploading imagery data. See console for details.",
          },
        });
      }
    });
  };

  const { type, params, optionalProxy } = imageryOptions[selectedType];
  const displayParams =
        type === "PlanetTFO"
        ? [
          params[0],
          {
            ...params[1],
            options: [
              ...params[1].options,
              ...tfoLayers.map((l) => ({
                label: l.slice(34, l.length - 7),
                value: l,
              })),
            ],
          },
          params[2],
        ]
        : params;

  return (
    <Modal
      title={isNewImagery ? "Add New Imagery" : "Edit Imagery"}
      closeText="Cancel"
      confirmText={isNewImagery ? "Add Imagery" : "Save Changes"}
      onClose={onClose}
      onConfirm={() => uploadCustomImagery(isNewImagery)}
    >
      <div className="p-2">
        <div className="mb-3">
          <label className="form-label">
            Select Type <span style={{ color: "red" }}>*</span>
          </label>
          <select
            className="form-control"
            disabled={!isNewImagery}
            onChange={(e) => imageryTypeChangeHandler(parseInt(e.target.value))}
            value={selectedType}
          >
            {imageryOptions.map((o, i) => (
              <option key={i} value={i}>
                {o.label || o.type}
              </option>
            ))}
          </select>
        </div>

        {formInput("Title", "text", imageryTitle, setImageryTitle, true)}

        {["GeoServer", "xyz"].includes(type) &&
         formInput("Attribution", "text", imageryAttribution, setImageryAttribution, true)}

        {displayParams.map((o) => formTemplate(o))}

        {optionalProxy && (
          <div className="form-check mb-3">
            <input
              type="checkbox"
              className="form-check-input"
              id="proxy"
              checked={isProxied}
              onChange={() => setIsProxied(!isProxied)}
            />
            <label htmlFor="proxy" className="form-check-label">
              Proxy Imagery
            </label>
          </div>
        )}

        <div className="form-check mb-3">
          <input
            type="checkbox"
            className="form-check-input"
            id="addToAll"
            checked={addToAllProjects}
            onChange={() => setAddToAllProjects(!addToAllProjects)}
          />
          <label htmlFor="addToAll" className="form-check-label">
            Add Imagery to All Projects When Saving
          </label>
        </div>
      </div>
    </Modal>
  );
};

import React, { useState, useEffect, useRef } from "react";

export const BulkActions = ({
  isAdmin = false,
  showDownload = false,
  onChangeVisibility,
  onDownload,
  onDelete,
  visibilityOptions = [],
  selectedRows = [],
}) => {
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState(null);
  const [selectedDownloads, setSelectedDownloads] = useState({
    plot: false,
    sample: false,
    shapefile: false,
  });

  const visibilityRef = useRef(null);
  const downloadRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (visibilityRef.current && !visibilityRef.current.contains(e.target)) {
        setShowVisibilityMenu(false);
      }
      if (downloadRef.current && !downloadRef.current.contains(e.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const greenBorderButton = {
    border: "1px solid #3D7F7A",
    background: "#fff",
    color: "#3D7F7A",
    fontWeight: 500,
    padding: "6px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background 0.2s ease, color 0.2s ease",
  };

  const redBorderButton = {
    border: "1px solid #C62828",
    background: "#fff",
    color: "#C62828",
    fontWeight: 500,
    padding: "6px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background 0.2s ease, color 0.2s ease",
  };

  const filledGreenButton = {
    background: "#3D7F7A",
    color: "#fff",
    border: "1px solid #3D7F7A",
    fontWeight: 500,
    padding: "6px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  };

  const grayButton = {
    border: "1px solid #c4c7c5",
    background: "#fff",
    color: "#1a1a1a",
    fontWeight: 500,
    padding: "6px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        margin: "1rem 0",
        position: "relative",
      }}
    >
      <div style={{ position: "relative" }} ref={visibilityRef}>
        <button
          style={{
            ...greenBorderButton,
            ...(showVisibilityMenu && { background: "#f2f5f4" }),
          }}
          onClick={() => setShowVisibilityMenu((v) => !v)}
        >
          Change Visibility ▾
        </button>

        {showVisibilityMenu && (
          <div
            style={{
              position: "absolute",
              top: "110%",
              left: 0,
              background: "#fff",
              border: "1px solid #dcdedc",
              borderRadius: "8px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              padding: "0.75rem 1rem",
              zIndex: 10,
              width: "220px",
            }}
          >
            {(visibilityOptions.length > 0
              ? visibilityOptions
              : ["Private", "Public", "Platform"]
            ).map((option) => (
              <div
                key={option}
                style={{ display: "flex", alignItems: "center", marginBottom: "0.4rem" }}
              >
                <input
                  type="radio"
                  id={option}
                  name="visibility"
                  checked={selectedVisibility === option}
                  onChange={() => setSelectedVisibility(option)}
                />
                <label htmlFor={option} style={{ marginLeft: "0.5rem" }}>
                  {option ? option.charAt(0).toUpperCase() + option.slice(1) : ""}
                </label>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                marginTop: "0.75rem",
              }}
            >
              <button style={grayButton} onClick={() => setShowVisibilityMenu(false)}>
                Cancel
              </button>
              <button
                style={filledGreenButton}
                onClick={() => {
                  onChangeVisibility(selectedRows.map((r) => r.id), selectedVisibility);
                  setShowVisibilityMenu(false);
                }}
              >
                Change
              </button>
            </div>
          </div>
        )}
      </div>
      {showDownload && (
        <div style={{ position: "relative" }} ref={downloadRef}>
          <button
            style={{
              ...greenBorderButton,
              ...(showDownloadMenu && { background: "#f2f5f4" }),
            }}
            onClick={() => setShowDownloadMenu((v) => !v)}
          >
            Download ▾
          </button>

          {showDownloadMenu && (
            <div
              style={{
                position: "absolute",
                top: "110%",
                left: 0,
                background: "#fff",
                border: "1px solid #dcdedc",
                borderRadius: "8px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                padding: "0.75rem 1rem",
                zIndex: 10,
                width: "250px",
              }}
            >
              {[
                { key: "plot", label: "Plot Data: .CSV" },
                { key: "sample", label: "Sample Data: .CSV" },
                { key: "shapefile", label: "Shapefile: .SHP" },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  style={{ display: "flex", alignItems: "center", marginBottom: "0.4rem" }}
                >
                  <input
                    type="checkbox"
                    id={key}
                    checked={selectedDownloads[key]}
                    onChange={() =>
                      setSelectedDownloads((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                  />
                  <label htmlFor={key} style={{ marginLeft: "0.5rem" }}>
                    {label}
                  </label>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  marginTop: "0.75rem",
                }}
              >
                <button style={grayButton} onClick={() => setShowDownloadMenu(false)}>
                  Cancel
                </button>
                <button
                  style={filledGreenButton}
                  onClick={() => {
                    onDownload(selectedDownloads);
                    setShowDownloadMenu(false);
                  }}
                >
                  Download
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <button style={redBorderButton} onClick={onDelete}>
        Delete
      </button>
    </div>
  );
};

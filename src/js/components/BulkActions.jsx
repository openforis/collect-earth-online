import React, { useState, useEffect, useRef } from "react";


export const BulkActions = ({
  isAdmin = false,
  showDownload = false,
  buttonText = "Change Visibility",
  onChangeVisibility,
  onDownload,
  onDelete,
  visibilityOptions = [],
  selectedRows = [],
  description,
}) => {
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState(null);
  const [selectedDownloads, setSelectedDownloads] = useState([]);

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

  return (
    <div className="bulk-actions">
      <div className="bulk-actions-group" ref={visibilityRef}>
        <button
          className={`btn-outlined-green bulk-actions-trigger ${
            showVisibilityMenu ? "active" : ""
          }`}
          onClick={() => setShowVisibilityMenu((v) => !v)}
        >
          {buttonText} ▾
        </button>

        {showVisibilityMenu && (
          <div className="bulk-actions-dropdown">
            {description && (
              <div style={{ fontStyle: "italic", fontSize: "13px", lineHeight: "1.4", marginBottom: "12px", color: "#555" }}>
                {description}
              </div>
            )}
            {(visibilityOptions.length > 0
              ? visibilityOptions
              : [
                { value: "Private", label: "Private" },
                { value: "Public", label: "Public" },
                { value: "Platform", label: "Platform" },
              ]
            ).map((option) => {
              const val = option.value !== undefined ? option.value : option;
              const lbl =
                option.label !== undefined
                  ? option.label
                  : typeof option === "string"
                    ? option.charAt(0).toUpperCase() + option.slice(1)
                    : "";

              return (
                <div key={val} className="bulk-actions-row">
                  <input
                    type="radio"
                    id={val}
                    name="visibility"
                    checked={selectedVisibility === val}
                    onChange={() => setSelectedVisibility(val)}
                  />
                  <label htmlFor={val} className="bulk-actions-label">
                    {lbl}
                  </label>
                </div>
              );
            })}

            <div className="bulk-actions-footer">
              <button
                className="btn-filled-green"
                onClick={() => {
                  onChangeVisibility(
                    selectedRows.map((r) => r.id),
                    selectedVisibility
                  );
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
        <div className="bulk-actions-group" ref={downloadRef}>
          <button
            className={`btn-outlined-green bulk-actions-trigger ${
              showDownloadMenu ? "active" : ""
            }`}
            onClick={() => setShowDownloadMenu((v) => !v)}
          >
            Download ▾
          </button>

          {showDownloadMenu && (
            <div className="bulk-actions-dropdown wide">
              {[
                { key: "plots", label: "Plot Data: .CSV" },
                { key: "samples", label: "Sample Data: .CSV" },
                { key: "shape", label: "Shapefile: .SHP" },
              ].map(({ key, label }) => (
                <div key={key} className="bulk-actions-row">
                  <input
                    type="checkbox"
                    id={key}
                    checked={selectedDownloads.includes(key)}
                    onChange={() =>
                      setSelectedDownloads((prev) =>
                        prev.includes(key)
                          ? prev.filter((k) => k !== key)
                          : [...prev, key]
                      )
                    }
                  />
                  <label htmlFor={key} className="bulk-actions-label">
                    {label}
                  </label>
                </div>
              ))}

              <div className="bulk-actions-footer">
                <button
                  className="btn-outlined-gray"
                  onClick={() => setShowDownloadMenu(false)}
                >
                  Cancel
                </button>

                <button
                  className="btn-filled-green"
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

      <button className="btn-outlined-red" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
};

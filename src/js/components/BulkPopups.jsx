import React, { useState } from "react";
import Modal from "./Modal";

export function ProjectVisibilityPopup({ selectedProjects, editProjectsBulk }) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState("");

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const handleVisibilityChange = (event) => {
    setSelectedVisibility(event.target.value);
  };

  const handleSave = () => {
    editProjectsBulk(selectedProjects, selectedVisibility);
    togglePopup();
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="button-dropdown"
        onClick={togglePopup}
        style={{ display: "flex", alignItems: "center", height: "38px" }}
      >
        Change Project Visibility
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="16"
          width="16"
          fill="#65B7B0"
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </button>

      {isPopupOpen && (
        <div className="popup-container">
          <div className="popup-option">
            <input
              type="radio"
              id="public"
              name="visibility"
              value="public"
              onChange={handleVisibilityChange}
            />
            <label htmlFor="public">Public: <i>All Users</i></label>
          </div>
          <div className="popup-option">
            <input
              type="radio"
              id="users"
              name="visibility"
              value="users"
              onChange={handleVisibilityChange}
            />
            <label htmlFor="users">Users: <i>Logged In Users</i></label>
          </div>
          <div className="popup-option">
            <input
              type="radio"
              id="institution"
              name="visibility"
              value="institution"
              onChange={handleVisibilityChange}
            />
            <label htmlFor="institution">Institution: <i>Group Members</i></label>
          </div>
          <div className="popup-option">
            <input
              type="radio"
              id="private"
              name="visibility"
              value="private"
              onChange={handleVisibilityChange}
            />
            <label htmlFor="private">Private: <i>Group Admins</i></label>
          </div>

          <button className="popup-button" onClick={handleSave}>
            Change
          </button>
        </div>
      )}
    </div>
  );
}

export function DownloadPopup({ downloadProjectsBulk, selectedProjects }) {
  const [state, setState] = useState({modal: null});
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({
    "plots": false,
    "samples": false,
    "shape": false,
  });

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setSelectedOptions((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleDownload = () => {
    if (selectedProjects.length === 0) {
      setState ({modal: {alert: {alertType: "Project Download Alert", alertMessage: "Please select at least one project to download."}}});
      return;
    }
    setState ({modal: {alert: {alertType: "Project Download", alertMessage: `Downloading: ${selectedItems.join(", ")}`}}});
    downloadProjectsBulk(selectedProjects, selectedOptions);
    setIsPopupOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      {state.modal?.alert &&
         <Modal title={state.modal.alert.alertType}
                onClose={()=>{setState({modal: null});}}>
           {state.modal.alert.alertMessage}
         </Modal>}
      <button
        className="button-dropdown"
        onClick={togglePopup}
        style={{ display: "flex", alignItems: "center", height: "38px" }}
      >
        Bulk Download Options
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="16"
          width="16"
          fill="#65B7B0"
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </button>

      {isPopupOpen && (
        <div className="popup-container">
          <div className="popup-option">
            <input
              type="checkbox"
              id="plots"
              name="plots"
              onChange={handleCheckboxChange}
              checked={selectedOptions.plotData}
            />
            <label htmlFor="plots">Plot Data: <i>.CSV</i></label>
          </div>
          <div className="popup-option">
            <input
              type="checkbox"
              id="samples"
              name="samples"
              onChange={handleCheckboxChange}
              checked={selectedOptions.sampleData}
            />
            <label htmlFor="samples">Sample Data: <i>.CSV</i></label>
          </div>
          <div className="popup-option">
            <input
              type="checkbox"
              id="shape"
              name="shape"
              onChange={handleCheckboxChange}
              checked={selectedOptions.shapeFile}
            />
            <label htmlFor="shape">Shape File: <i>.SHP</i></label>
          </div>
          <button className="popup-button" onClick={handleDownload}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="16"
              width="16"
              fill="white"
              viewBox="0 0 24 24"
            >
              <path d="M12 16l4-4H8z" />
            </svg>
            Download
          </button>
        </div>
      )}
    </div>
  );
}

export function ImageryVisibilityPopup({ selectedImagery, editImageryBulk }) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState("");

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const handleVisibilityChange = (event) => {
    setSelectedVisibility(event.target.value);
  };

  const handleSave = () => {
    editImageryBulk(selectedImagery, selectedVisibility);
    togglePopup();
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="button-dropdown"
        onClick={togglePopup}
        style={{ display: "flex", alignItems: "center", height: "38px" }}
      >
        Change Imagery Visibility
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="16"
          width="16"
          fill="#65B7B0"
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </button>

      {isPopupOpen && (
        <div className="popup-container">
          <div className="popup-header">
            **Public imagery will be available for any project in CEO to use them, and private imagery will only be available to projects from this institution.
          </div>
          <div className="popup-option">
            <input
              type="radio"
              id="public"
              name="visibility"
              value="public"
              onChange={handleVisibilityChange}
            />
            <label htmlFor="public">Public</label>
          </div>
          <div className="popup-option">
            <input
              type="radio"
              id="private"
              name="visibility"
              value="private"
              onChange={handleVisibilityChange}
            />
            <label htmlFor="private">Private</label>
          </div>

          <button className="popup-button" onClick={handleSave}>
            Change
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";

function ProjectVisibilityPopup() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState("");

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const handleVisibilityChange = (event) => {
    setSelectedVisibility(event.target.value);
  };

  const handleSave = () => {
    alert(`Visibility changed to: ${selectedVisibility}`);
    setIsPopupOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="button-dropdown"
        onClick={togglePopup}
        style={{ display: "flex", alignItems: "center" }}
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
          <div className="popup-header">
            **Public imagery will be visible to all users, and institution imagery will only be
            available to the users in this institution.
          </div>

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

export default ProjectVisibilityPopup;

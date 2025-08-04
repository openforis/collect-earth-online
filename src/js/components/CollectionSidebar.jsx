import React from 'react';
import '../../css/sidebar.css';

export const CollectionSidebar = ({ children }) => {
  return (
    <div className="collection-sidebar-container">
      <div className="sidebar-content">
        {children}
      </div>
      <div className="sidebar-footer">
        <SidebarFooter/>
      </div>
    </div>
  );
};

export const NewPlotNavigation = ({projectTitle}) => {
  return (
    <div className="sidebar-navigation">
      <div className="sidebar-header">
        <span className="sidebar-title">{projectTitle}</span>
        <button className="sidebar-info-button">i</button>
      </div>

      <label className="sidebar-label">Navigate</label>
      <select className="sidebar-select">
        <option>Default</option>
        <option>Analyzed plots</option>
        <option>Unanalyzed plots</option>
        <option>Flagged plots</option>
      </select>

      <div className="sidebar-mode">
        <label className="sidebar-switch">
          <input type="checkbox" />
          <span className="sidebar-slider round"></span>
        </label>
        <span className="mode-label">Admin Review</span>
      </div>
    </div>
  );
};

export const SidebarFooter = () => {
  return (
    <div className="sidebar-footer-buttons">
      <button className="btn outline">Clear All</button>
      <button className="btn outline">Flag Plot</button>
      <button className="btn filled">Quit</button>
      <button className="btn filled">Save & Continue</button>
    </div>
  );
};

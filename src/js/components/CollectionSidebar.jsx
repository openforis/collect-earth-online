import React from 'react';
import '../../css/sidebar.css';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export const CollectionSidebar = ({ children }) => {
  return (
    <div className="collection-sidebar-container">
      <div className="collection-sidebar-content">
        {children}
      </div>
      <div className="collection-sidebar-footer">
        <SidebarFooter/>
      </div>
    </div>
  );
};

export const NewPlotNavigation = ({project}) => {
  return (
    <div className="collection-sidebar-navigation">
      <div className="collection-sidebar-header">
        <span>
          <span className="collection-sidebar-title">{project.name}</span>
          <span className="collection-sidebar-subtitle"> ({project.numPlots} Plots)</span>
        </span>
        <button className="collection-sidebar-info-button">i</button>
      </div>
      <div className="collection-sidebar-plot-navigation">
        <input className="flex flex-col-6"></input>
        <button className="btn outline"><FaChevronLeft /></button>
        <button className="btn outline"><FaChevronRight/></button>        
        <label className="btn filled"
               onClick={()=>{console.log("going to plot");}}
        >Go To Plot
        </label>
      </div>

    </div>
  );
};

export const NewPlotNavigationMode = ({projectTitle}) => {  
  return (
    <div className="collection-sidebar-navigation">
      <div className="collection-sidebar-header">
        <span className="collection-sidebar-title">{projectTitle}</span>        
        <button className="collection-sidebar-info-button">i</button>
      </div>

      <label className="collection-sidebar-label">Navigate</label>
      <select className="collection-sidebar-select">
        <option>Default</option>
        <option>Analyzed plots</option>
        <option>Unanalyzed plots</option>
        <option>Flagged plots</option>
      </select>

      <div className="collection-sidebar-mode">
        <label className="collection-sidebar-switch">
          <input type="checkbox" />
          <span className="collection-sidebar-slider round"></span>
        </label>
        <span className="mode-label">Admin Review</span>
      </div>      
    </div>
  );
};

export const SidebarFooter = () => {
  return (
    <div className="collection-sidebar-footer-buttons">
      <button className="btn outline">Clear All</button>
      <button className="btn outline">Flag Plot</button>
      <button className="btn filled">Quit</button>
      <button className="btn filled">Save & Continue</button>
    </div>
  );
};

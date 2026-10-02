import React, { useEffect, useState } from "react";
import { atom, useAtom } from 'jotai';
import SvgIcon from "../components/svg/SvgIcon";
import { stateAtom } from '../utils/constants';
import MapPanel from '../mapPanel';
import { zoomMapToPoint } from '../utils/newMercator';
import { Sidebar, SidebarCard } from "../components/Sidebar";
import "../../css/highlights.css";

export default function Collect ({projects}) {
  const mapConfigAtom = atom(null);
  const [appState, setAppState] = useAtom(stateAtom);
  
  function CollectionSidebar (){
    const [mapConfig, setMapConfig] = useAtom(mapConfigAtom);

    function Tag ({tag}) {
      return (
        <div className="tag"
             onClick={()=>{console.log('search for tags by tag-id:', tag);}}>
          <span>{tag}</span>
        </div>
      );
    }

    function Project ({project}) {
      const [seeMore, toggleDescription] = useState(false);
      const expandStyle= seeMore ? {} : {maxHeight: "3rem", overflow: 'hidden'};
      return (
        <div className="project">
          <div className="project-info">
            <span className="project-title">{project.name}</span>
            <div className="project-attribution"
                 onClick={() => {window.location.href = `/review-institution?institutionId=${project.institutionId}`;}}>
              <SvgIcon icon="institution" size="1.2rem"/>
              <span>{project.institutionName}</span>
            </div>
            {project.tags?.length &&
            <div className="tags">
              {project.tags?.map((tag)=>{
                return(
                  <Tag tag={tag}/>);})}
            </div>}
            <div className="project-description">
              <p style={expandStyle}>{project.description}</p>
              {project.description.length > 168 &&
               <div className="expand-description"
                    onClick={()=>{toggleDescription(!seeMore);}}
               ><span>{seeMore ? "Hide Description" : "See More"}</span></div>
              }
            </div>
          </div>         
          <div className="project-controls">
            <div className="ghost-button">
              <div
                onClick={()=>{
                  zoomMapToPoint(mapConfig.map, JSON.parse(project.centroid).coordinates, 9, 500);
                }}
              >
                <SvgIcon icon="zoomIn" size="1rem"/>
                <span>Zoom to Project on Map</span>
              </div>
            </div>
            <div className="primary-button"
                 onClick={() => {window.location.href =
                                 `/collection?projectId=${project.id}&institutionId=${project.institutionId}`;}}>
              <div>
                <span>Visit Project</span>
                <SvgIcon icon="chevronRight" size="1.2rem"/>
              </div>
            </div>
          </div>          
        </div>
      );
    }


    
    return (
      <Sidebar header={null} stateAtom={stateAtom} footer={null} style={{ left: 0, width: "30vw", position: "fixed"}}>

        <div id="collect-projects">
          <div className="collect-header">
            <div className="header-row">
              <span className="header-title">COLLECT</span>
              <span className="header-subtitle">Your projects to collect or review</span>
            </div>
          </div>            
          {projects.map((project)=>{return(<Project project={project}/>);})}
        </div>

      </Sidebar>
    );
  }
  
  return (
    <div id='collect-tab' className='home-tab'>
      <CollectionSidebar />
      <div id="collect-map-container">
        <MapPanel
          mapConfigAtom={mapConfigAtom}
          imagery={appState.imagery}
          projects={projects}/>
      </div>
    </div>);
}

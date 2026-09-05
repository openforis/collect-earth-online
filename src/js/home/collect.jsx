import React, { useEffect, useState } from "react";
import { atom, useAtom } from 'jotai';
import SvgIcon from "../components/svg/SvgIcon";
import { stateAtom } from '../utils/constants';
import MapPanel from '../mapPanel';
import "../../css/highlights.css";

export default function Collect ({projects}) {
  const mapConfigAtom = atom(null);
  const [appState, setAppState] = useAtom(stateAtom);
  
  function Projects (){
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
      return (
        <div className="project">
          <div className="project-info">
            <span className="project-title">{project.name}</span>
            <div className="project-attribution"
                 onClick={() => {window.location.href = `/review-institution?institutionId=${project.institutionId}`;}}>
              <SvgIcon icon="institution" size="1.2rem"/>
              <span>{project.institutionName}</span>
            </div>
            <div className="tags">
              {project.tags?.map((tag)=>{
                return(
                  <Tag tag={tag}/>);})}
            </div>
            <div className="project-description">
              <span>{project.description}</span>
              <div className="expand-description"
                   onClick={()=>{console.log('expand project description', project.description);}}
              ><span>See More</span></div>
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
                 onClick={() => {window.location.href = `/review-project?projectId=${project.id}&institutionId=${project.institutionId}`;}}>
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
      <div id="projects">
        <div id="projects-column">
          {projects.map((project)=>{return(<Project project={project}/>);})}
        </div>
        <div id="projects-map-container">
          <div id="projects-map">
            <MapPanel
              mapConfigAtom={mapConfigAtom}
              imagery={appState.imagery}
              projects={projects}/>
          </div></div>
      </div>
    );
  }
  
  return (
    <div id='collect-tab' className='home-tab'>
      <div className="header">
        <div className="header-row">
          <p className="header-title">Collect</p>
          <p className="header-subtitle"></p>
        </div>
        <Projects />
      </div>
    </div>);
}

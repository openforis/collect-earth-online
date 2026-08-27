import React, { useEffect, useState } from "react";
import { atom, useAtom } from 'jotai';
import SvgIcon from "../components/svg/SvgIcon";
import { zoomMapToPoint } from '../utils/newMercator';
import { stateAtom } from '../utils/constants';
import MapPanel from '../mapPanel';
import "../../css/highlights.css";


export default function Highlights ({userId, userRole}) {
  const [appState, setAppState] = useAtom(stateAtom);  
  const mapConfigAtom = atom(null);
  
  function getProjects () {
    fetch("/get-home-projects")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          setAppState(prev => ({ ... prev,  projects: data }));
          return Promise.resolve();
        } else {
          return Promise.reject("No projects found");
        }
      });}

  function getImagery () {
    fetch("/get-public-imagery")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {          
          setAppState(prev => ({ ... prev, imagery: data }));          
          return Promise.resolve();
        } else {
          return Promise.reject("No imagery found");
        }
      });}
  
  function getInstitutions () {
    fetch("/get-all-institutions")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          const userInstitutions =
                userRole !== "admin"
                ? data.filter((institution) => institution.isMember)
                : [];
          const institutions =
                userInstitutions.length > 0
                ? data.filter((institution) => !userInstitutions.includes(institution))
                : data;
          setAppState(prev => ({ ...prev,
                                 institutions,
                                 userInstitutions,
                               }));
          return Promise.resolve();
        } else {
          return Promise.reject("No institutions found");
        }
      });
  }
  
  useEffect(()=>{
    Promise.all([getImagery(), getInstitutions(), getProjects()])
      .catch((response) => {
        setAppState (prev => ({ ... prev, modal: {alert: {alertType: "Collection Alert", alertMessage: "Error retrieving the collection data. See console for details."}}}));
      })
      .finally(() => setAppState(prev => ({... prev, modalMessage: null })));
  }, []);

  function Tag ({tag}) {
    const {title, id} = tag;
    return (
      <div className="tag"
           onClick={()=>{console.log('search for tags by tag-id:', id);}}>
        <span>{title}</span>
      </div>
    );

  }

  function Blogs () {
    const blogs = [
      {date: "March 2026",
       blogId: 1,
       tags: [{title:"Land Cover", id: 1}, {title:"Land Cover", id: 1}],
       title: "Collect Earth Online in 2025: Platform Updates, Partnerships, and Impact",
       subtitle: "2025 was a year of meaningful progress for Collect Earth Online, shaped by platform updates, partnerships, and impact.",
       link: "/",
       graphic: ""},
      {date: "March 2026",
       blogId: 2,
       tags: [{title:"Land Cover", id: 1}, {title:"Land Cover", id: 1}],
       title: "Collect Earth Online in 2025: Platform Updates, Partnerships, and Impact",
       subtitle: "2025 was a year of meaningful progress for Collect Earth Online, shaped by platform updates, partnerships, and impact.",
       link: "/",
       graphic: ""},
      {date: "March 2026",
       blogId: 3,
       tags: [{title:"Land Cover", id: 1}, {title:"Land Cover", id: 1}],
       title: "Collect Earth Online in 2025: Platform Updates, Partnerships, and Impact",
       subtitle: "2025 was a year of meaningful progress for Collect Earth Online, shaped by platform updates, partnerships, and impact.",
       link: "/",
       graphic: ""},
    ];
    return (
      <div id="blogs">
        {blogs.map((blog)=>{
          return (
            <div className="blog-frame">
              <div className="blog">
                <div className="blog-graphic"
                     style={{background: `url(${blog.graphic}) lightgray 50% / cover no-repeat`}}></div>
                <div className="blog-body">
                  <div className="blog-date">
                    <SvgIcon icon='calendar' size='1rem'/>
                    <span>{blog.date}</span>
                  </div>
                  <div className="blog-title-row">
                    <div className="blog-title"
                         onClick={()=> {console.log('see blog post: ', blog.blogId);}}>
                      <span>{blog.title}</span>
                      <SvgIcon icon="chevronRight" size="1.2rem" color="#1F7067"/>
                    </div>
                  </div>
                  <div className="blog-subtitle">{blog.subtitle}</div>
                  <div className="tags">
                    {blog.tags.map((tag)=> {
                      return (
                        <Tag tag={tag}/>);
                    })}
                  </div>
                </div>
              </div>
            </div>);
        })}
      </div>);
  };

  function Projects () {
    const [mapConfig, setMapConfig] = useAtom(mapConfigAtom);
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
          {appState.projects.map((project)=>{return(<Project project={project}/>);})}
        </div>
        <div id="projects-map-container">
          <div id="projects-map">
            <MapPanel
              mapConfigAtom={mapConfigAtom}
              imagery={appState.imagery}
              projects={appState.projects}/>
          </div></div>
      </div>
    );
  };
  
  const highlights = {
    blogs: {
      title: "Featured Blogs",
      subtitle: "Read the latest stories, updates, and insights from the Collect Earth community.",
      children: <Blogs/>,
      link: "/"},
    projects: {
      title: "Featured Projects",
      subtitle: "Browse active projects from institutions around the world.",
      children: <Projects/>,
      link: "/"}
  };
  
  return (
    <div id="highlights-tab" className="home-tab">
      <div className="header">
        <div className="header-row">
          <span className="header-title">Highlights</span>
          <span className="header-subtitle">Explore the latest blogs and selected projects from the Collect Earth Online community.</span>
        </div>
      </div>
      <div className="highlights-body">
        <div className="highlights">
          {Object.entries(highlights).map(([id, highlight])=>{
            return (
              <div className="highlight">
                <div className="highlight-header">
                  <div className="highlight-title">
                    <span>{highlight.title}</span>
                    <div className="highlight-link"
                         onClick={()=>{console.log('view all highlights of type: ', highlight.title);}}>
                      <span>View All</span>
                      <SvgIcon icon="chevronRight" size="1.2rem"/>
                    </div>
                  </div>
                  <div className="highlight-subtitle">{highlight.subtitle}</div>
                </div>
                {highlight.children}                
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

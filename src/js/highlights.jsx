import React, { useEffect, useState } from "react";
import SvgIcon from "./components/svg/SvgIcon";
import { useAtom } from'jotai';
import { stateAtom } from './utils/constants';
import "../css/highlights.css";


export default function Highlights ({userId, userRole}) {
  const [appState, setAppState] = useAtom(stateAtom);  
  
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

  function Blogs () {
    const blogs = [
      {date: "March 2026",
       tags: ["Land Cover", "Land Cover"],
       title: "Collect Earth Online in 2025: Platform Updates, Partnerships, and Impact",
       subtitle: "2025 was a year of meaningful progress for Collect Earth Online, shaped by platform updates, partnerships, and impact.",
       link: "",
       graphic: ""},
      {date: "March 2026",
       tags: ["Land Cover", "Land Cover"],
       title: "Collect Earth Online in 2025: Platform Updates, Partnerships, and Impact",
       subtitle: "2025 was a year of meaningful progress for Collect Earth Online, shaped by platform updates, partnerships, and impact.",
       link: "",
       graphic: ""},
      {date: "March 2026",
       tags: ["Land Cover", "Land Cover"],
       title: "Collect Earth Online in 2025: Platform Updates, Partnerships, and Impact",
       subtitle: "2025 was a year of meaningful progress for Collect Earth Online, shaped by platform updates, partnerships, and impact.",
       link: "/",
       graphic: ""}
    ];
    return (
      <div id="blogs">
        {blogs.map((blog)=>{
          return (
            <div className="blog">
              <div>
                <div className="blog-graphic"
                     style={{background: `url(${blog.graphic}) lightgray 50% / cover no-repeat`}}></div>
                <div className="blog-body">
                  <div className="blog-date">{blog.date}</div>
                  <div className="blog-title-row">
                    <div className="blog-title">
                      <span>{blog.title}</span>
                      <SvgIcon icon="rightCaret" size="1.2rem"
                               onClick={()=> {window.location.assign(blog.link);}}
                      />
                    </div>
                  </div>
                  <div className="blog-subtitle">{blog.subtitle}</div>
                  <div className="blog-tags">
                    {blog.tags.map((tag)=> {
                      return (
                        <div classsName="blog-tag">
                          <span>{tag}</span>
                        </div>);
                    })}
                  </div>
                </div>
              </div>
            </div>);
        })}
      </div>);
  };

  function Projects () {
    const projects = [
      {title: "",
       institution: "",
       tags: ["Land Cover", "Asia", "Remote Sensing"],
       description: "This project focuses on monitoring land cover and ecological change across the Mekong River region. Contributors analyze satellite imagery to identify vegetation patterns, water boundaries, and signs of environmental impact. The data collected supports regional conservation planning and long-term environmental monitoring efforts.",
      link: "/"}
    ];

    return (
      <div id="projects">
        <div id="projects-column">
          {projects.map((project)=>{
            return(
              <div className="project">
                <div className="project-info">
                  <div className="project-title">{project.title}</div>
                  <div className="project-institution">
                    <SvgIcon icon="alert" size="1.2rem"/>
                    <label>
                      {project.institution}
                    </label>
                  </div>
                  <div className="project-tags">
                    {project.tags.map((tag)=>{
                      return(
                        <div className="project-tag">
                          <label>{tag}</label>
                        </div>);})}
                  </div>
                  <div className="project-description">
                    <div>{project.description}</div>
                    <p
                      onClick={()=>{window.location.assign(project.link);}}
                    >See More</p>
                  </div>
                </div>
                <div className="project-controls">
                  <div className="ghost-button">
                    <div>
                      <SvgIcon icon="search" size="1.2rem"/>
                      <label>Zoom to Project on Map</label>
                    </div>
                  </div>
                  <div className="primary-button">
                    <label>Visit Project</label>
                    <SvgIcon icon="rightCaret" size="1.2rem"
                             onClick={()=> {window.location.assign(project.link);}}/>
                  </div>
                </div>
              </div>);
          })}
        </div>
        <div id="projects-map"></div>
      </div>
    );
  };
  
  const highlights = {
    blogs: {title: "Featured Blogs",
            subtitle: "Read the latest stories, updates, and insights from the Collect Earth community.",
            children: <Blogs/>,
            link: "/"},
    projects: {title: "Featured Projects",
               subtitle: "Browse active projects from institutions around the world.",
               children: <Projects/>,
               link: "/"}
  };
  
  return (
    <div id="highlights-tab" className="home-tab">
      <div className="header">
        <div className="header-row">
          <p className="header-title">Highlights</p>
          <p className="header-subtitle">Explore the latest blogs and selected projects from the Collect Earth Online community.</p>
        </div>
      </div>
      <div className="highlights-body">
        <div className="highlights">
          {Object.entries(highlights).map(([id, highlight])=>{
            return (
              <div className="highlight">
                <div className="highlight-title-row">
                  <div>
                    <div className="highlight-title">{highlight.title}</div>
                    <div>
                      <div className="highlight-link">
                        <SvgIcon icon="rightCaret" size="1.2rem"
                                 onClick={()=>{window.location.assign(highlight.link);}}/>
                      </div>
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

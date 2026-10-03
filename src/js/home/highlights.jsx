import React, { useEffect, useState } from "react";
import { atom, useAtom, useAtomValue } from 'jotai';
import SvgIcon from "../components/svg/SvgIcon";
import { zoomMapToPoint } from '../utils/newMercator';
import { stateAtom } from '../utils/constants';
import MapPanel from '../mapPanel';
import "../../css/highlights.css";


function Tag ({tag}) {
  return (
    <div className="tag"
      onClick={()=>{console.log('search for tags by tag-id:', tag);}}>
      <span>{tag}</span>
    </div>
  );
}

function blogDate (date) {
  const newDate = new Date(date);
  return newDate.toDateString();
}

function Blogs ({blogs}) {
  return blogs.length > 0  ? (
    <div id="blogs">
      {blogs.map((blog)=>{
        return (
          <div className="blog-frame" key={blog.link}>
            <div className="blog">
              <div className="blog-graphic"
                style={{background: `url(${blog.img}) lightgray 50% / cover no-repeat`
                }}
              ></div>
              <div className="blog-body">
                <div className="blog-date">
                  <SvgIcon icon='calendar' size='1rem'/>
                  <span>{blogDate(blog.pubDate)}</span>
                </div>
                <div className="blog-title-row">
                  <div className="blog-title"
                    onClick={()=> {window.open(blog.link, "_blank", "noopener,noreferrer");}}>
                    <span>{blog.title}</span>
                    <SvgIcon icon="chevronRight" size="1.2rem" color="#1F7067"/>
                  </div>
                </div>
                <div className="blog-subtitle">{blog.description}</div>
                {blog.category?.length > 0 &&
                  <div className="tags">
                    {blog.category.map((tag)=> {
                      return (
                        <Tag key={tag} tag={tag}/>);
                    })}
                  </div>}
              </div>
            </div>
          </div>);
      })}
    </div>)
    : (<div></div>);
}

function ProjectCard ({project, mapConfig}) {
  const [seeMore, toggleDescription] = useState(false);
  const expandStyle = seeMore ? {} : {height: "3rem", overflow:"hidden"};
  const description = project.description || "";
  return (
    <div className="project">
      <div className="project-info">
        <span className="project-title">{project.name}</span>
        <div className="project-attribution"
          onClick={() => {window.location.href = `/review-institution?institutionId=${project.institutionId}`;}}>
          <SvgIcon icon="institution" size="1.2rem"/>
          <span>{project.institutionName}</span>
        </div>
        {project.tags?.length > 0 &&
          <div className="tags">
            {project.tags.map((tag)=>{
              return(
                <Tag key={tag} tag={tag}/>);})}
          </div>}
        <div className="project-description">
          <p style={expandStyle}
          >{description}</p>
          {description.length > 168 &&
            <div className="expand-description"
              onClick={()=>{toggleDescription(!seeMore);}}
            ><span>{seeMore ? "Hide Description" : "See More"}</span></div>}
        </div>
      </div>
      <div className="project-controls">
        <div className="ghost-button">
          <div
            onClick={()=>{
              zoomMapToPoint(mapConfig?.map, JSON.parse(project.centroid).coordinates, 9, 500);
            }}
          >
            <SvgIcon icon="zoomIn" size="1rem"/>
            <span>Zoom to Project on Map</span>
          </div>
        </div>
        <div className="primary-button"
          onClick={() => {
            console.log("visit project!");
            window.location.href =
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

function Projects ({projects, imagery}) {
  // One atom per mount, so the map is created once and survives re-renders.
  const [mapConfigAtom] = useState(() => atom(null));
  const mapConfig = useAtomValue(mapConfigAtom);
  return (
    <div id="projects">
      <div id="projects-column">
        {projects.map((project)=>{return(<ProjectCard key={project.id} project={project} mapConfig={mapConfig}/>);})}
      </div>
      <div id="projects-map-container">
        <div id="projects-map">
          <MapPanel
            mapConfigAtom={mapConfigAtom}
            imagery={imagery}
            projects={projects}/>
        </div></div>
    </div>
  );
}

export default function Highlights ({userId, userRole}) {
  const [appState, setAppState] = useAtom(stateAtom);

  function getBlogs () {
    const blogUrl = "http://collect.earth/feed";
    const blogLimit = 7;
    fetch(`/get-blog-feed?url=${blogUrl}&limit=${blogLimit}`)
      .then((response)=> (response.ok? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          setAppState(prev => ({ ... prev,  blogs: data }));
          return Promise.resolve();
        } else {
          return Promise.reject("No Blogs found");
        }
      });
  }
  
  function getProjects () {
    fetch("/get-highlight-projects")
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
    Promise.all([getImagery(), getInstitutions(), getProjects(), getBlogs()])
      .catch((response) => {
        setAppState (prev => ({ ... prev, modal: {alert: {alertType: "Collection Alert", alertMessage: "Error retrieving the collection data. See console for details."}}}));
      })
      .finally(() => setAppState(prev => ({... prev, modalMessage: null })));
  }, []);

  const highlights = {
    blogs: {
      title: "Featured Blogs",
      subtitle: "Read the latest stories, updates, and insights from the Collect Earth Online community.",
      children: <Blogs blogs={appState.blogs}/>,
      link: "http://collect.earth/blog"},
    projects: {
      title: "Featured Projects",
      subtitle: "Browse active projects from institutions around the world.",
      children: <Projects projects={appState.projects} imagery={appState.imagery}/>,
      //  link: "/home?tab=collect"
    }
  };
  
  return (
    <div id="highlights-tab" className="home-tab">
      <div className="header">
        <div className="header-row">
          <span className="header-title">HIGHLIGHTS</span>
          <span className="header-subtitle">Explore the latest blogs and selected projects from the Collect Earth Online community.</span>
        </div>
      </div>
      <div className="highlights-body">
        <div className="highlights">
          {Object.entries(highlights).map(([id, highlight])=>{
            return (
              <div className="highlight" key={id}>
                <div className="highlight-header">
                  <div className="highlight-title">
                    <span>{highlight.title}</span>
                    {highlight.link &&
                      <div className="highlight-link"
                        onClick={()=>{window.open(highlight.link);}}>
                        <span>View All</span>
                        <SvgIcon icon="chevronRight" size="1.2rem"/>
                      </div>}
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

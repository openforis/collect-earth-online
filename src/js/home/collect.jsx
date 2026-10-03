import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { atom, useAtomValue } from 'jotai';
import SvgIcon from "../components/svg/SvgIcon";
import { stateAtom } from '../utils/constants';
import MapPanel from '../mapPanel';
import { zoomMapToPoint } from '../utils/newMercator';
import { Sidebar, SidebarCard, SidebarSearch, SidebarTabs } from "../components/Sidebar";
import "../../css/highlights.css";

// Newest first by publish date
const byNewest = (a, b) =>
  (b.publishedDate || "").localeCompare(a.publishedDate || "") || b.id - a.id;

// Frontend pagination size
const PAGE_SIZE = 50;

const EMPTY_MESSAGES = {
  recent: "You haven't collected on any projects yet.",
  newest: "No projects available.",
};

function Tag ({tag}) {
  return (
    <div className="tag"
      onClick={()=>{console.log('search for tags by tag-id:', tag);}}>
      <span>{tag}</span>
    </div>
  );
}

function ProjectCard ({project, mapConfig}) {
  const [seeMore, toggleDescription] = useState(false);
  const expandStyle = seeMore ? {} : {maxHeight: "3rem", overflow: 'hidden'};
  const description = project.description || "";
  return (
    <div className="project">
      <div className="project-info">
        <span className="project-title">{project.name}</span>
        <div
          className="project-attribution"
          onClick={() => {window.location.href = `/review-institution?institutionId=${project.institutionId}`;}}>
          <SvgIcon icon="institution" size="1.2rem"/>
          <span>{project.institutionName}</span>
        </div>
        {project.tags?.length > 0 &&
          <div className="tags">
            {project.tags.map((tag) => <Tag key={tag} tag={tag}/>)}
          </div>}
        <div className="project-description">
          <p style={expandStyle}>{description}</p>
          {description.length > 168 &&
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
              zoomMapToPoint(mapConfig?.map, JSON.parse(project.centroid).coordinates, 9, 500);
            }}
          >
            <SvgIcon icon="zoomIn" size="1rem"/>
            <span>Zoom to Project on Map</span>
          </div>
        </div>
        <div
          className="primary-button"
          onClick={() => {
            window.location.href = `/collection?projectId=${project.id}&institutionId=${project.institutionId}`;
          }}>
          <div>
            <span>Visit Project</span>
            <SvgIcon icon="chevronRight" size="1.2rem"/>
          </div>
        </div>
      </div>
    </div>
  );
}
const Project = memo(ProjectCard);

// Loads the next page when it scrolls into view
function LoadMore ({remaining, onLoadMore}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onLoadMore();
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [remaining, onLoadMore]);

  return (
    <div className="ghost-button" ref={ref}>
      <div onClick={onLoadMore}>
        <span>Show more projects ({remaining.toLocaleString()} remaining)</span>
      </div>
    </div>
  );
}

function CollectSidebar ({projects, mapConfig}) {
  const [activeTab, setActiveTab] = useState("recent");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const showMore = useCallback(() => setVisibleCount((count) => count + PAGE_SIZE), []);
  const changeTab = (id) => {
    setActiveTab(id);
    setVisibleCount(PAGE_SIZE);
  };
  const changeSearch = (value) => {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  };

  const recentProjects = useMemo(() => projects && projects.filter((p) => p.lastCollected), [projects]);
  const newestProjects = useMemo(() => projects && [...projects].sort(byNewest), [projects]);

  const tabProjects = activeTab === "recent" ? recentProjects : newestProjects;
  const visibleProjects = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return term && tabProjects
      ? tabProjects.filter(({name}) => name.toLocaleLowerCase().includes(term))
      : tabProjects;
  }, [tabProjects, search]);

  const remaining = (visibleProjects?.length || 0) - visibleCount;

  function emptyMessage () {
    if (projects === null) return "Loading projects...";
    return search.trim() ? "No projects match your search." : EMPTY_MESSAGES[activeTab];
  }

  return (
    <Sidebar header={null} stateAtom={stateAtom} footer={null} style={{ left: 0, width: "30vw", position: "fixed"}}>
      <SidebarCard title="Collect">
        <SidebarSearch value={search} onChange={changeSearch}/>
        <SidebarTabs
          tabs={[
            { id: "recent", label: `Recent Interpretations (${(recentProjects || []).length})` },
            { id: "newest", label: `Newest Projects (${(newestProjects || []).length})` },
          ]}
          activeTab={activeTab}
          onChange={changeTab}
        />
      </SidebarCard>
      <div id="collect-projects">
        {visibleProjects?.length > 0
          ? <>
              {visibleProjects.slice(0, visibleCount).map((project) => (
                <Project key={project.id} project={project} mapConfig={mapConfig}/>
              ))}
              {remaining > 0 && <LoadMore remaining={remaining} onLoadMore={showMore}/>}
            </>
          : <div className="collect-empty">{emptyMessage()}</div>}
      </div>
    </Sidebar>
  );
}

export default function Collect ({projects}) {
  const { imagery } = useAtomValue(stateAtom);
  const [mapConfigAtom] = useState(() => atom(null));
  const mapConfig = useAtomValue(mapConfigAtom);

  return (
    <div id='collect-tab' className='home-tab'>
      <CollectSidebar projects={projects} mapConfig={mapConfig}/>
      <div id="collect-map-container">
        <MapPanel
          mapConfigAtom={mapConfigAtom}
          imagery={imagery}
          projects={projects || []}/>
      </div>
    </div>);
}

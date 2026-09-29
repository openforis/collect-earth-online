import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { NavigationBar, Modal } from "./components/PageComponents";
import HomeTabs from "./home/components";
import { stateAtom } from "./utils/constants";


function Home ({ userRole, userId }) {
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

  function getUserStats (userId) {
    /*
      get data of logged-in user: TOS acceptance, ip login location for map centering(?)
    */

    fetch("/get-user-stats?accountId=" + userId)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((stats) => {
        if (stats) {
          (!(stats.acceptTOS || "").length > 0) &&
            setAppState(s => ({ ... s, modal: {"TOS": true}}));
          return Promise.resolve();
        } else {
          return Promise.reject("Unable to get User Data");
        }       
      });
  }
    useEffect(()=>{
      Promise.all([getImagery(), getInstitutions(), getProjects(), getUserStats(userId)])
      .catch((response) => {
        setAppState (prev => ({ ... prev, modal: {alert: {alertType: "Collection Alert", alertMessage: "Error retrieving the collection data. See console for details."}}}));
      })
      .finally(() => setAppState(prev => ({... prev, modalMessage: null })));
  }, []);

  function userAcceptTOS (slug) {
    fetch(`/user-accept-tos?userId=${userId}&slug=${slug}`, { method: "POST" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        setAppState(s => ({... s, modal: null}));
      })
      .catch((error) => {
        console.log(error);
      });
  }
 
  function TOSModal (){
    const [slug, setSlug] = useState("");
    return (
        <Modal
          title="Terms of Service"
          confirmDisabled={slug.length === 0}
          confirmText="Accept"          
          onConfirm={()=>{userAcceptTOS(slug);}}
        >
          <p>In order to use Collect Earth Online, please review and accept the
            <span
              onClick={()=>window.open('/terms-of-service')}
              style={{cursor: 'pointer',
                      textDecorationLine: 'underline',
                      color: 'var(--Primary-Highlight-Green)'}}
            > Terms of Service</span>.</p>
          <div>            
            <input type="text"
                   className="text-input"
                   value={slug}
                   onChange={(e)=> {setSlug(e.target.value);}}
                   placeholder="Enter Username to Accept"/>
          </div>
        </Modal>);

  }

  function AlertModal({alertType}) {
    return (<Modal title={appState.modal.alert.alertType}
                   onClose={()=>{setAppState({ ... appState, modal: null});}}>
          {appState.modal.alert.alertMessage}
            </Modal>);
  }

  function HomeModal({modal}) {
    const [tos, setTos] = useState("");
    if (modal) {
      const modalType = Object.keys(modal)[0];
      switch( modalType ) {
      case "alert": return (<AlertModal/>);
      case "TOS": return (<TOSModal/>);
      default: return (<></>);
      }    
    }
    else return null;
  }
  
  return (
    <div id="bcontainer">
      <span id="mobilespan" />
      <div className="Wrapper">
        <div className="row tog-effect"
             style={{flexWrap: 'nowrap'}}>
          <InstitutionSidebar
            institutions={appState.institutions}
            projects={appState.projects}
            userId={userId}
            userInstitutions={appState.userInstitutions}
            userRole={userRole}
            stateAtom={stateAtom}
          />
          <MapPanel
            imagery={appState.imagery}
            projects={appState.projects}
            showSidePanel={appState.showSidePanel}
          />
        </div>
      </div>
      <HomeModal modal={appState.modal}/>      
      {appState.modalMessage && <LoadingModal message={appState.modalMessage} />}
    </div>
  );
}

function ProjectPopup ({features,}) {
  useEffect(()=>{
    document.getElementById("zoomToCluster").onclick = () => {
      mercator.zoomMapToExtent(this.props.mapConfig, this.props.clusterExtent, 128);
      mercator.getOverlayByTitle(this.props.mapConfig, "projectPopup").setPosition(undefined);
    };
  }, []);
  return (
      <div className="d-flex flex-column" id="projectPopUp" style={{ maxHeight: "40vh" }}>
        <div className="cTitle">
          <h1>{features.length > 1 ? "Cluster info" : "Project info"}</h1>
        </div>
        <div className="cContent" style={{ padding: "10px", overflow: "auto" }}>
          <table className="table table-sm" style={{ tableLayout: "fixed" }}>
            <tbody>
              {features.map((feature) => (
                <React.Fragment key={feature.get("projectId")}>
                  <tr className="d-flex" style={{ borderTop: "1px solid gray" }}>
                    <td className="small col-6 px-0 my-auto">Name</td>
                    <td className="small col-6 pr-0">
                      <a
                        className="btn btn-sm btn-block btn-outline-lightgreen"
                        href={`/collection?projectId=${feature.get("projectId")}&institutionId=${feature.get("institutionId")}`}
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {feature.get("name")}
                      </a>
                    </td>
                  </tr>
                  <tr className="d-flex">
                    <td className="small col-6 px-0 my-auto">Description</td>
                    <td className="small col-6 pr-0" style={{ wordBreak: "break-all" }}>
                      {feature.get("description")}
                    </td>
                  </tr>
                  <tr className="d-flex" style={{ borderBottom: "1px solid gray" }}>
                    <td className="small col-6 px-0 my-auto">Number of plots</td>
                    <td className="small col-6 pr-0">{feature.get("numPlots")}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="mt-0 mb-0 btn btn-sm btn-block btn-outline-yellow"
          id="zoomToCluster"
          style={{
            alignItems: "center",
            cursor: "pointer",
            justifyContent: "center",
            minWidth: "350px",
            display: features.length > 1 ? "flex" : "none",
          }}
          type="button"
        >
          <SvgIcon icon="zoomIn" size="1rem" />
          <span style={{ marginLeft: "0.4rem" }}>Zoom to cluster</span>
        </button>
      </div>
    );
}

function MapPanel ({projects, imagery}) {
  const [mapConfig, setMapConfig] = useState(null);
  const [clusterExtent, setClusterExtent] = useState([]);
  const [clickedFeatures, setClickedFeatures] = useState([]);
  const [modal, setModal] = useState(null);

  function initializeMap () {
    const homePageLayer =
          imagery.find((imagery) => imagery.title === "Mapbox Satellite w/ Labels") ||
          imagery[0];
    const mapConfig = mercator.createMap("home-map-pane", [70, 15], 2.1, [homePageLayer]);
    mercator.setVisibleLayer(mapConfig, homePageLayer.id);
    setMapConfig(mapConfig);
  };

  function showProjectPopup(overlay, feature) {
    if (mercator.isCluster(feature)) {
      overlay.setPosition(feature.get("features")[0].getGeometry().getCoordinates());
      setClusterExtent(mercator.getClusterExtent(feature));
      setClickedFeatures(feature.get("features"));
    } else {
      overlay.setPosition(feature.getGeometry().getCoordinates());
      setClusterExtent([]);
      setClickedFeatures(feature.get("features"));
    }
  }

  function addProjectMarkers(mapConfig, projects, clusterDistance) {
    const projectSource = mercator.projectsToVectorSource(
      projects.filter((project) => project.centroid)
    );
    if (clusterDistance == null) {
      mercator.addVectorLayer(
        mapConfig,
        "projectMarkers",
        projectSource,
        mercator.ceoMapStyles("cluster", 0)
      );
    } else {
      mercator.addVectorLayer(
        mapConfig,
        "projectMarkers",
        mercator.makeClusterSource(projectSource, clusterDistance),
        (feature) => mercator.ceoMapStyles("cluster", feature.get("features").length)
      );
    }
    mercator.addOverlay(mapConfig, "projectPopup", document.getElementById("projectPopUp"));
    const overlay = mercator.getOverlayByTitle(mapConfig, "projectPopup");
    mapConfig.map.on("click", (event) => {
      if (mapConfig.map.hasFeatureAtPixel(event.pixel)) {
        const clickedFeatures = [];
        mapConfig.map.forEachFeatureAtPixel(event.pixel, (feature) =>
          clickedFeatures.push(feature)
        );
        showProjectPopup(overlay, clickedFeatures[0]);
      } else {
        overlay.setPosition(undefined);
      }
    });
  }
  
  useEffect(()=>{
    if ( mapConfig === null && imagery.length > 0 ) {
      initializeMap();
    }
    if ( mapConfig && projects.length > 0 ) {
      addProjectMarkers(mapConfig, projects, 40); // clusterDistance = 40, use null to disable clustering
    }
  }, [mapConfig, projects, imagery]);

  return (
      <div
        className="full-height"
        id="mapPanel"
        style={{ marginLeft: "30vw" }}
      >
        {modal?.alert &&
         <Modal title={modal.alert.alertType}
                onClose={()=>{setModal(null);}}>
           {modal.alert.alertMessage}
         </Modal>}
        <div className="full-height full-width" id="home-map-pane" style={{ maxWidth: "inherit" }} />
        <ProjectPopup
          clusterExtent={clusterExtent}
          features={clickedFeatures}
          mapConfig={mapConfig}
        />
      </div>
    );
};


function Home ({params, session}) {
  const [tab, setTab] = useState('highlights');
  return (
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}
                   fxns={{tab: {get: tab, set: setTab}}}>
      <HomeTabs tab={tab} session={session}/>
    </NavigationBar>
  );
}

export function pageInit(params, session) {
  ReactDOM.render(
    <Home params={params} session={session}/>,
    document.getElementById("app")
  );
}

import React, { useEffect, useState, //useMemo, useRef
              } from "react";
import { mercator } from "./utils/mercator";

import Modal from "./components/Modal";
import SvgIcon from "./components/svg/SvgIcon";

function ProjectPopup ({clusterExtent, features, mapConfig}) {

  useEffect(()=>{
    // There is some kind of bug in attaching this onClick handler directly to its button in render().
    document.getElementById("zoomToCluster").onclick = () => {
      mercator.zoomMapToExtent(mapConfig, clusterExtent, 128);
      mercator.getOverlayByTitle(mapConfig, "projectPopup").setPosition(undefined);
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


export default function MapPanel ({imagery = [], projects = []}) {
  const [mapConfig, setMapConfig] = useState(null);
  const [clusterExtent, setClusterExtent] = useState([]);
  const [clickedFeatures, setClickedFeatures] = useState([]);
  const [modal, setModal] = useState(null);

  function initializeMap () {
    console.log('initializing map');
    const homePageLayer =
          imagery.find((imagery) => imagery.title === "Mapbox Satellite w/ Labels") ||
          imagery[0];
    const initMapConfig = mercator.createMap("home-map-pane", [70, 15], 2.1, [homePageLayer]);
    mercator.setVisibleLayer(initMapConfig, homePageLayer.id);
    setMapConfig(initMapConfig);
  }

  function showProjectPopup(overlay, feature) {
    console.log('showing project popup');
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
    console.log('adding project markers', projects);
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
    console.log('prop imagery updated', imagery, imagery.length > 0, mapConfig === null);
    (imagery.length > 0 &&
     mapConfig === null) && initializeMap();
  }, [imagery]);

  useEffect(()=>{
    console.log('prop projects updated', projects, mapConfig !== null, projects.length > 0);
    const clusterDistance = 40; // use null to disable clustering
    (mapConfig !== null && projects.length > 0) &&
      addProjectMarkers(mapConfig, projects, clusterDistance);
  }, [projects, mapConfig]);

  /*
    componentDidUpdate(prevProps, prevState) {
    if (
    this.state.mapConfig === null &&
    this.props.imagery.length > 0 &&
    prevProps.imagery.length === 0
    ) {
    this.initializeMap();
    }

    if (
    this.state.mapConfig &&
    this.props.projects.length > 0 &&
    (!prevState.mapConfig || prevProps.projects.length === 0)
    ) {
    this.addProjectMarkers(this.state.mapConfig, this.props.projects, 40); // clusterDistance = 40, use null to disable clustering
    }
    }


  */



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
      {/*      <ProjectPopup
        clusterExtent={clusterExtent}
        features={clickedFeatures}
        mapConfig={mapConfig}
      />*/}
    </div>
  );
}

import "../../css/custom.css";

import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import SvgIcon from "./svg/SvgIcon";
import { getLanguage, capitalizeFirst } from "../utils/generalUtils";
import { getPreference, setPreference } from "../utils/preferences";

export function LogOutButton({ userName, uri }) {
  const fullUri = uri + window.location.search;
  const loggedOut = !userName || userName === "guest";

  const logout = () =>
    fetch("/logout", { method: "POST" }).then(() => window.location.assign("/home"));

  return loggedOut ? (
    <button
      className="btn btn-lightgreen btn-sm"
      onClick={() => window.location.assign("/login?returnurl=" + encodeURIComponent(fullUri))}
      type="button"
    >
      Login/Register
    </button>
  ) : (
    <>
      <li className="nav-item my-auto" id="username">
        <span className="nav-link disabled">{userName}</span>
      </li>
      <button className="btn btn-outline-red btn-sm" onClick={logout} type="button">
        Logout
      </button>
    </>
  );
}

class HelpSlideDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentSlideIdx: 0,
    };
  }

  render() {
    const { currentSlideIdx } = this.state;
    const { alt, body, img, title } = this.props.helpSlides[currentSlideIdx];
    const isLastSlide = currentSlideIdx === this.props.helpSlides.length - 1;
    const { closeHelpMenu, page } = this.props;
    return (
      <div
        onClick={closeHelpMenu}
        style={{
          position: "fixed",
          zIndex: "100",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      >
        <div className="col-8 col-sm-12">
          <div
            className="overflow-hidden container-fluid d-flex flex-column"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              border: "1.5px solid",
              borderRadius: "5px",
              height: "900px",
              margin: "90px auto",
              width: "fit-content",
            }}
          >
            <div
              className="row justify-content-between bg-lightgreen p-2"
              style={{ position: "relative" }}
            >
              <h2 className="ml-2" style={{ color: "white" }}>
                {title || `${capitalizeFirst(page)} Help`}
              </h2>
              <div
                onClick={closeHelpMenu}
                style={{ position: "absolute", top: "10px", right: "10px" }}
              >
                <SvgIcon icon="close" size="2rem" />
              </div>
            </div>
            <div className="d-flex align-items-center" style={{ height: "100%" }}>
              <div className="d-flex flex-column align-items-center">
                <button
                  className="btn btn-dark btn-sm m-2"
                  disabled={currentSlideIdx === 0}
                  onClick={() => this.setState({ currentSlideIdx: currentSlideIdx - 1 })}
                  style={{ borderRadius: "50%", margin: "2rem", height: "3rem", width: "3rem" }}
                  title="Previous"
                  type="button"
                >
                  <SvgIcon color="white" icon="leftArrow" size="2rem" />
                </button>
              </div>
              <div className="d-flex flex-column align-items-center justify-content-between">
                <p className="p-3" style={{ width: "22vw" }}>
                  {body}
                </p>
              </div>
              <div
                className="d-flex align-items-center justify-content-center"
                style={{ height: "100%", width: "33vw" }}
              >
                <img
                  alt={alt || ""}
                  src={"locale/" + page + img}
                  style={{ height: "auto", maxWidth: "100%", padding: "2rem" }}
                />
              </div>
              <div className="d-flex flex-column align-items-center">
                <button
                  className="btn btn-dark btn-sm m-2"
                  onClick={() => {
                    if (isLastSlide) {
                      closeHelpMenu();
                    } else {
                      this.setState({ currentSlideIdx: currentSlideIdx + 1 });
                    }
                  }}
                  style={{ borderRadius: "50%", margin: "2rem", height: "3rem", width: "3rem" }}
                  title="Next"
                  type="button"
                >
                  <SvgIcon color="white" icon={isLastSlide ? "check" : "rightArrow"} size="2rem" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export class NavigationBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      helpSlides: [],
      showHelpMenu: false,
      page: "",
    };
  }

  componentDidMount() {
    fetch("/locale/help.json", {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache", Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        const location = window.location.pathname.slice(1);
        const page = location === "" ? "home" : location;
        const availableLanguages = data[page];
        if (availableLanguages) this.getHelpSlides(availableLanguages, page);
      })
      .catch((error) => console.log(error));
  }

  autoShowHelpMenu = (page) => {
    const autoShowPages = ["home"];
    const key = `${page}:seen`;
    if (autoShowPages.includes(page) && !getPreference(key)) {
      this.setState({ showHelpMenu: true });
      setPreference(key, true);
    }
  };

  getHelpSlides = (availableLanguages, page) => {
    fetch(`/locale/${page}/${getLanguage(availableLanguages)}.json`, {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache", Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        this.setState({ helpSlides: data, page });
        this.autoShowHelpMenu(page);
      })
      .catch((error) => console.log(page, getLanguage(availableLanguages), error));
  };

  closeHelpMenu = () => this.setState({ showHelpMenu: false });

  render() {
    const { userName, userId, children } = this.props;
    const uri = window.location.pathname;
    const loggedOut = !userName || userName === "guest";

    return (
      <>
        {this.state.showHelpMenu && (
          <HelpSlideDialog
            closeHelpMenu={this.closeHelpMenu}
            helpSlides={this.state.helpSlides}
            page={this.state.page}
          />
        )}
        <nav
          className="navbar navbar-expand-lg navbar-light fixed-top py-0"
          id="main-nav"
          style={{ backgroundColor: "white", borderBottom: "1px solid black" }}
        >
          <a className="navbar-brand pt-1 pb-1" href="/home">
            <div className="d-flex flex-column align-items-center justify-content-center">
              <img
                alt="Home"
                className="img-fluid"
                id="ceo-site-logo"
                src="/img/ceo-logo.png"
                style={{ maxHeight: "40px" }}
              />
              <div className="badge badge-pill badge-light" style={{ fontSize: "0.6rem" }}>
                Version: {this.props.version}
              </div>
            </div>
          </a>
          <button
            aria-controls="navbarSupportedContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
            className="navbar-toggler"
            data-target="#navbarSupportedContent"
            data-toggle="collapse"
            type="button"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav mr-auto">
              {[
                { page: "CEO", link: "/home" },
                { page: "Home", link: "https://collect.earth/" },
                { page: "About", link: "https://collect.earth/about/" },
                { page: "Support", link: "https://collect.earth/ceo-guides" },
                { page: "Blog", link: "https://collect.earth/blog" },
              ].map(({ page, link }) => (
                <li
                  key={page}
                  className={"nav-item" + (page === "CEO" && uri === "/home" && " active")}
                >
                  <a className="nav-link" href={link}>
                    {page}
                  </a>
                </li>
             ))}
              {!loggedOut && (
                <li className={"nav-item" + (uri === "/account" && " active")}>
                  <a className="nav-link" href={"/account?accountId=" + userId}>
                    Account
                  </a>
                </li>
              )}
            </ul>
            <ul className="navbar-nav mr-0" id="login-info">
              <LogOutButton uri={uri} userName={userName} />
            </ul>
            <div className="ml-3" onClick={() => this.setState({ showHelpMenu: true })}>
              {this.state.helpSlides.length > 0 && (
                <div
                  className="tooltip_wrapper"
                  style={{
                    animation: "glow 2s 6 alternate",
                    animationDelay: "1s",
                    borderRadius: "2rem",
                  }}
                >
                  <SvgIcon color="purple" cursor="pointer" icon="help" size="2rem" />
                  <span className="tooltip_content">Help</span>
                </div>
              )}
            </div>
          </div>
          
        </nav>
        {children}
      </>
    );
  }
}

export function Logo({ size, url, name, id, src }) {
  const logoCSS = (logoSize) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    borderRadius: "50%",
    boxShadow: "0px 5px 10px rgba(0,0,0,.5)",
    padding: ".5rem",
    margin: "1rem",
    ...(logoSize === "large"
      ? {
          maxWidth: "180px",
          maxHeight: "180px",
          height: "180px",
          width: "180px",
        }
      : {
          maxWidth: "150px",
          maxHeight: "150px",
          height: "150px",
          width: "150px",
        }),
  });

  return (
    <div style={logoCSS(size)}>
      <a href={url} rel="noreferrer noopener" target="_blank">
        <img alt={name} className="img-fluid" id={id} src={src} style={{ padding: "0.9rem" }} />
      </a>
    </div>
  );
}

export function LogoBanner() {
  return (
    <div id="logo-banner">
      <div className="row justify-content-center mb-2">
        <div className="col-sm-6 text-center">
          <h2>With the support of</h2>
        </div>
      </div>
      <div className="row justify-content-center mb-2">
        <Logo
          name="Servir Global"
          size="large"
          src="/img/servir-logo.png"
          url="https://www.servirglobal.net/"
        />
        <Logo
          name="Open Foris"
          size="large"
          src="/img/openforis-logo.png"
          url="http://openforis.org"
        />
        <Logo
          name="Food and Agriculture Organization of the United Nations"
          size="large"
          src="/img/fao.png"
          url="http://www.fao.org"
        />
        <Logo
          name="U.S. Agency for International Development"
          size="large"
          src="/img/usaid.png"
          url="https://www.usaid.gov"
        />
        <Logo
          name="National Aeronautics and Space Administration"
          size="large"
          src="/img/nasa-logo.png"
          url="https://www.nasa.gov"
        />
      </div>
      <div className="row mb-2 justify-content-center">
        <div className="col-sm-6 text-center">
          <h2>In partnership with</h2>
        </div>
      </div>
      <div className="row mb-4 justify-content-center">
        <Logo
          name="Silva Carbon"
          size="small"
          src="/img/SilvaCarbon.png"
          url="https://www.silvacarbon.org"
        />
        <Logo
          name="Spatial Informatics Group, Inc."
          size="small"
          src="/img/sig-logo.png"
          url="https://sig-gis.com"
        />
        <Logo
          name="Servir Mekong"
          size="small"
          src="/img/servir-mekong-logo.png"
          url="https://servir.adpc.net"
        />
        <Logo
          name="Servir Amazonia"
          size="small"
          src="/img/servir-amazonia-logo.png"
          url="https://servir.ciat.cgiar.org"
        />
        <Logo
          name="Google, Inc."
          size="small"
          src="/img/google-logo.png"
          url="https://www.google.com"
        />
        <Logo
          name="U.S. Forest Service"
          size="small"
          src="/img/usfs.png"
          url="https://www.fs.usda.gov"
        />
        <Logo
          name="Geospatial Technology and Applications Center"
          size="small"
          src="/img/gtac-logo.png"
          url="https://www.fs.usda.gov/about-agency/gtac"
        />
      </div>
    </div>
  );
}

export function LoadingModal({ message }) {
  return (
    <div
      style={{
        position: "fixed",
        zIndex: "100",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          alignItems: "center",
          backgroundColor: "white",
          border: "1.5px solid",
          borderRadius: "5px",
          display: "flex",
          margin: "20% auto",
          width: "fit-content",
        }}
      >
        <div className="p-3">
          <div id="spinner" style={{ height: "2.5rem", position: "static", width: "2.5rem" }} />
        </div>
        <label className="m-0 mr-3">{message}</label>
      </div>
    </div>
  );
}

export const LearningMaterialModal = ({ learningMaterial, onClose }) => {
    return (
    <div
      className="modal fade show"
      id="quitModal"
      onClick={onClose}
      style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.4)" }}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="modal-content" id="quitModalContent">
          <div className="modal-header">
            <h5 className="modal-title" id="quitModalTitle">
              Learning Material
            </h5>
          </div>
          <div className="modal-body">
            <ReactMarkdown>{learningMaterial}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export function SuccessModal({ message, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        zIndex: "100",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          alignItems: "center",
          backgroundColor: "white",
          border: "1.5px solid",
          borderRadius: "5px",
          display: "flex",
          margin: "20% auto",
          width: "fit-content",
        }}
      >
        <div className="p-3">
          <SvgIcon color="var(--lightgreen)" icon="check" size="1.25rem" verticalAlign="initial" />
        </div>
        <label className="m-0 mr-3">{message}</label>
      </div>
    </div>
  );
}

export function AcceptTermsModal ({institutionId, projectId, toggleAcceptTermsModal }) {
  const [interpreterName, setInterpreterName] = useState("");

  const acceptTerms = () => {
    fetch(`/confirm-data-sharing?projectId=${projectId}`,
          {
            method: "POST",
            body: JSON.stringify({interpreterName}),
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
          }).then((response) => {
            if (response.ok) {
              window.location.assign(`/collection?projectId=${projectId}`)
            } else {
              console.log(response);
            }
          });
  }
  return (
    <div
      className="modal fade show"
      id="acceptTermsModal"
      onClick={toggleAcceptTermsModal}
      style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.4)" }}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="modal-content" id="quitModalContent">
          <div className="modal-header">
            <h5 className="modal-title" id="quitModalTitle">
              Accept Data Sharing Terms
            </h5>
            <button aria-label="Close"
                    className="close"
                    onClick={() =>
                      window.location.assign(`/review-institution?institutionId=${institutionId}`)
                    }
                    type="button">
              &times;
            </button>
          </div>
          <div className="modal-body">
            <p>
              I agree that all data collected will be openly licensed via 
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer"> CC BY 4.0</a>. 
              This license enables reusers to distribute, remix, adapt, and build upon the material in any medium or format, so long as attribution is given to the creator. 
              The license allows for commercial use. If I wish to receive attribution for my work, I have provided my name in the text field below. 
              If I have not provided my name, I wish to remain anonymous.
            </p>

            <label htmlFor="interpreter-name">Interpreter name</label>
            <input
              className="form-control mb-1 mr-sm-2"
              style={{ width: "300px" }}
              id="interpreter-name"
              maxLength="50"
              onChange={(e) => setInterpreterName(e.target.value)}
              type="text"
              value={interpreterName}
            />
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary btn-sm" onClick={acceptTerms} type="button">
              I Agree
            </button>
            <button
              className="btn btn-danger btn-sm"
              id="quit-button"
              onClick={() =>
                window.location.assign(`/review-institution?institutionId=${institutionId}`)
              }
              type="button"
            >
              I Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

 export const ImageryLayerOptions = ({
   imageryList,
   setImageryList,
   onDragEnd,
   onToggleLayer,
   onChangeOpacity,
   onReset,
   isImageryLayersExpanded,
 }) => {
   const [expandedSections, setExpandedSections] = useState({
     imagery: true,
     polygon: true,
   });
   
   const imageryLayers = imageryList.filter((image) => image.sourceConfig.type !== "FeatureCollection");
   const polygonLayers = imageryList.filter((image) => image.sourceConfig.type === "FeatureCollection");

   const toggleSection = (section) => {
     setExpandedSections((prev) => ({
       ...prev,
       [section]: !prev[section],
     }));
   };

   return (
     <div className="sidebar-wrapper" style={{ overflowX: "hidden", overflowY: "auto" }}>
       <div className={`sidebar-container ${isImageryLayersExpanded ? "" : "collapsed"}`}>
         {isImageryLayersExpanded && (
           <div className="sidebar-content">
             <div className="sidebar-header">
               <h3>Imagery Layer Options</h3>
             </div>
             <hr />

             <DragDropContext onDragEnd={(result) => onDragEnd(result, imageryList, setImageryList)}>
               {/* Imagery Layers */}
               <div className="sidebar-section">
                 <div className="section-header" onClick={() => toggleSection("imagery")}>
                   <strong>Imagery Layers</strong>
                   {expandedSections.imagery ? <FaChevronUp /> : <FaChevronDown />}
                 </div>
                 {expandedSections.imagery && (
                   <Droppable droppableId="imageryLayers">
                     {(provided, snapshot) => (
                       <div
                         className={`layers-list ${snapshot.isDraggingOver ? "dragging-over" : ""}`}
                         ref={provided.innerRef}
                         {...provided.droppableProps}
                       >
                         {imageryLayers.map((layer, index) => (
                           <Draggable key={layer.id} draggableId={layer.id.toString()} index={index}>
                             {(provided, snapshot) => {
                               const ensureHex = (color) =>
                                     /^[0-9a-f]{6}$/i.test(color) ? `#${color}` : color;
                                const visParams = layer.sourceConfig?.visParams
                                      ? JSON.parse(layer.sourceConfig.visParams)
                                      : null;
                              const palette = Array.isArray(visParams?.palette)
                                     ? visParams.palette
                                    : [];
                              const sliderStyle =
                                     palette.length === 2
                                     ? {
                                       '--first-slider-color': ensureHex(palette[0]),
                                       '--slider-color': ensureHex(palette[1]),
                                     }
                                     : palette.length
                                     ? {
                                       '--slider-color': ensureHex(palette[0]),
                                     }
                                     : {
                                       '--first-slider-color': '#d1d5db',
                                       '--slider-color': '#3b82f6',
                                     };
                               return (
                                 <div
                                   className={`layer-item ${snapshot.isDragging ? "dragging" : ""}`}
                                   ref={provided.innerRef}
                                   {...provided.draggableProps}
                                   {...provided.dragHandleProps}
                                 >
                                   <input
                                     type="checkbox"
                                     checked={layer.visible}
                                     onChange={() => onToggleLayer(layer.id, imageryList)}
                                   />
                                   <span className="layer-title">  {layer.title}</span>
                                   <input
                                     type="range"
                                     min="0"
                                     max="1"
                                     step="0.01"
                                     className="layer-range"
                                     value={layer.opacity || 1}
                                     onChange={(e) => onChangeOpacity(layer.id, parseFloat(e.target.value))}
                                     style={{sliderStyle}}
                                   />
                                 </div>
                               )}}
                              </Draggable>
                             ))}
                         {provided.placeholder && <div className="placeholder"></div>}
                       </div>
                     )}
                   </Droppable>
                 )}
               </div>

               {/* Polygon Layers */}
               <div className="sidebar-section">
                 <div className="section-header" onClick={() => toggleSection("polygon")}>
                   <strong>Polygon Layers</strong>
                   {expandedSections.polygon ? <FaChevronUp /> : <FaChevronDown />}
                 </div>
                 {expandedSections.polygon && (
                   <Droppable droppableId="polygonLayers">
                     {(provided, snapshot) => (
                       <div
                         className={`layers-list ${snapshot.isDraggingOver ? "dragging-over" : ""}`}
                         ref={provided.innerRef}
                         {...provided.droppableProps}
                       >
                         {polygonLayers.map((layer, index) => (
                           <Draggable key={layer.id} draggableId={layer.id.toString()} index={index}>
                             {(provided, snapshot) => (
                               <div
                                 className={`layer-item ${snapshot.isDragging ? "dragging" : ""}`}
                                 ref={provided.innerRef}
                                 {...provided.draggableProps}
                                 {...provided.dragHandleProps}
                               >
                                 <input
                                   type="checkbox"
                                   checked={layer.visible}
                                   onChange={() => onToggleLayer(layer.id, imageryList)}
                                 />
                                 <span className="layer-title">  {layer.title}</span>
                                 <input
                                   type="range"
                                   min="0"
                                   max="1"
                                   step="0.01"
                                   className="layer-range"
                                   value={layer.opacity || 1}
                                   onChange={(e) => onChangeOpacity(layer.id, parseFloat(e.target.value))}
                                 />
                               </div>
                             )}
                           </Draggable>
                         ))}
                         {provided.placeholder && <div className="placeholder"></div>}
                       </div>
                     )}
                   </Droppable>
                 )}
               </div>
             </DragDropContext>
             <button className="reset-button" onClick={onReset}>
               Reset All Layers
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export function PromptModal({title, inputs, callBack, closePrompt}) {
  const [promptState, setPromptState] = React.useState([]);
  React.useEffect(()=> setPromptState(inputs.reduce(
    (acc, {index, value}) => {
      return ({... acc,
               [index]: value});
    }, {} 
  )), []);
  let makeInput = ({label, type, index, value}) => {
    return (
      <div key={index}
           className="input-group"
           style={{flex: "1 100%"}}>

        <label
          style={{margin: "auto 1rem",
                  width: "50%"}}
        >{label}</label>
        <input type={type}
               checked={promptState[index]}
               value={promptState[index]}
               onChange= {(e)=> setPromptState({... promptState,
                                                [index]: (e.target.checked)})}
        ></input>
      </div>
    );
  };

  let  mappedInputs = inputs.map(makeInput);
  return (
    <div
      style={{
        position: "fixed",
        zIndex: "100",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          flexDirection: "column",
          backgroundColor: "white",
          border: "1.5px solid",
          borderRadius: "5px",
          display: "flex",
          margin: "20% auto",
          width: "fit-content",
          padding: "1.25rem"
        }}
      >
        <div className="container">
          <label>{title}</label>
        </div>
        <div className="break"></div>
        {mappedInputs}
        <div
          style={{
            display: "flex"}}>
          <input
            className="btn btn-outline-red btn-sm w-100"
            onClick={() => closePrompt()}
            type="button"
            value="Cancel"
            />
          <input
            className="btn btn-outline-lightgreen btn-sm w-100"
            onClick={() => callBack(promptState)}
            type="button"
            value="Confirm"
            />
        </div>
      </div>
    </div>
  );
}

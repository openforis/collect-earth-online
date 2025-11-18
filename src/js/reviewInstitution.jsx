import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { useAtom } from "jotai";

import { institutionPageAtom } from "./state/institutionPage";
import Modal from "./components/Modal";
import InstitutionEditor from "./components/InstitutionEditor";
import SvgIcon from "./components/svg/SvgIcon";
import { LoadingModal, NavigationBar, LearningMaterialModal, BreadCrumbs } from "./components/PageComponents";
import { ProjectVisibilityPopup, DownloadPopup, ImageryVisibilityPopup } from "./components/BulkPopups";
import { ProjectsTab } from "./components/ProjectsTab";
import { ImageryTab } from "./components/ImageryTab";

import { sortAlphabetically, capitalizeFirst, KBtoBase64Length } from "./utils/generalUtils";
import { safeLength } from "./utils/sequence";
import { imageryOptions } from "./imagery/imageryOptions";


const SidebarTabs = ({ tabs = [], activeTab, onChange }) => {
  return (
    <div
      className="sidebar-tabs"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: "18vw",
        background: "#f7f9f8",
        borderRight: "1px solid #dcdedc",
        paddingTop: "70px",
        boxSizing: "border-box",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              padding: "10px 16px",
              border: "none",
              backgroundColor: isActive ? "#e6efef" : "#f7f9f8",
              color: "#000",
              cursor: "pointer",
              width: "100%",
              transition: "background-color 0.2s ease, color 0.2s ease",
              position: "relative",
            }}
          >
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "4px",
                  backgroundColor: "#2f615e",
                  borderTopRightRadius: "2px",
                  borderBottomRightRadius: "2px",
                }}
              />
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              {tab.icon && <SvgIcon icon={tab.icon} size="1.2rem" />}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.label}
              </span>
            </div>

            {tab.badge > 0 && (
              <span
                style={{
                  background: "#3D7F7A",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  minWidth: "24px",
                  textAlign: "center",
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const ReviewInstitution = ({ institutionId, userId }) => {
  const [state, setState] = useAtom(institutionPageAtom);

  const setIsAdmin = (isAdmin) => setState((s) => ({ ...s, isAdmin }));
  const setSelectedTab = (tab) => setState((s) => ({ ...s, selectedTab: tab }));
  const setModal = (modal) => setState((s) => ({ ...s, modal }));
  const setModalMessage = (msg) => setState((s) => ({ ...s, modalMessage: msg }));
  const setProjectList = (projects) => setState((s) => ({ ...s, projectList: projects }));
  const setImageryList = (imagery) => setState((s) => ({ ...s, imageryList: imagery }));
  const setUsersList = (users) => setState((s) => ({ ...s, usersList: users }));
  const visibilityOrder = { platform: 0, private: 1, public: 2 };

  const showAlert = ({ title, body }) => {
    setModal({ alert: { alertType: title, alertMessage: body } });
  };

  const processModal = (message, promise) => {
    setModalMessage(message);
    promise.finally(() => setModalMessage(null));
  };

  const sortImageryByVisibility = (a, b) =>
        (visibilityOrder[a.visibility] ?? 99) - (visibilityOrder[b.visibility] ?? 99);

  const getProjectList = () => {
    processModal(
      "Loading institution data",
      Promise.allSettled([
        fetch(`/get-institution-projects?institutionId=${institutionId}`)
          .then((r) => (r.ok ? r.json() : Promise.reject(r)))
          .then((projects) => projects.map((p) => ({ ...p, isDraft: false }))),
        fetch(`/get-project-drafts-by-user?institutionId=${institutionId}`)
          .then((r) => (r.ok ? r.json() : Promise.reject(r)))
          .then((projects) => projects.map((p) => ({ ...p, isDraft: true }))),
      ])
        .then((results) => {
          const institutionProjects =
                results[0].status === "fulfilled" ? results[0].value : [];
          const draftProjects =
                results[1].status === "fulfilled" ? results[1].value : [];
          setState((s) => ({
            ...s,
            projectList: institutionProjects,
            draftProjects,
          }));
        })
        .catch(() => {
          showAlert({
            title: "Project Info Error",
            body: "Error retrieving the project info. Both requests failed.",
          });
        })
    );
  };

  const getImageryList = () => {
    fetch(`/get-institution-imagery?institutionId=${institutionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        const sorted = [...data].sort(sortImageryByVisibility);
        setImageryList(sorted);
      })
      .catch((err) => {
        console.log(err);
        setImageryList([]);
        showAlert({
          title: "Error",
          body: "Error retrieving the imagery list. See console for details.",
        });
      });
  };

  const getInstitutionDetails = () => {
    fetch(`/get-institution-by-id?institutionId=${institutionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        setState((s) => ({
          ...s,
          institutionDetails: data,
          newInstitutionDetails: {
            name: data.name,
            imageName: data.imageName,
            url: data.url,
            description: data.description,
            base64Image: "",
          },
        }));
        setIsAdmin(data.institutionAdmin);
      })
      .catch(() => {
        console.error("Error retrieving institution details");
        setModal({
          alert: {
            alertType: "Institution Info Error",
            alertMessage:
            "Error retrieving the institution details. See console for details.",
          },
        });
      });
  };

  const getInstitutionUserList = () => {
    fetch(`/get-institution-users?institutionId=${institutionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        const users = data.filter((u) => u.institutionRole !== "pending");
        setUsersList(data);
      })
      .catch(() => {
        setUsersList([]);
        console.error("Error retrieving the user list");
        setModal({
          alert: {
            alertType: "User List Error",
            alertMessage:
            "Error retrieving the user list. See console for details.",
          },
        });
      });
  };
  
  const archiveProject = (projectId) => {
    if (confirm("Do you REALLY want to delete this project? This operation cannot be undone.")) {
      fetch(`/archive-project?projectId=${projectId}`, { method: "POST" }).then((response) => {
        if (response.ok) {
          getProjectList();
          showAlert({
            title: "Project Info",
            body: `Project ${projectId} has been deleted.`,
          });
        } else {
          console.error(response);
          showAlert({
            title: "Project Info Error",
            body: "Error deleting project. See console for details.",
          });
        }
      });
    }
  }

  const deleteProjectDraft = (projectDraftId) => {
    if (confirm("Do you REALLY want to delete this project draft? This operation cannot be undone.")) {
      fetch(`/delete-project-draft?projectDraftId=${projectDraftId}`, { method: "GET" }).then(
        (response) => {
          if (response.ok) {
            getProjectList();
            showAlert({
              title: "Project Info",
              body: `Project ${projectDraftId} has been deleted.`,
            });
          } else {
            console.error(response);
            showAlert({
              title: "Project Info Error",
              body: "Error deleting project draft. See console for details.",
            });
          }
        }
      );
    }
  }

  const deleteProjectsBulk = (projectIds) => {
    if (confirm("Do you REALLY want to delete ALL selected projects? This operation cannot be undone.")) {
      fetch(`/delete-projects-bulk?institutionId=${institutionId}`, {
        method: "POST",
        body: JSON.stringify({ projectIds }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }).then((response) => {
        if (response.ok) {
          getProjectList();
          showAlert({
            title: "Project Info",
            body: "Selected projects have been deleted.",
          });
        } else {
          console.error(response);
          showAlert({
            title: "Project Info Error",
            body: "Error deleting projects. See console for details.",
          });
        }
      });
    }
  }

  const editProjectsBulk = (projectIds, selectedVisibility) => {
    if (confirm("Do you really want to edit the visibility for ALL the selected projects?")) {
      fetch(`/edit-projects-bulk?institutionId=${institutionId}`, {
        method: "POST",
        body: JSON.stringify({
          projectIds,
          visibility: selectedVisibility,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }).then((response) => {
        if (response.ok) {
          getProjectList();
          showAlert({
            title: "Project Info",
            body: `The visibility of the selected projects has been changed to ${selectedVisibility}.`,
          });
        } else {
          console.error(response);
          showAlert({
            title: "Project Info Error",
            body: "Error editing project visibility. See console for details.",
          });
        }
      });
    }
  }

  const deleteImageryBulk = (imageryIds, getImageryList) => {
    fetch("/bulk-archive-institution-imagery", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institutionId,
        imageryIds,
      }),
    }).then((response) => {
      if (response.ok) {
        getImageryList();
        showAlert({
          title: "Imagery Deleted",
          body: "Imagery has been successfully deleted.",
        });
      } else {
        console.error(response);
        showAlert({
          title: "Error",
          body: "Error deleting imagery. See console for details.",
        });
      }
    });
  }

  const downloadProjectsBulk = (selectedProjects, selectedOptions) => {
    const fileTypes = Object.entries(selectedOptions)
          .filter(([_, value]) => value)
          .map(([key]) => key);
    const fileTypesStr = fileTypes.join(",");
    const projectIds = selectedProjects.join(",");
    window.open(
      `/download-projects-bulk?projectIds=${projectIds}&institutionId=${institutionId}&fileTypes=${fileTypesStr}`
    );
  }

  const editImageryBulk = (imageryIds, selectedVisibility) => {
    if (confirm("Do you really want to edit the visibility for ALL the selected projects?")) {
      fetch("/edit-imagery-bulk", {
        method: "POST",
        body: JSON.stringify({
          imageryIds,
          visibility: selectedVisibility,
          institutionId,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }).then((response) => {
        if (response.ok) {
          getProjectList();
          alert(`The visibility of the selected projects has been changed to ${selectedVisibility}`);
        } else {
          console.error(response);
          alert("Error editing project visibility. See console for details.");
        }
      });
    }
  }

  useEffect(() => {
    getProjectList();
    getImageryList();
    getInstitutionDetails();
    getInstitutionUserList();
  }, []);

  const headerTab = (name, count, index, disabled = false) => (
    <div className="col-lg-4 col-xs-12 px-2">
      <div className={"px-3" + (disabled ? "disabled-group" : "")} onClick={() => !disabled && setSelectedTab(index)}>
        <h2 className="header" style={{ borderRadius: "5px", cursor: disabled ? "not-allowed" : "pointer" }}>
          {name}
          <span className="badge badge-pill badge-light ml-2">{count}</span>
          <span className="float-right">
            {index === state.selectedTab && <SvgIcon icon="downCaret" size="1rem" />}
          </span>
        </h2>
      </div>
    </div>
  );

  return (
    <>
      <SidebarTabs
        tabs={[
          { id: "projects", label: "Projects", icon: "projects", badge: state.projectList?.length || 0 },
          { id: "imagery", label: "Imagery", icon: "imagery", badge: state.imageryList?.length || 0 },
          { id: "users", label: "Users", icon: "users", badge: state.usersList?.length || 0 },
        ]}
        activeTab={state.selectedTab}
        onChange={setSelectedTab}
      />
      <div id="review-institution">
        {state.modal?.alert && (
          <Modal title={state.modal.alert.alertType} onClose={() => setModal(null)}>
            {state.modal.alert.alertMessage}
          </Modal>
        )}
        {state.modalMessage && <LoadingModal message={state.modalMessage} />}
      </div>
      {state.selectedTab === "projects" && (
        <ProjectsTab
          institutionId={institutionId}
          projectList={state.projectList}
          isAdmin={state.isAdmin}
          deleteProjectsBulk={deleteProjectsBulk}
          editProjectsBulk={editProjectsBulk}
          downloadProjectsBulk={downloadProjectsBulk}
        />
      )}
      {state.selectedTab === "imagery" && (
        <ImageryTab
          imageryList={state.imageryList}
          editImagery={editImageryBulk}
          deleteImagery={deleteImageryBulk}
          isAdmin={state.isAdmin}
        />
      )}
      {state.selectedTab === "users" && (
        <UsersTab
          usersList={usersList} />
      )}
    </>
  )
};

class NewImagery extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedType: 0,
      imageryTitle: "",
      imageryAttribution: "",
      imageryParams: {},
      isProxied: false,
      addToAllProjects: false,
    };
  }

  componentDidMount() {
    const { id } = this.props.imageryToEdit;
    if (id !== -1) {
      this.setImageryToEdit();
    } else {
      this.imageryTypeChangeHandler(0);
    }
  }

  getImageryParams = (type, imageryParams) => {
    // TODO, this should be made generic based on parent / child relationship
    // SecureWatch is not defined in imageryOptions in a way that will facilitate this.
    if (type === "GeoServer") {
      const {
        geoserverUrl,
        geoserverParams: { LAYERS, ...cleanGeoserverParams },
      } = imageryParams;
      return {
        geoserverUrl,
        LAYERS,
        geoserverParams: JSON.stringify(cleanGeoserverParams),
      };
    } else if (type === "SecureWatch") {
      const {
        geoserverParams: { CONNECTID },
        startDate,
        endDate,
        baseUrl,
      } = imageryParams;
      return {
        connectid: CONNECTID,
        startDate,
        endDate,
        baseUrl,
      };
    } else {
      return imageryParams;
    }
  };

  //    Remote Calls    //

  sanitizeParams = (type, imageryParams) => {
    const sanitizedParams = { ...imageryParams };
    imageryOptions[type].params.forEach((param) => {
      if (param.sanitizer) {
        sanitizedParams[param.key] = param.sanitizer(sanitizedParams[param.key]);
      }
    });
    return sanitizedParams;
  };

  validateParams = (type, imageryParams) => {
    const parameterErrors = imageryOptions[type].params.map(
      (param) =>
      (param.required !== false &&
       (!imageryParams[param.key] || imageryParams[param.key].length === 0) &&
       `${param.display} is required.`) ||
        (param.validator && param.validator(imageryParams[param.key]))
    );
    const imageryError =
          imageryOptions[type].validator && imageryOptions[type].validator(imageryParams);
    return [...parameterErrors, imageryError].filter((error) => error);
  };

  uploadCustomImagery = (isNew) => {
    console.log("uploading custom imagery",
                isNew, //true
                this.state.imageryTitle.length, // 10+
                this.state.imageryAttribution.length, //0
                this.state.selectedType, //2
                this.props.titleIsTaken(this.state.imageryTitle, this.props.imageryToEdit.id), //false
                
               );
    const sanitizedParams = this.sanitizeParams(this.state.selectedType, this.state.imageryParams);
    const messages = this.validateParams(this.state.selectedType, sanitizedParams);
    if (messages.length > 0) {
      this.setState ({modal: {alert: {alertType: "Imagery Upload", alertMessage: messages.join(", ")}}});
    } else {
      const sourceConfig = this.buildSecureWatch(this.stackParams(sanitizedParams)); // TODO define SecureWatch so stack params works correctly.
      if (this.state.imageryTitle.length === 0 ||
          (this.state.imageryAttribution.length === 0 && this.state.selectedType !== "14")) {
        this.setState ({modal: {alert: {alertType: "Imagery Upload Error", alertMessage: "You must include a title and attribution."}}});
      } else if (this.props.titleIsTaken(this.state.imageryTitle, this.props.imageryToEdit.id)) {
        this.setState ({modal: {alert: {alertType: "Imagery Upload Error", alertMessage: "The title '" + this.state.imageryTitle + "' is already taken."}}});
      } else {
        console.log("fetching at", isNew ? "/add-institution-imagery" : "/update-institution-imagery");
        fetch(isNew ? "/add-institution-imagery" : "/update-institution-imagery", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institutionId: this.props.institutionId,
            imageryId: this.props.imageryToEdit.id,
            imageryTitle: this.state.imageryTitle,
            imageryAttribution: this.state.imageryAttribution,
            isProxied: this.state.isProxied,
            addToAllProjects: this.state.addToAllProjects,
            sourceConfig,
          }),
        }).then((response) => {
          if (response.ok) {
            this.props.getImageryList();
            this.props.hideEditMode();
          } else {
            console.log(response);
            this.setState ({modal: {alert: {alertType: "Imagery Upload Error", alertMessage: "Error uploading imagery data. See console for details."}}});
          }
        });
      }
    }
  };

  //    Helper Functions    //

  stackParams = (params) => {
    try {
      const imageryParams = imageryOptions[this.state.selectedType].params;
      return Object.keys(params)
        .sort((a) => (imageryParams.find((p) => p.key === a).parent ? 1 : -1)) // Sort params that require a parent to the bottom
        .reduce(
          (a, c) => {
            const parentStr = imageryParams.find((p) => p.key === c).parent;
            if (parentStr) {
              const parentObj = JSON.parse(a[parentStr] || "{}");
              return { ...a, [parentStr]: { ...parentObj, [c]: params[c] } };
            } else {
              return { ...a, [c]: params[c] };
            }
          },
          { type: imageryOptions[this.state.selectedType].type }
        );
    } catch (e) {
      return {};
    }
  };

  // TODO this shouldn't be needed if SecureWatch is defined correctly in imageryOptions
  buildSecureWatch = (sourceConfig) => {
    if (sourceConfig.type === "SecureWatch") {
      sourceConfig.geoserverUrl = `${sourceConfig.baseUrl}/mapservice/wmsaccess`;
      const geoserverParams = {
        VERSION: "1.1.1",
        STYLES: "",
        LAYERS: "DigitalGlobe:Imagery",
        CONNECTID: sourceConfig.connectid,
      };
      sourceConfig.geoserverParams = geoserverParams;
      delete sourceConfig.connectid;
      return sourceConfig;
    } else {
      return sourceConfig;
    }
  };

  //    Render Functions    //

  formInput = (title, type, value, callback, link = null, options = {}) => (
    <div key={title} className="mb-3">
      <label>{title}</label> {link}
      <input
        autoComplete="off"
        className="form-control"
        onChange={(e) => callback(e)}
        type={type}
        value={value || ""}
        {...options}
      />
    </div>
  );

  formSelect = (title, value, callback, options, link = null) => (
    <div key={title} className="mb-3">
      <label>{title}</label> {link}
      <select className="form-control" onChange={(e) => callback(e)} value={value}>
        {options}
      </select>
    </div>
  );

  formCheck = (title, checked, callback) => (
    <div key={title} className="mb-0">
      <label>
        <input checked={checked} className="mr-2" onChange={callback} type="checkbox" />
        {title}
      </label>
    </div>
  );

  formTextArea = (title, value, callback, link = null, options = {}) => (
    <div key={title} className="mb-3">
      <label>{title}</label> {link}
      <textarea
        className="form-control"
        onChange={(e) => callback(e)}
        value={value || ""}
        {...options}
      />
    </div>
  );

  accessTokenLink = (url, key) =>
  url && key === "accessToken" ? (
    <a
      href={imageryOptions[this.state.selectedType].url}
      rel="noreferrer noopener"
      target="_blank"
    >
      Click here for help.
    </a>
  ) : null;

  formTemplate = (o) =>
  o.type === "select"
    ? this.formSelect(
      o.display,
      this.state.imageryParams[o.key],
      (e) =>
      this.setState({
        imageryParams: {
          ...this.state.imageryParams,
          [o.key]: e.target.value,
        },
        imageryAttribution:
        imageryOptions[this.state.selectedType].type === "BingMaps"
          ? "Bing Maps API: " + e.target.value + " | © Microsoft Corporation"
          : this.state.imageryAttribution,
      }),
      o.options.map((el) => (
        <option key={el.value} value={el.value}>
          {el.label}
        </option>
      )),
      this.accessTokenLink(imageryOptions[this.state.selectedType].url, o.key)
    )
    : ["textarea", "JSON"].includes(o.type)
    ? this.formTextArea(
      o.display,
      this.state.imageryParams[o.key],
      (e) =>
      this.setState({
        imageryParams: { ...this.state.imageryParams, [o.key]: e.target.value },
      }),
      this.accessTokenLink(imageryOptions[this.state.selectedType].url, o.key),
      o.options ? o.options : {}
    )
    : this.formInput(
      o.display,
      o.type || "text",
      this.state.imageryParams[o.key],
      (e) =>
      this.setState({
        imageryParams: { ...this.state.imageryParams, [o.key]: e.target.value },
      }),
      this.accessTokenLink(imageryOptions[this.state.selectedType].url, o.key),
      o.options ? o.options : {}
    );

  // Imagery Type Change Handler //

  // TODO, this can be generalized back into imageryOptions
  getImageryAttribution = (type) =>
  type === "BingMaps"
    ? "Bing Maps API: Aerial | © Microsoft Corporation"
    : type.includes("Planet")
    ? "Planet Labs Global Mosaic | © Planet Labs, Inc"
    : type === "SecureWatch"
    ? "SecureWatch Imagery | © Maxar Technologies Inc."
    : ["Sentinel1", "Sentinel2", "DynamicWorld"].includes(type) || type.includes("GEE")
    ? "Google Earth Engine | © Google LLC"
    : type.includes("MapBox")
    ? "© Mapbox"
    : type === "OSM"
    ? "Open Street Map"
    : "";

  setImageryToEdit = () => {
    const { title, attribution, isProxied, sourceConfig } = this.props.imageryToEdit;
    const { type, ...imageryParams } = sourceConfig;
    const selectedType = imageryOptions.findIndex((io) => io.type === type);
    this.setState({
      selectedType,
      imageryTitle: title,
      imageryAttribution: attribution,
      isProxied,
      imageryParams: this.getImageryParams(type, imageryParams),
    });
  };

  imageryTypeChangeHandler = (val) => {
    const { type, params, defaultProxy } = imageryOptions[val];
    const defaultState = params.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.key]: cur.type === "select" ? cur.options[0].value : "",
      }),
      {}
    );
    this.setState({
      selectedType: val,
      imageryAttribution: this.getImageryAttribution(type),
      isProxied: defaultProxy,
      imageryParams: defaultState,
    });
  };

  render() {
    const { tfoLayers, imageryToEdit } = this.props;
    const isNewImagery = imageryToEdit.id === -1;
    const { type, params, optionalProxy } = imageryOptions[this.state.selectedType];
    // This is annoyingly hard coded.
    const displayParams =
          type === "PlanetTFO"
          ? [
            params[0],
            {
              ...params[1],
              options: [
                ...params[1].options,
                ...tfoLayers.map((l) => ({ label: l.slice(34, l.length - 7), value: l })),
              ],
            },
            params[2],
          ]
          : params;

    return (
      <div className="mb-2 p-4 border rounded">
        {this.state.modal?.alert &&
       <Modal title={this.state.modal.alert.alertType}
              onClose={()=>{this.setState({modal: null});}}>
         {this.state.modal.alert.alertMessage}
       </Modal>}
        {/* Selection for imagery type */}
        <div className="mb-3">
          <label>Select Type</label>
          <select
            className="form-control"
            disabled={!isNewImagery}
            onChange={(e) => this.imageryTypeChangeHandler(e.target.value)}
            value={this.state.selectedType}
          >
            {/* eslint-disable-next-line react/no-array-index-key */}
            {imageryOptions.map((o, i) => (
              <option key={i} value={i}>
                {o.label || o.type}
              </option>
            ))}
          </select>
        </div>
        {/* Add fields. Include same for all and unique to selected type. */}
        {this.formInput("Title", "text", this.state.imageryTitle, (e) =>
          this.setState({ imageryTitle: e.target.value })
        )}
        {/* This should be generalized into the imageryOptions */}
        {["GeoServer", "xyz"].includes(type) &&
         this.formInput("Attribution", "text", this.state.imageryAttribution, (e) =>
           this.setState(s => ({...s, imageryAttribution: e.target.value }))
         )}
        {displayParams.map((o) => this.formTemplate(o))}
        {optionalProxy &&
         this.formCheck("Proxy Imagery", this.state.isProxied, () =>
           this.setState({ isProxied: !this.state.isProxied })
         )}
        {/* Add Imagery to All Projects checkbox */}
        <div className="mb-3">
          <input
            checked={this.state.addToAllProjects}
            className="mr-2"
            id="add-to-all"
            onChange={() => this.setState({ addToAllProjects: !this.state.addToAllProjects })}
            type="checkbox"
          />
          <label htmlFor="add-to-all">Add Imagery to All Projects When Saving</label>
        </div>
        <div className="row">
          <div className="col-6">
            <button
              className="btn btn-sm btn-block btn-outline-lightgreen btn-group py-2 font-weight-bold"
              id="add-imagery-button"
              onClick={() => this.uploadCustomImagery(isNewImagery)}
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "center",
              }}
              type="button"
            >
              {isNewImagery ? (
                <>
                  <SvgIcon icon="plus" size="1rem" />
                  <span style={{ marginLeft: "0.4rem" }}>Add New Imagery</span>
                </>
              ) : (
                <>
                  <SvgIcon icon="save" size="1rem" />
                  <span style={{ marginLeft: "0.4rem" }}>Save Imagery Changes</span>
                </>
              )}
            </button>
          </div>
          <div className="col-6">
            <button
              className="btn btn-sm btn-block btn-outline-red btn-group py-2 font-weight-bold"
              onClick={this.props.hideEditMode}
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "center",
              }}
              type="button"
            >
              <SvgIcon icon="cancel" size="1rem" />
              <span style={{ marginLeft: "0.4rem" }}>Cancel Changes</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

class UserList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      institutionUserList: [],
    };
  }

  componentDidMount() {
    this.getInstitutionUserList();
  }

  getInstitutionUserList = () => {
    fetch(`/get-institution-users?institutionId=${this.props.institutionId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        this.props.setUsersCount(data.filter((user) => user.institutionRole !== "pending").length);
        this.setState({ institutionUserList: data });
      })
      .catch((response) => {
        this.setState({ institutionUserList: [] });
        console.log(response);
        this.setState (s => ({... s, modal: {alert: {alertType: "User List Error", alertMessage: "Error retrieving the user list. See console for details."}}}));
      });
  };

  updateUserInstitutionRole = (accountId, newUserEmail, newInstitutionRole) => {
    const existingRole = (this.state.institutionUserList.find((u) => u.id === accountId) || {})
          .institutionRole;
    const lowerCaseNewUserEmail = newUserEmail?.toLowerCase();
    const adminCount = this.state.institutionUserList.filter(
      (user) => user.institutionRole === "admin"
    ).length;
    if (existingRole === "admin" && adminCount === 1) {
      this.setState ({modal: {alert: {alertType: "Update User Institution Role Error", alertMessage: "You cannot modify the last admin of an institution."}}});
    } else {
      this.props.processModal(
        "Updating user",
        fetch("/update-user-institution-role", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId,
            newUserEmail: lowerCaseNewUserEmail,
            institutionId: this.props.institutionId,
            institutionRole: newInstitutionRole,
          }),
        })
          .then((response) => (response.ok ? response.json() : Promise.reject(response)))
          .then((message) => {
            this.setState ({modal: {alert: {alertType: "Institution Users Error", alertMessage: message}}});
            this.getInstitutionUserList();
          })
          .catch((response) => {
            console.log(response);
            this.setState ({modal: {alert: {alertType: "Institution Users Error", alertMessage: "Error updating institution details. See console for details."}}});
          })
      );
    }
  };

  requestMembership = () => {
    fetch("/request-institution-membership", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institutionId: this.props.institutionId,
      }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((message) => {
        this.setState ({modal: {alert: {alertType: "Membership Request Error", alertMessage: message}}});
        this.getInstitutionUserList();
      })
      .catch((response) => {
        console.log(response);
        this.setState ({modal: {alert: {alertType: "Membership Request Error", alertMessage: "Error requesting institution membership. See console for details."}}});
      });
  };

  currentIsInstitutionMember = () =>
  this.props.userId === 1 ||
    this.state.institutionUserList.some((iu) => iu.id === this.props.userId);

  isInstitutionMember = (userEmail) =>
  this.state.institutionUserList.some((iu) => iu.email === userEmail);

  render() {
    return (
      this.props.isVisible && (
        <>
          <div className="mb-3">
            This is a list of all institution users. An institution admin can create and update
            projects and imagery for the institution. Members can view projects with the visibility
            Institution or higher.
          </div>
          <NewUserButtons
            currentIsInstitutionMember={this.currentIsInstitutionMember()}
            isAdmin={this.props.isAdmin}
            isInstitutionMember={this.isInstitutionMember}
            requestMembership={this.requestMembership}
            updateUserInstitutionRole={this.updateUserInstitutionRole}
            userId={this.props.userId}
          />
          {this.state.institutionUserList
           .filter(
             (iu) =>
             iu.id === this.props.userId || this.props.isAdmin || iu.institutionRole === "admin"
           )
           .sort((a, b) => sortAlphabetically(a.email, b.email))
           .sort((a, b) => sortAlphabetically(a.institutionRole, b.institutionRole))
           .map((iu) => (
             <User
               key={iu.email}
               isAdmin={this.props.isAdmin}
               updateUserInstitutionRole={this.updateUserInstitutionRole}
               user={iu}
             />
           ))}
        </>
      )
    );
  }
}

const NewUserButtons = ({
  isAdmin,
  isInstitutionMember,
  updateUserInstitutionRole,
  userId,
  currentIsInstitutionMember,
  requestMembership,
}) => {
  const [newUserEmail, setNewUserEmail] = useState([]);

  const checkUserEmail = () => {
    if (newUserEmail.length === 0) {
      this.setState ({modal: {alert: {alertType: "Update User Error", alertMessage: "Please enter an existing user's email address."}}});
      return false;
    } else if (isInstitutionMember(newUserEmail)) {
      this.setState ({modal: {alert: {alertType: "Update User Error", alertMessage: this.state.newUserEmail + " is already a member of this institution."}}});
      return false;
    } else {
      return true;
    }
  };

  const addUser = () => {
    updateUserInstitutionRole(null, newUserEmail, "member");
  };

  return (
    <>
      {isAdmin && (
        <div className="row mb-3">
          <div className="col-8">
            <input
              autoComplete="off"
              className="form-control form-control-sm py-2"
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="Email"
              style={{ height: "100%" }}
              type="email"
              value={newUserEmail}
            />
          </div>
          <div className="col-4 pl-0">
            <button
              className="btn btn-sm btn-lightgreen btn-block py-2 font-weight-bold"
              onClick={() => checkUserEmail() && addUser()}
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "center",
              }}
              type="button"
            >
              <SvgIcon icon="plus" size="1rem" />
              <span style={{ marginLeft: "0.4rem" }}>Add User</span>
            </button>
          </div>
        </div>
      )}
      {userId > 0 && !currentIsInstitutionMember && (
        <div>
          <button
            className="btn btn-sm btn-lightgreen btn-block mb-3"
            id="request-membership-button"
            onClick={requestMembership}
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
            }}
            type="button"
          >
            <SvgIcon icon="plus" size="1rem" />
            <span style={{ marginLeft: "0.4rem" }}>Request Membership</span>
          </button>
        </div>
      )}
    </>
  );
};



export function pageInit(params, session) {
  let [] = 
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumbs={[
          {display: params.institutionName || "Review Institution",
           id:"institution",
           query:["institution", parseInt(params.institutionId || "-1")],
           onClick:()=>{}}]}
      />
      <ReviewInstitution
        institutionId={parseInt(params.institutionId || "-1")}
        userId={session.userId || -1}
      />
    </NavigationBar>,
    document.getElementById("app")
  );
}

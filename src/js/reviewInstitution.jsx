import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { createPortal } from "react-dom";
import { useAtom } from "jotai";

import { institutionPageAtom } from "./state/institutionPage";
import Modal from "./components/Modal";
import SvgIcon from "./components/svg/SvgIcon";
import { LoadingModal, NavigationBar, BreadCrumbs } from "./components/PageComponents";
import { KBtoBase64Length } from "./utils/generalUtils";
import { ProjectsTab } from "./components/ProjectsTab";
import { ImageryTab } from "./components/ImageryTab";
import { UsersTab } from "./components/UsersTab";
import { safeLength } from "./utils/sequence";

import '../css/institution.css';


export const ReviewInstitution = ({ institutionId, userId }) => {
  const [state, setState] = useAtom(institutionPageAtom);
  const setIsAdmin = (isAdmin) => setState((s) => ({ ...s, isAdmin }));
  const setSelectedTab = (tab) => setState((s) => ({ ...s, selectedTab: tab }));
  const setModal = (modal) => setState((s) => ({ ...s, modal }));
  const setModalMessage = (msg) => setState((s) => ({ ...s, modalMessage: msg }));
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
          institutionDetails: data
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
    if(userId){
      fetch(`/get-institution-users?institutionId=${institutionId}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r)))
        .then((data) => {
          const users = data.filter((u) => u.institutionRole !== "pending");
          const usersData = isAdmin ? data : users;
          setUsersList(usersData);
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
    }
  };

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

  const deleteImageryBulk = (imageryIds) => {
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
    const fileTypesStr = selectedOptions.join(",");
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

  const editUsersBulk = (users, role) => {
    fetch("/update-user-institution-role", {
      method: "POST",
      body: JSON.stringify({
        accountIds: users,
        institutionRole: role,
        institutionId: institutionId
      }),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    }).then((response) => {
      if(response.ok) {
        getInstitutionUserList();
        console.log(response);
      } else {
        console.log(response);
      }
    })
  }

  const addUsersBulk = (users) => {
    fetch("/add-user-to-institution", {
      method: "POST",
      body: JSON.stringify({
        newUsers: users,
        institutionId: institutionId
      }),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    }).then((response) => {
      if(response.ok) {
        getInstitutionUserList();
        console.log(response);
      } else {
        console.log(response);
      }
    })
  }

  const updateInstitution = (params) => {
    const { base64Image, name, description, imageName, url } = params;

    if (base64Image?.length > KBtoBase64Length(500)) {
      setModal({
        alert: {
          alertType: "Institution Info Error",
          alertMessage: "Institution logos must be smaller than 500kb",
        },
      });
    } else if (!name?.trim()) {
      setModal({
        alert: {
          alertType: "Institution Info Error",
          alertMessage: "Institution must have a name.",
        },
      });
    } else if (!description?.trim()) {
      setModal({
        alert: {
          alertType: "Institution Info Error",
          alertMessage: "Institution must have a description.",
        },
      });
    } else {
      fetch(`/update-institution?institutionId=${institutionId}`, {
        method: "POST",
        body: JSON.stringify({
          institutionId,
          ...params
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
        .then((response) => Promise.all([response.ok, response.json()]))
        .then(([ok, data]) => {
          if (ok && data === "") {
            getInstitutionDetails();
          } else {
            setModal({
              alert: {
                alertType: "Institution Info",
                alertMessage: data || "Unexpected response from server.",
              },
            });
          }
        })
        .catch(() => {
          setModal({
            alert: {
              alertType: "Institution Info Error",
              alertMessage: "Error updating institution details.",
            },
          });
        });
    }
  };


  useEffect(() => {
    getProjectList();
    getImageryList();
    getInstitutionDetails();
    getInstitutionUserList();
  }, []);

  return (
    <>
      <SidebarTabs
        tabs={[
          { id: "projects", label: "Projects", icon: "projects", badge: safeLength(state.projectList) },
          { id: "imagery", label: "Imagery", icon: "imagery", badge: safeLength(state.imageryList) },
          { id: "users", label: "Users", icon: "users", badge: safeLength(state.usersList) },
        ]}
        onUpdateInstitution={updateInstitution}
        institutionName={state.institutionDetails.name}
        activeTab={state.selectedTab}
        onChange={setSelectedTab}
        institutionId={institutionId}
        isAdmin={state.isAdmin}
      />
      <div id="review-institution">
        {state.modal?.alert && (
          <Modal title={state.modal.alert.alertType} onClose={() => setModal(null)}>
            {state.modal.alert.alertMessage}
          </Modal>
        )}
        {state.modalMessage && <LoadingModal message={state.modalMessage} />}
      </div>
      <InstitutionDescription />
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
          institutionId={institutionId}
          imageryList={state.imageryList}
          editImagery={editImageryBulk}
          deleteImagery={deleteImageryBulk}
          isAdmin={state.isAdmin}
          getImageryList={getImageryList}
        />
      )}
      {state.selectedTab === "users" && (
        <UsersTab
          isAdmin={state.isAdmin}
          editUsersBulk={editUsersBulk}
          addUsersBulk={addUsersBulk}
          usersList={state.usersList} />
      )}
    </>
  )
};

export const InstitutionDescription = () => {
  const [state] = useAtom(institutionPageAtom);
  const institution = state?.institutionDetails || {};

  if (!institution?.description) return null;

  return (
    <div className="inst-desc-container">
      <div className="inst-desc-box">
        <div className="inst-desc-title">
          <span>Institution Description</span>
        </div>

        {institution.base64Image && (
          <div className="inst-desc-logo-wrapper">
            <img
              src={`data:image/png;base64,${institution.base64Image}`}
              alt="Institution logo"
              className="inst-desc-logo"
            />
          </div>
        )}
        <p className="inst-desc-text">{institution.description}</p>
      </div>
    </div>
  );
};

export const SidebarTabs = ({
  institutionId,
  tabs,
  activeTab,
  onChange,
  institutionName,
  onUpdateInstitution,
  isAdmin,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showUpdateInstitution, setShowUpdateInstitution] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".menu-container")) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSaveInstitution = (params) => {
    onUpdateInstitution(params);
    setShowUpdateInstitution(false);
  }

  const onCloseEditInstitution = () => {
    setShowUpdateInstitution(false);
  }

  return (
    <div className="sidebar-tabs">
      <div className="sidebar-header">
        <div className="sidebar-header-left">
          <SvgIcon icon="folder" size="1.2rem" />
          <span className="sidebar-title">{institutionName}</span>
        </div>

        {isAdmin && (
          <div className="menu-container">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="icon-button"
            >
              <SvgIcon icon="moreVert" size="1.2rem" />
            </button>

            {showMenu && (
              <div className="menu-dropdown">
                <button
                  className="menu-item"
                  onClick={() => {
                    setShowMenu(false);
                    setShowUpdateInstitution(true);
                  }}
                >
                  <SvgIcon icon="edit" size="1rem" />
                  Edit Institution
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    setShowMenu(false);
                    window.open(
                      `/institution-dashboard?institutionId=${institutionId}`
                    );
                  }}
                >
                  <SvgIcon icon="folder" size="1rem" />
                  View Institution Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`sidebar-tab ${isActive ? "active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {isActive && <div className="sidebar-tab-indicator" />}

            <div className="sidebar-tab-left">
              {tab.icon && <SvgIcon icon={tab.icon} size="1.2rem" />}
              <span className={`sidebar-tab-label ${isActive ? "bold" : ""}`}>
                {tab.label}
              </span>
            </div>

            {tab.badge > 0 && (
              <span className="sidebar-badge">{tab.badge}</span>
            )}
          </button>
        );
      })}
      
      {showUpdateInstitution &&
       createPortal(
         <EditInstitutionModal
           onClose={onCloseEditInstitution}
           onSave={onSaveInstitution}
         />,
         document.body
       )}
    </div>

  );
};

export const EditInstitutionModal = ({ onClose, onSave}) => {
  const [state] = useAtom(institutionPageAtom);
  const institution = state?.institutionDetails || {};
  const [name, setName] = useState(institution.name || "");
  const [url, setUrl] = useState(institution.url || "");
  const [logoName, setLogoName] = useState(institution.imageName || "");
  const [description, setDescription] = useState(institution.description || "");
  const [base64Image, setBase64Image] = useState(institution.base64Image || "");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setBase64Image(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const payload = {
      name,
      url,
      description,
      imageName: logoName,
      base64Image,
    };
    onSave(payload);
  };

  return (
    <Modal
      title="Edit Institution"
      closeText="Cancel"
      confirmText="Save Changes"
      onClose={onClose}
      onConfirm={handleSave}
    >
      <div className="p-2">
        <div className="mb-3">
          <label className="form-label">
            Name <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Institution Name"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">URL</label>
          <input
            type="text"
            className="form-control"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://example.com"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Logo</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input type="text" className="form-control" value={logoName} readOnly />
            <label
              className="btn btn-outline-secondary mb-0"
              style={{ whiteSpace: "nowrap" }}
            >
              Browse
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">
            Description <span style={{ color: "red" }}>*</span>
          </label>
          <textarea
            className="form-control"
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </Modal>
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

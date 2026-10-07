import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import InstitutionEditor from "./components/InstitutionEditor";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";
import { KBtoBase64Length } from "./utils/generalUtils";
import Modal from "./components/Modal";


function CreateInstitution () {
  const [newInstitutionDetails, setNewInstitutionDetails] = useState({
    name: "",
    base64Image: "",
    imageName: "",
    url: "",
    description: "",
    acceptTOS: false,
  });
  const [modal, setModal] = useState(null);

  function createInstitution () {
    if (newInstitutionDetails.base64Image.length > KBtoBase64Length(500)) {
      setModal({alert: {alertType: "Institution Creation Error", alertMessage: "Institution logos must be smaller than 500kb"}});
    } else if (newInstitutionDetails.name.length === 0) {
      setModal({alert: {alertType: "Institution Creation Error", alertMessage: "Institution must have a name."}});
    } else if (newInstitutionDetails.description.length === 0) {
      setModal({alert: {alertType: "Institution Creation Error", alertMessage: "Institution must have a description."}});
    } else if (!newInstitutionDetails.acceptTOS === true) {
      setModal({alert: {alertType: "Institution Creation Error", alertMessage: "Please accept the Terms of Service."}});
    } else {
      fetch("/create-institution", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newInstitutionDetails.name,
          base64Image: newInstitutionDetails.base64Image,
          imageName: newInstitutionDetails.imageName,
          url: newInstitutionDetails.url,
          description: newInstitutionDetails.description,
        }),
      })
        .then((response) => Promise.all([response.ok, response.json()]))
        .then((data) => {
          if (data[0] && Number.isInteger(data[1])) {
            window.location = `/review-institution?institutionId=${data[1]}`;
            return Promise.resolve();
          } else {
            return Promise.reject(data[1]);
          }
        })
        .catch((message) => setModal({alert: {alertType: "Institution Creation Error", alertMessage: "Error creating institution.\n\n" + message}}));
    }
  }
  
  function setInstitutionDetails (key, newValue) {
    setNewInstitutionDetails({
        ...newInstitutionDetails,
        [key]: newValue,
    });
  };

  function renderButtonGroup () {
    return (
      <input
        className="btn btn-outline-darkgreen btn-sm btn-block"
        id="create-institution"
        onClick={createInstitution}
        type="button"
        value="Create Institution"
      />
    );};

  return (
    <>
      <InstitutionEditor
        acceptTOS={newInstitutionDetails.acceptTOS}
        buttonGroup={renderButtonGroup}
        description={newInstitutionDetails.description}
        imageName={newInstitutionDetails.imageName}
        name={newInstitutionDetails.name}
        setInstitutionDetails={setInstitutionDetails}
        title="Create New Institution"
        url={newInstitutionDetails.url}
      />
      {modal?.alert &&
       <Modal title={modal.alert.alertType}
              onClose={()=>{setModal(null);}}>
         {modal.alert.alertMessage}
       </Modal>}
    </>
  );
}


export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumbs={[
          {display: "Create Institution",
           id: "create-institution"}]}
      />
      <CreateInstitution />
    </NavigationBar>,
    document.getElementById("app")
  );
}

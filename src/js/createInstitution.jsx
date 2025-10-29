import React from "react";
import ReactDOM from "react-dom";
import InstitutionEditor from "./components/InstitutionEditor";
import { NavigationBar, BreadCrumbs } from "./components/PageComponents";
import { KBtoBase64Length } from "./utils/generalUtils";
import Modal from "./components/Modal";

class CreateInstitution extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: null,
      newInstitutionDetails: {
        name: "",
        base64Image: "",
        imageName: "",
        url: "",
        description: "",
        acceptTOS: false,
      },
    };
  }

  createInstitution = () => {
    if (this.state.newInstitutionDetails.base64Image.length > KBtoBase64Length(500)) {
      this.setState ({modal: {alert: {alertType: "Institution Creation Error", alertMessage: "Institution logos must be smaller than 500kb"}}});
    } else if (this.state.newInstitutionDetails.name.length === 0) {
      this.setState ({modal: {alert: {alertType: "Institution Creation Error", alertMessage: "Institution must have a name."}}});
    } else if (this.state.newInstitutionDetails.description.length === 0) {
      this.setState ({modal: {alert: {alertType: "Institution Creation Error", alertMessage: "Institution must have a description."}}});
    } else if (!this.state.newInstitutionDetails.acceptTOS === true) {
      this.setState ({modal: {alert: {alertType: "Institution Creation Error", alertMessage: "Please accept the Terms of Service."}}});
    } else {
      fetch("/create-institution", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: this.state.newInstitutionDetails.name,
          base64Image: this.state.newInstitutionDetails.base64Image,
          imageName: this.state.newInstitutionDetails.imageName,
          url: this.state.newInstitutionDetails.url,
          description: this.state.newInstitutionDetails.description,
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
        .catch((message) => this.setState ({modal: {alert: {alertType: "Institution Creation Error", alertMessage: "Error creating institution.\n\n" + message}}}));
    }
  };

  setInstitutionDetails = (key, newValue) => {
    this.setState({
      newInstitutionDetails: {
        ...this.state.newInstitutionDetails,
        [key]: newValue,
      },
    });
  };

  renderButtonGroup = () => (
    <input
      className="btn btn-outline-lightgreen btn-sm btn-block"
      id="create-institution"
      onClick={this.createInstitution}
      type="button"
      value="Create Institution"
    />
  );

  render() {
    return (
      <>
      <InstitutionEditor
        acceptTOS={this.state.newInstitutionDetails.acceptTOS}
        buttonGroup={this.renderButtonGroup}
        description={this.state.newInstitutionDetails.description}
        imageName={this.state.newInstitutionDetails.imageName}
        name={this.state.newInstitutionDetails.name}
        setInstitutionDetails={this.setInstitutionDetails}
        title="Create New Institution"
        url={this.state.newInstitutionDetails.url}
      />
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}

      </>
    );
  }
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumb={{display: "Create Institution",
                id: "create-institution",
                onClick: (e)=>{
                  console.log("create institution");
                }}}
      />
      <CreateInstitution />
    </NavigationBar>,
    document.getElementById("app")
  );
}

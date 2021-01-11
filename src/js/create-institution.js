import React from "react";
import ReactDOM from "react-dom";
import InstitutionEditor from "./components/InstitutionEditor";
import {NavigationBar} from "./components/PageComponents";
import {KBtoBase64Length} from "./utils/generalUtils";

class CreateInstitution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            institutions: [],
            newInstitutionDetails: {
                name: "",
                base64Image: "",
                url: "",
                description: "",
            },
        };
    }

    componentDidMount() {
        this.getInstitutions();
    }

    getInstitutions = () => fetch("/get-all-institutions")
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => this.setState({institutions: data}))
        .catch(response => {
            console.log(response);
            alert("Error downloading institution list. See console for details.");
        });

    createInstitution = () => {
        const duplicateInst = this.state.institutions.find(inst => inst.name === this.state.newInstitutionDetails.name);
        if (duplicateInst) {
            alert("An institution with this name already exists. "
                + "Either select a different name or change the name of the duplicate institution here: "
                + window.location.origin + "/review-institution?institutionId=" + duplicateInst.id);
        } else if (this.state.newInstitutionDetails.base64Image.length > KBtoBase64Length(500)) {
            alert("Institution logos must be smaller than 500kb");
        } else {
            fetch("/create-institution",
                  {
                      method: "POST",
                      headers: {
                          "Accept": "application/json",
                          "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                          name: this.state.newInstitutionDetails.name,
                          base64Image: this.state.newInstitutionDetails.base64Image,
                          url: this.state.newInstitutionDetails.url,
                          description: this.state.newInstitutionDetails.description,
                      }),
                  }
            )
                .then(response => Promise.all([response.ok, response.json()]))
                .then(data => {
                    if (data[0] && Number.isInteger(data[1])) {
                        window.location = `/review-institution?institutionId=${data[1]}`;
                        return Promise.resolve();
                    } else {
                        return Promise.reject(data[1]);
                    }
                })
                .catch(message => alert("Error creating institution.\n\n" + message));
        }
    };

    setInstitutionDetails = (key, newValue) => {
        this.setState({
            newInstitutionDetails: {
                ...this.state.newInstitutionDetails, [key]: newValue,
            },
        });
    };

    renderButtonGroup = () =>
        <input
            id="create-institution"
            className="btn btn-outline-lightgreen btn-sm btn-block"
            type="button"
            value="Create Institution"
            onClick={this.createInstitution}
            disabled={this.state.newInstitutionDetails.name === "" || this.state.newInstitutionDetails.description === ""}
        />;

    render() {
        return (
            <InstitutionEditor
                title="Create New Institution"
                name={this.state.newInstitutionDetails.name}
                url={this.state.newInstitutionDetails.url}
                description={this.state.newInstitutionDetails.description}
                buttonGroup={this.renderButtonGroup}
                setInstitutionDetails={this.setInstitutionDetails}
            />
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <CreateInstitution />
        </NavigationBar>,
        document.getElementById("app")
    );
}

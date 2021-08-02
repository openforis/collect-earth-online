import React from "react";
import ReactDOM from "react-dom";
import InstitutionEditor from "./components/InstitutionEditor";
import {NavigationBar} from "./components/PageComponents";
import {KBtoBase64Length} from "./utils/generalUtils";

class CreateInstitution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newInstitutionDetails: {
                name: "",
                base64Image: "",
                url: "",
                description: "",
                acceptTOS: false
            }
        };
    }

    createInstitution = () => {
        if (this.state.newInstitutionDetails.base64Image.length > KBtoBase64Length(500)) {
            alert("Institution logos must be smaller than 500kb");
        } else {
            fetch("/create-institution",
                  {
                      method: "POST",
                      headers: {
                          "Accept": "application/json",
                          "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                          name: this.state.newInstitutionDetails.name,
                          base64Image: this.state.newInstitutionDetails.base64Image,
                          url: this.state.newInstitutionDetails.url,
                          description: this.state.newInstitutionDetails.description
                      })
                  })
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
                ...this.state.newInstitutionDetails, [key]: newValue
            }
        });
    };

    renderButtonGroup = () => (
        <input
            className="btn btn-outline-lightgreen btn-sm btn-block"
            disabled={this.state.newInstitutionDetails.name === ""
                || this.state.newInstitutionDetails.description === ""
                || this.state.newInstitutionDetails.acceptTOS === false}
            id="create-institution"
            onClick={this.createInstitution}
            type="button"
            value="Create Institution"
        />
    );

    render() {
        return (
            <InstitutionEditor
                acceptTOS={this.state.newInstitutionDetails.acceptTOS}
                buttonGroup={this.renderButtonGroup}
                description={this.state.newInstitutionDetails.description}
                name={this.state.newInstitutionDetails.name}
                setInstitutionDetails={this.setInstitutionDetails}
                title="Create New Institution"
                url={this.state.newInstitutionDetails.url}
            />
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar
            userId={args.userId}
            userName={args.userName}
            version={args.version}
        >
            <CreateInstitution/>
        </NavigationBar>,
        document.getElementById("app")
    );
}

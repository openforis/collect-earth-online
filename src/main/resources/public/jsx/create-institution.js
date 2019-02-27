import React from "react";
import ReactDOM from "react-dom";
import InstitutionEditor from "./components/InstitutionEditor";

class CreateInstitution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newInstitutionDetails: {
                name: "",
                logo: "",
                base64Image: "",
                url: "",
                description: "",
            },
        };
    }

    createInstitution = () => {
        fetch(this.props.documentRoot + "/create-institution",
              {
                  method: "POST",
                  body: JSON.stringify({
                      userId: this.props.userId,
                      name: this.state.newInstitutionDetails.name,
                      logo: this.state.newInstitutionDetails.logo,
                      base64Image: this.state.newInstitutionDetails.base64Image,
                      url: this.state.newInstitutionDetails.url,
                      description: this.state.newInstitutionDetails.description,
                  }),
              })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    return new Promise((resolve, reject) => reject(response));
                }
            })
            .then(data => window.location = this.props.documentRoot + "/review-institution/" + data.id)
            .catch(response => {
                console.log(response);
                alert("Error creating institution. See console for details.");
            });
    }

    setInstitutionDetails = (key, newValue) => this.setState({
        newInstitutionDetails: {
            ...this.state.newInstitutionDetails, [key]: newValue,
        },
    });

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
                instTitle="Create New Institution"
                name={this.state.newInstitutionDetails.name}
                logo={this.state.newInstitutionDetails.logo}
                url={this.state.newInstitutionDetails.url}
                description={this.state.newInstitutionDetails.description}
                buttonGroup={this.renderButtonGroup}
                setInstitutionDetails={this.setInstitutionDetails}
            />
        );
    }
}

export function renderCreateInstitutionPage(args) {
    ReactDOM.render(
        <CreateInstitution
            documentRoot={args.documentRoot}
            userId={args.userId === "" ? -1 : parseInt(args.userId)}
        />,
        document.getElementById("institution")
    );
}

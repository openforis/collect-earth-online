import React from "react";
import ReactDOM from "react-dom";
import InstitutionEditor from "./components/InstitutionEditor";

class CreateInstitution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            institutions: [],
            newInstitutionDetails: {
                name: "",
                logo: "",
                base64Image: "",
                url: "",
                description: "",
            },
        };
    }

    componentDidMount() {
        this.getInstitutions();
    }

    getInstitutions = () => fetch(this.props.documentRoot + "/get-all-institutions")
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => this.setState({ institutions: data }))
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
        } else {
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
                  }
            )
                .then(response => response.ok ? response.text() : Promise.reject(response.text()))
                .then(data => {
                    const isInteger = n => !isNaN(parseInt(n)) && isFinite(n) && !n.includes(".");
                    if (isInteger(data)) {
                        window.location = this.props.documentRoot + "/review-institution?intitutionId" + data;
                        return Promise.resolve();
                    } else {
                        return Promise.reject(data);
                    }
                })
                .catch(response => {
                    console.log(response);
                    alert("Error creating institution. See console for details.");
                });
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

import React from "react";
import ReactDOM from "react-dom";
import InstitutionEditor from "./components/InstitutionEditor";

class CreateInstitution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: "",
            logo: "",
            url: "",
            description: "",
        };
    }

    createInstitution = () => {
        const formData = new FormData();
        formData.append("userid", this.props.userId);
        formData.append("institution-name", this.state.name);
        formData.append("institution-logo", this.state.logo);
        formData.append("institution-url", this.state.details.url);
        formData.append("institution-description", this.state.description);
        fetch(this.props.documentRoot + "/create-institution",
            {
                method: "POST",
                body: formData,
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.log(response);
                alert("Error creating institution. See console for details.");
                return new Promise.reject("Error creating instituion");
            }
        })
        .then(data => window.location = this.props.documentRoot + "/review-institution/" + data);
    }

    setInstituionDetails = (key, newValue) => this.setState({ [key]: newValue })

    reanderButtonGroup = () => {
        <input
            id="create-institution"
            className="btn btn-outline-lightgreen btn-sm btn-block"
            type="button"
            name="create-institution"
            value="Create Institution"
            onClick={this.createInstitution}
            disabled={this.state.name === "" && this.state.description === ""}
        />;
    }

    render() {
        return (
            <InstitutionEditor
                title="Create New Institution"
                name={this.state.name}
                logo={this.state.logo}
                url={this.state.url}
                description={this.state.description}
                buttonGroup={this.buttonGroup}
                setInstituionDetails={this.setInstituionDetails}
            />
        );
    }
}

export function renderCreateInstitutionPage(args) {
    ReactDOM.render(
        <CreateInstitution
            documentRoot={args.documentRoot}
            userId={args.userId}
        />,
        document.getElementById("institution")
    );
}

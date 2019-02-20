import React from "react";
import ReactDOM from "react-dom";
import InstitutionEditor from "./components/InstitutionEditor";

class CreateInstitution extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: "",
            logo: "",
            base64Image: "",
            url: "",
            description: "",
        };
    }

    createInstitution = () => {
        fetch(this.props.documentRoot + "/create-institution",
            {
                method: "POST",
                body: JSON.stringify({
                    userId: this.props.userId,
                    name: this.state.name,
                    logo: this.state.logo,
                    base64Image: this.state.base64Image,
                    url: this.state.url,
                    description: this.state.description,
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

    setInstituionDetails = (key, newValue) => this.setState({ [key]: newValue })

    reanderButtonGroup = () =>
        <input
            id="create-institution"
            className="btn btn-outline-lightgreen btn-sm btn-block"
            type="button"
            value="Create Institution"
            onClick={this.createInstitution}
            disabled={this.state.name === "" || this.state.description === ""}
        />;

    render() {
        return (
            <InstitutionEditor
                instTitle="Create New Institution"
                name={this.state.name}
                logo={this.state.logo}
                url={this.state.url}
                description={this.state.description}
                buttonGroup={this.reanderButtonGroup}
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

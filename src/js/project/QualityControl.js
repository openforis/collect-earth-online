import React from "react";

import {ProjectContext} from "./constants";
import {Select} from "../components/Select";

export default class QualityControl extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedUser: null
        };
    }

    getAssignment = () => this.context.designSettings["qaqc-assignment"];

    setAssignment = newAssignment => {
        const {"qaqc-assignment": assignment} = this.context.designSettings;
        this.context.setProjectDetails({
            designSettings: {...this.context.designSettings, "qaqc-assignment": Object.assign(assignment, newAssignment)}
        });
    };

    setMethod = method => this.setAssignment({"qaqc-method": method});

    setPercent = percent => this.setAssignment({percent});

    addSME = sme => {
        const {smes} = this.getAssignment();
        this.setAssignment({smes: [...smes, sme[0]]});
    };

    removeSME = sme => {
        const {smes} = this.getAssignment();
        this.setAssignment({smes: smes.filter(s => s !== sme)});
    };

    renderUsers = users => (
        <div className="d-flex flex-column mt-3">
            {users.map(user => (
                <div key={user.id} className="d-flex justify-content-end">
                    <div
                        style={{
                            background: "white",
                            border: "1px solid #ced4da",
                            borderRadius: ".25rem",
                            fontSize: ".875rem",
                            padding: ".25rem .5rem"
                        }}
                    >
                        {user.email}
                    </div>
                    <button
                        className="btn btn-sm btn-danger mx-2"
                        onClick={() => this.removeSME(user.id)}
                        title={`Remove ${user.email}`}
                        type="button"
                    >
                        -
                    </button>
                </div>
            ))}
        </div>
    );

    render() {
        const qualityMethods = [
            ["none", "None"],
            ["overlap", "Overlap"],
            ["sme", "SME Verification"]
        ];
        const {"qaqc-method": method, percent, smes} = this.getAssignment();
        const {allUsers} = this.props;
        const assignedSMEs = smes.map(id => ({id, email: allUsers[id]}));
        const possibleSMEs = Object.keys(allUsers)
            .map(id => [parseInt(id), allUsers[id]])
            .filter(u => !smes.includes(u[0]));

        return (
            <div className="ml-3">
                <h3 className="mb-3">Quality Control</h3>
                <div className="d-flex">
                    <Select
                        id="quality-mode"
                        label="Quality Mode"
                        onChange={e => this.setMethod(e.target.value)}
                        options={qualityMethods}
                        value={method || "none"}
                    />
                </div>
                {method !== "none" && (
                    <div className="d-flex mt-3">
                        <label htmlFor="percent">Percent:</label>
                        <div className="d-flex mx-3">
                            <input
                                id="percent"
                                max="100"
                                min="0"
                                onChange={e => this.setPercent(parseInt(e.target.value))}
                                type="range"
                                value={percent}
                            />
                            <div style={{fontSize: "0.9rem", margin: "0.25rem 1rem"}}>
                                {percent}%
                            </div>
                        </div>
                    </div>
                )}
                {method === "sme" && (
                    <div className="mt-3">
                        <div className="d-flex">
                            <Select
                                disabled={possibleSMEs.length === 0}
                                id="assigned-smes"
                                label="Assigned SMEs"
                                onChange={e => this.setState({selectedUser: e.target.value})}
                                options={possibleSMEs.length ? possibleSMEs : ["No Users to Assign"]}
                            />
                            <button
                                className="btn btn-sm btn-success mx-2"
                                disabled={possibleSMEs.length === 0}
                                onClick={() => this.addSME(this.state.selectedUser || possibleSMEs[0])}
                                title="Add User"
                                type="button"
                            >
                                +
                            </button>
                        </div>
                        {this.renderUsers(assignedSMEs)}
                    </div>
                )}
            </div>
        );
    }
}

QualityControl.contextType = ProjectContext;

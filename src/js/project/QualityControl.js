import React from "react";

import {ProjectContext} from "./constants";
import Select from "../components/Select";
import UserSelect from "../components/UserSelect";
import {formatNumberWithCommas} from "../utils/generalUtils";
import {ButtonSvgIcon} from "../components/SvgIcon";

export default class QualityControl extends React.Component {
    getAssignment = () => this.context.designSettings.qaqcAssignment;

    getUserAssignment = () => this.context.designSettings.userAssignment;

    setAssignment = newAssignment => {
        const assignment = this.getAssignment();
        this.context.setProjectDetails({
            designSettings: {...this.context.designSettings, qaqcAssignment: {...assignment, ...newAssignment}}
        });
    };

    setMethod = qaqcMethod => this.setAssignment({qaqcMethod});

    setPercent = percent => this.setAssignment({percent});

    setTimesToReview = timesToReview => this.setAssignment({timesToReview});

    addSME = id => {
        const {smes} = this.getAssignment();
        this.setAssignment({smes: [...smes, id]});
    };

    removeSME = id => {
        const {smes} = this.getAssignment();
        this.setAssignment({smes: smes.filter(s => s !== id)});
    };

    renderAssignedSMEs = assignedSMEs => (
        <div>
            {assignedSMEs.map(({id, email}) => (
                <div key={id} className="form-row mt-1">
                    <div className="col-6 offset-5">
                        <div
                            style={{
                                background: "white",
                                border: "1px solid #ced4da",
                                borderRadius: ".25rem",
                                fontSize: ".875rem",
                                overflow: "hidden",
                                padding: ".25rem .5rem",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                            }}
                        >
                            {email}
                        </div>
                    </div>
                    <div className="col-1">
                        <button
                            className="btn btn-sm btn-danger"
                            onClick={() => this.removeSME(id)}
                            title={`Remove ${email}`}
                            type="button"
                        >
                            <ButtonSvgIcon icon="minus" size="0.9rem"/>
                        </button>
                    </div>
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
        const {qaqcMethod, percent, smes, timesToReview} = this.getAssignment();
        const {userMethod, users} = this.getUserAssignment();
        const {allowDrawnSamples} = this.context;
        const {institutionUserList, totalPlots} = this.props;
        const possibleSMEs = [
            {id: -1, email: "Select user..."},
            ...institutionUserList.filter(u => !users.includes(u.id) && !smes.includes(u.id))
        ];
        const assignedSMEs = institutionUserList.filter(({id}) => smes.includes(id));
        const plotsToReview = Math.round(totalPlots * (percent / 100));
        const plotsPerSME = Math.round(plotsToReview / smes.length);

        return (
            <div className="col-6">
                <h3 className="mb-3">Quality Control</h3>
                <div className="form-row">
                    <Select
                        disabled={allowDrawnSamples || userMethod === "none"}
                        id="quality-mode"
                        label="Quality Mode"
                        onChange={e => this.setMethod(e.target.value)}
                        options={qualityMethods}
                        value={qaqcMethod}
                    />
                </div>
                <p className="font-italic ml-2 mt-2 small">
                  - SME: Subject Matter Expert
                </p>
                {allowDrawnSamples ? (
                    <p className="font-italic mt-2 small">
                        When User-Drawn samples are enabled, the project cannot support Quality Control of plots.
                        Disable User-Drawn samples to re-enable Quality Control.
                    </p>
                ) : userMethod === "none" && (
                    <p className="font-italic mt-2 small">
                        Please assign users to enable Quality Control.
                    </p>

                )}
                {qaqcMethod !== "none" && (
                    <>
                        <div className="form-row mt-3">
                            <label className="col-5" htmlFor="percent">Percent:</label>
                            <div className="col-5 d-flex align-items-center">
                                <input
                                    className="form-control"
                                    id="percent"
                                    max="100"
                                    min="0"
                                    onChange={e => this.setPercent(parseInt(e.target.value))}
                                    steps="5"
                                    type="range"
                                    value={percent}
                                />
                                <div style={{fontSize: "0.9rem", marginLeft: "0.5rem"}}>
                                    {percent}%
                                </div>
                            </div>
                        </div>
                        <p className="font-italic ml-2 small">
                            - Percent of each users plots to review
                        </p>
                    </>
                )}
                {qaqcMethod === "overlap" && (
                    <>
                        <div className="form-row mt-3">
                            <label className="col-5" htmlFor="reviews"># of Reviews:</label>
                            <input
                                className="col-5 form-control form-control-sm"
                                id="reviews"
                                max="100"
                                min="2"
                                onChange={e => this.setTimesToReview(parseInt(e.target.value))}
                                type="number"
                                value={timesToReview}
                            />
                        </div>
                        <p className="font-italic ml-2 mt-2 small">
                            - Plots to review: {formatNumberWithCommas(plotsToReview)}
                        </p>
                    </>
                )}

                {qaqcMethod === "sme" && (
                    <>
                        <UserSelect
                            addUser={this.addSME}
                            id="assigned-smes"
                            label="Assigned SMEs"
                            possibleUsers={possibleSMEs}
                        />
                        {this.renderAssignedSMEs(assignedSMEs)}
                        {smes.length > 0 && (
                            <p className="font-italic ml-2 mt-2 small">
                                - Each SME will review ~{formatNumberWithCommas(plotsPerSME)} plots
                            </p>
                        )}
                    </>
                )}
            </div>
        );
    }
}

QualityControl.contextType = ProjectContext;

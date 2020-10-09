import React from "react";

import {capitalizeFirst} from "../utils/generalUtils";
import {ProjectContext} from "./constants";

export function Overview(props) {
    return (
        <ProjectContext.Consumer>
            {({
                name,
                description,
                privacyLevel,
                setProjectState,
                projectOptions,
                projectOptions: {showGEEScript, showPlotInformation, autoLaunchGeoDash},
                projectId,
            }) =>
                <div id="project-info">
                    {projectId < 0 && <ProjectTemplateSelection {...props}/>}
                    <div className="form-group">
                        <h3 htmlFor="project-name">Name</h3>
                        <input
                            className="form-control form-control-sm"
                            type="text"
                            value={name}
                            onChange={e => setProjectState({name: e.target.value})}
                        />
                    </div>
                    <div className="form-group">
                        <h3 htmlFor="project-description">Description</h3>
                        <textarea
                            className="form-control form-control-sm"
                            value={description}
                            onChange={e => setProjectState({description: e.target.value})}
                        />
                    </div>
                    <h3>Availability</h3>
                    <div id="project-visibility" className="mb-3">
                        <div className="form-check form-check-inline">
                            <input
                                id="privacy-public"
                                className="form-check-input"
                                type="radio"
                                checked={privacyLevel === "public"}
                                onChange={() => setProjectState({privacyLevel: "public"})}
                            />
                            <label
                                className="form-check-label"
                                htmlFor="privacy-public"
                                title="All users including those who are not logged in"
                            >
                                Public: <i>All</i>
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                id="privacy-users"
                                className="form-check-input"
                                type="radio"
                                checked={privacyLevel === "users"}
                                onChange={() => setProjectState({privacyLevel: "users"})}
                            />
                            <label className="form-check-label" htmlFor="privacy-users">
                                Users: <i>Logged In Users</i>
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                id="privacy-institution"
                                className="form-check-input"
                                type="radio"
                                onChange={() => setProjectState({privacyLevel: "institution"})}
                                checked={privacyLevel === "institution"}
                            />
                            <label className="form-check-label" htmlFor="privacy-institution">
                                Institution: <i>Group Members</i>
                            </label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input
                                id="privacy-private"
                                className="form-check-input"
                                type="radio"
                                onChange={() => setProjectState({privacyLevel: "private"})}
                                checked={privacyLevel === "private"}
                            />
                            <label className="form-check-label" htmlFor="privacy-private">
                                Private: <i>Group Admins</i>
                            </label>
                        </div>
                        <p id="privacy-level-text" className="font-italic ml-2 small">
                            {(privacyLevel === "public" || privacyLevel === "users") &&
                                    "**Public imagery will be visible to all users, and institution imagery will only be available"
                                    + "to the users in this institution."
                            }
                        </p>
                    </div>
                    <h3>Project Options</h3>
                    <div className="form-check">
                        <input
                            id="showGEEScript"
                            type="checkbox"
                            className="form-check-input"
                            checked={showGEEScript}
                            onChange={() => setProjectState({
                                projectOptions: {...projectOptions, showGEEScript: !showGEEScript},
                            })}
                        />
                        <label htmlFor="showGEEScript" className="form-check-label">
                            Show GEE Script link on Collection Page
                        </label>
                    </div>
                    <div className="form-check">
                        <input
                            id="showPlotInformation"
                            className="form-check-input"
                            type="checkbox"
                            checked={showPlotInformation}
                            onChange={() => setProjectState({
                                projectOptions: {...projectOptions, showPlotInformation: !showPlotInformation},
                            })}
                        />
                        <label htmlFor="showPlotInformation" className="form-check-label">
                            Show Extra Plot Columns on Collection Page
                        </label>
                    </div>
                    <div className="form-check">
                        <input
                            id="autoLaunchGeoDash"
                            className="form-check-input"
                            type="checkbox"
                            checked={autoLaunchGeoDash}
                            onChange={() => setProjectState({
                                projectOptions: {...projectOptions, autoLaunchGeoDash: !autoLaunchGeoDash},
                            })}
                        />
                        <label htmlFor="autoLaunchGeoDash" className="form-check-label">
                            Auto-launch Geo-Dash
                        </label>
                    </div>
                </div>
            }
        </ProjectContext.Consumer>
    );
}

class ProjectTemplateSelection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectFilter: "",
            selectedTemplateProjectId: -1,
        };
    }

    render() {
        const {
            templateProjectId,
            useTemplateWidgets,
            useTemplatePlots,
            setProjectState,
        } = this.context;
        const {
            setProjectTemplate,
            clearTemplateSelection,
            templateProjectList,
        } = this.props;
        return (
            <div id="project-template-selector">
                <div>
                    <div className="d-flex align-items-end justify-content-between ">
                        <div className="form-group">
                            <h3 htmlFor="project-filter">Template Filter (Name or ID)</h3>
                            <input
                                className="form-control form-control-sm"
                                id="project-filter"
                                type="text"
                                value={this.state.projectFilter}
                                onChange={e => this.setState({projectFilter: e.target.value})}
                            />
                        </div>
                        <div className="form-group mx-3" style={{flex: "1 1 auto"}}>
                            <h3 htmlFor="project-template">Select Template</h3>
                            <select
                                className="form-control-sm form-control"
                                style={{height: "calc(1.5em + .5rem + 2px)"}}
                                id="project-template"
                                size="1"
                                value={this.state.selectedTemplateProjectId}
                                onChange={e => this.setState({selectedTemplateProjectId: parseInt(e.target.value)})}
                            >
                                {templateProjectList
                                    && templateProjectList[0].id > 0
                                    && <option key={-1} value={-1}>- Select Project -</option>
                                }
                                {templateProjectList && templateProjectList
                                    .filter(proj => (proj.id + proj.name.toLocaleLowerCase())
                                        .includes(this.state.projectFilter.toLocaleLowerCase()))
                                    .map((proj, uid) => <option key={uid} value={proj.id}>{proj.id} - {proj.name}</option>)
                                }
                            </select>
                        </div>
                        <span className="form-group">
                            <input
                                type="button"
                                className="btn bg-lightgreen mr-1"
                                style={{height: "calc(1.5em + .5rem + 2px)", padding: "0 .5rem"}}
                                value="Load"
                                disabled={this.state.selectedTemplateProjectId < 0}
                                onClick={() => setProjectTemplate(this.state.selectedTemplateProjectId)}
                            />
                            <input
                                type="button"
                                className="btn bg-lightgreen"
                                style={{height: "calc(1.5em + .5rem + 2px)", padding: "0 .5rem"}}
                                value="Clear"
                                onClick={clearTemplateSelection}
                            />
                        </span>
                    </div>
                    {templateProjectId > 0 &&
                        <div className="pb-2">
                            <h3 className="mb-1" htmlFor="project-template">Copy Options</h3>
                            <div className="d-flex">
                                <div className="form-check form-check-inline">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="use-template-plots"
                                        onChange={this.props.toggleTemplatePlots}
                                        checked={useTemplatePlots}
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor="use-template-plots"
                                    >
                                        Copy Template Plots and Samples
                                    </label>
                                </div>
                                <div className="form-check form-check-inline mt-1">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="use-template-widgets"
                                        onChange={() => setProjectState({useTemplateWidgets: !useTemplateWidgets})}
                                        checked={useTemplateWidgets}
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor="use-template-widgets"
                                    >
                                        Copy Template Widgets
                                    </label>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </div>
        );
    }
}
ProjectTemplateSelection.contextType = ProjectContext;

export function OverviewReview() {
    return (
        <ProjectContext.Consumer>
            {context =>
                <div className="d-flex flex-column">
                    <label><b>Name:</b> {context.name}</label>
                    <label><b>Description:</b> {context.description}</label>
                    <label><b>Visibility:</b> {capitalizeFirst(context.privacyLevel)}</label>
                    <label className="font-weight-bold">Project Options:</label>
                    <ul>
                        <li>
                            <b>{context.projectOptions.showGEEScript ? "Show " : "Don't Show "}</b>
                            GEE Script link on Collection Page
                        </li>
                        <li>
                            <b>{context.projectOptions.showPlotInformation ? "Show " : "Don't Show "}</b>
                            Extra Plot Columns on Collection Page
                        </li>
                        <li>
                            <b>{context.projectOptions.autoLaunchGeoDash ? "Auto-launch " : "Don't Auto-launch "}</b>
                            Geo-Dash Window
                        </li>
                    </ul>
                </div>
            }
        </ProjectContext.Consumer>
    );
}

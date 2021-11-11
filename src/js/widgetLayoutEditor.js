import "../css/geo-dash.css";

import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";
import RGL, {WidthProvider} from "react-grid-layout";

import CopyDialog from "./geodash/CopyDialog";
import DegradationDesigner from "./geodash/DegradationDesigner";
import DualImageryDesigner from "./geodash/DualImageryDesigner";
import GeoDashModal from "./geodash/GeoDashModal";
import GeoDashNavigationBar from "./geodash/GeoDashNavigationBar";
import ImageAssetDesigner from "./geodash/ImageAssetDesigner";
import ImageCollectionAssetDesigner from "./geodash/ImageCollectionAssetDesigner";
import ImageElevationDesigner from "./geodash/ImageElevationDesigner";
import StatsDesigner from "./geodash/StatsDesigner";
import TimeSeriesDesigner from "./geodash/TimeSeriesDesigner";
import PolygonDesigner from "./geodash/PolygonDesigner";
import PreImageCollectionDesigner from "./geodash/PreImageCollectionDesigner";

import {EditorContext, graphWidgetList, mapWidgetList} from "./geodash/constants";

const ReactGridLayout = WidthProvider(RGL);

class WidgetLayoutEditor extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            // Page state
            widgets: [],
            imagery: [],
            basemapId: -1,
            projectTemplateList: [],
            // Widget specific state
            type: "-1",
            title: "",
            widgetDesign: {}
        };

        this.widgetTypes = {
            degradationTool: {
                title: "Degradation Tool",
                WidgetDesigner: DegradationDesigner
            },
            dualImagery: {
                title: "Dual Imagery",
                WidgetDesigner: DualImageryDesigner
            },
            imageAsset: {
                title: "Image Asset",
                WidgetDesigner: ImageAssetDesigner
            },
            imageCollectionAsset: {
                title: "Image Collection Asset",
                WidgetDesigner: ImageCollectionAssetDesigner
            },
            polygonCompare: {
                title: "Polygon Compare",
                WidgetDesigner: PolygonDesigner
            },
            preImageCollection: {
                title: "Preloaded Image Collections",
                WidgetDesigner: PreImageCollectionDesigner
            },
            imageElevation: {
                title: "SRTM Digital Elevation Data 30m",
                WidgetDesigner: ImageElevationDesigner
            },
            statistics: {
                title: "Statistics",
                WidgetDesigner: StatsDesigner
            },
            timeSeries: {
                title: "Time Series Graph",
                WidgetDesigner: TimeSeriesDesigner
            }
        };
    }

    /// Lifecycle

    componentDidMount() {
        this.fetchProject();
        this.getInstitutionImagery();
        this.getProjectTemplateList();
    }

    /// API Calls

    fetchProject = () => fetch(`/geo-dash/get-project-widgets?projectId=${this.props.projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => this.setState({widgets: data}))
        .catch(error => {
            console.error(error);
            alert("Error downloading the widget list. See console for details.");
        });

    getInstitutionImagery = () => {
        fetch(`/get-institution-imagery?institutionId=${this.props.institutionId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                this.setState({
                    imagery: data,
                    basemapId: data[0].id
                });
            })
            .catch(error => {
                console.error(error);
                alert("Error downloading the imagery list. See console for details.");
            });
    };

    getProjectTemplateList = () => {
        fetch("/get-template-projects")
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({projectTemplateList: data}))
            .catch(error => console.error(error));
    };

    getBandsFromGateway = (assetName, assetType, callback) => {
        if (assetName && assetName !== "") {
            const postObject = {
                path: "getAvailableBands",
                assetName,
                assetType
            };
            fetch("/geo-dash/gateway-request", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(postObject)
            })
                .then(res => (res.ok ? res.json() : Promise.reject()))
                .then(data => {
                    if (data.hasOwnProperty("bands")) {
                        callback(data.bands);
                    } else if (data.hasOwnProperty("errMsg")) {
                        callback(data.errMsg);
                    } else {
                        callback(null);
                    }
                })
                .catch(error => {
                    console.error(error);
                    callback(null);
                });
        }
    };

    serveItUp = (route, widget) => {
        fetch(
            `/geo-dash/${route}`,
            {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    projectId: this.props.projectId,
                    widgetJSON: JSON.stringify(widget)
                })
            }
        )
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({widgets: data}))
            .catch(error => {
                console.error(error);
                alert("Error loading updating widgets. See console for details.");
            });
    };

    deleteWidgetFromServer = widget => {
        this.serveItUp("delete-widget", widget);
    };

    copyProjectWidgets = templateId => {
        fetch(
            "/geo-dash/copy-project-widgets",
            {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    projectId: this.props.projectId,
                    templateId
                })
            }
        )
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({widgets: data}))
            .catch(error => {
                console.error(error);
                alert("Error loading template widgets. See console for details.");
            });
    };

    /// State

    resetWidgetDesign = () => {
        this.setState({
            type: "-1",
            title: "",
            widgetDesign: {}
        });
    };

    // TODO, add middleware conditions
    // type change
    // -  reset bands?
    setWidgetDesign = (dataKey, val) => {
        this.setState({widgetDesign: {...this.state.widgetDesign, [dataKey]: val}});
    };

    updateTitle = newTitle => {
        this.setState({title: newTitle});
    };

    updateType = newType => this.setState({
        type: newType,
        title: "",
        widgetDesign: {}
    });

    cancelNewWidget = () => {
        this.props.closeDialogs();
        this.resetWidgetDesign();
    };

    generateNewWidget = () => {
        const {title: name, type, widgetDesign, basemapId} = this.state;
        const maxY = Math.max(...this.state.widgets.map(o => (o.layout.y || 0)));
        const yval = maxY > -1 ? maxY + 1 : 0; // This yval add the new widget to the bottom
        const baseWidget = {
            type,
            name,
            layout:{
                x: 0,
                y: yval,
                w: 3,
                h: 1
            }
        };
        // FIXME, keep widgetDesign as its own key
        // FIXME, potential reduction in this logic if we save the parse visParams when checking.

        // Base widget + widget design
        if (["statistics", "timeSeries"].includes(type)) {
            return {
                ...baseWidget,
                ...widgetDesign
            };
        // Base widget + basemap + widget design
        } else if (["degradationTool", "preImageCollection", "dualImagery"].includes(type)) {
            return {
                ...baseWidget,
                basemapId,
                ...widgetDesign
            };
        // Base widget + widget design, vixParams parsed
        } else if (["imageAsset", "imageElevation"].includes(type)) {
            const {visParams} = widgetDesign;
            return {
                ...baseWidget,
                ...widgetDesign,
                visParams: JSON.parse(visParams || "{}")
            };
        // Base widget + basemap + widget design, vixParams parsed
        } else if (["polygonCompare", "imageCollectionAsset"].includes(type)) {
            const {visParams} = widgetDesign;
            return {
                ...baseWidget,
                basemapId,
                ...widgetDesign,
                visParams: JSON.parse(visParams || "{}")
            };
        } else {
            return null;
        }
    };

    createNewWidget = () => {
        // FIXME, verify widget design first
        const newWidget = this.generateNewWidget();
        if (newWidget) {
            fetch(
                "/geo-dash/create-widget",
                {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        projectId: this.props.projectId,
                        widgetJSON: JSON.stringify(newWidget)
                    })
                }
            )
                .then(response => (response.ok ? response.json() : Promise.reject(response)))
                .then(data => {
                    this.setState({
                        widgets: data
                    });
                    this.props.closeDialogs();
                    this.resetWidgetDesign();
                })
                .catch(error => {
                    console.error(error);
                    alert("Error creating widget. See console for details.");
                });
        } else {
            alert("Invalid selection, unable to generate new widget.");
        }
    };

    /// ReactGridLayout

    removeLayoutItem = widgetId => {
        const {widgets} = this.state;
        const removedWidget = widgets.find(w => w.id === parseInt(widgetId));
        this.deleteWidgetFromServer(removedWidget);
    };

    sameLayout = (layout1, layout2) => layout1.x === layout2.x
        && layout1.y === layout2.y
        && layout1.h === layout2.h
        && layout1.w === layout2.w;

    onLayoutChange = layout => this.state.widgets.forEach((stateWidget, idx) => {
        if (!this.sameLayout(stateWidget.layout, layout[idx])) {
            const {x, y, h, w} = layout[idx];
            const newWidget = {...stateWidget, layout: {x, y, h, w}};
            this.serveItUp("update-widget", newWidget);
        }
    });

    /// Render

    getImageByType = widgetType => {
        if (widgetType === "statistics") {
            return "/img/geodash/statssample.gif";
        } else if (widgetType === "degradationTool") {
            return "/img/geodash/degsample.gif";
        } else if (mapWidgetList.includes(widgetType)) {
            return "/img/geodash/mapsample.gif";
        } else if (graphWidgetList.includes(widgetType)) {
            return "/img/geodash/graphsample.gif";
        } else {
            return "";
        }
    };

    // Create new widget main form

    dialogButtons = () => (
        <>
            <button
                className="btn btn-secondary"
                data-dismiss="modal"
                onClick={this.cancelNewWidget}
                type="button"
            >
                Cancel
            </button>
            <button
                className="btn btn-primary"
                onClick={this.createNewWidget}
                type="button"
            >
                Create
            </button>
        </>
    );

    dialogBody = () => {
        const {WidgetDesigner} = this.widgetTypes[this.state.type] || {};
        console.log(this.widgetTypes[this.state.type]);
        return (
            <form>
                <div className="form-group">
                    <label htmlFor="widgetTypeSelect">Widget Type</label>
                    <select
                        className="form-control"
                        id="widgetTypeSelect"
                        name="widgetTypeSelect"
                        onChange={e => this.updateType(e.target.value)}
                        value={this.state.type}
                    >
                        <option value="-1">Please select type</option>
                        {_.map(this.widgetTypes,
                               ({title}, key) => (
                                   <option key={key} value={key}>{title}</option>
                               ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="widgetTitle">Title</label>
                    <input
                        className="form-control"
                        id="widgetTitle"
                        name="widgetTitle"
                        onChange={e => this.updateTitle(e.target.value)}
                        placeholder="Enter title"
                        type="text"
                        value={this.state.title}
                    />
                </div>
                {WidgetDesigner && <WidgetDesigner/>}
            </form>
        );
    };

    render() {
        const {widgets, projectTemplateList} = this.state;
        const {addDialog, copyDialog, closeDialogs} = this.props;
        return (
            <EditorContext.Provider
                value={{
                    projectId: this.props.projectId,
                    institutionId: this.props.institutionId,
                    setWidgetDesign: this.setWidgetDesign,
                    widgetDesign: this.state.widgetDesign,
                    imagery: this.state.imagery,
                    getInstitutionImagery: this.getInstitutionImagery,
                    getBandsFromGateway: this.getBandsFromGateway
                }}
            >
                <div>
                    {addDialog && (
                        <GeoDashModal
                            body={this.dialogBody()}
                            closeDialogs={this.props.closeDialogs}
                            footer={this.dialogButtons()}
                            title="Create Widget"
                        />
                    )}
                    {copyDialog && (
                        <CopyDialog
                            closeDialogs={closeDialogs}
                            copyProjectWidgets={this.copyProjectWidgets}
                            projectTemplateList={projectTemplateList}
                        />
                    )}
                    <ReactGridLayout
                        cols={12}
                        isDraggable
                        isResizable
                        onLayoutChange={this.onLayoutChange}
                        rowHeight={300}
                    >
                        {widgets.map(widget => (
                            <div
                                key={widget.id}
                                data-grid={{...widget.layout, minW: 3, w: Math.max(widget.layout.w, 3)}}
                                style={{
                                    backgroundImage: "url(" + this.getImageByType(widget.type) + ")",
                                    backgroundSize: "cover"
                                }}
                            >
                                <h3
                                    className="px-2 d-flex justify-content-between"
                                    style={{
                                        backgroundColor: "#31bab0",
                                        color: "white",
                                        lineHeight:" 26px",
                                        minHeight: "26px"
                                    }}
                                >
                                    {widget.name}
                                    <div
                                        onClick={() => this.removeLayoutItem(widget.id)}
                                        style={{cursor: "pointer"}}
                                    >
                                        X
                                    </div>
                                </h3>
                                <div className="text text-danger text-center w-100 font-weight-bold">
                                    Sample Image
                                </div>
                            </div>
                        ))}
                    </ReactGridLayout>
                </div>
            </EditorContext.Provider>
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <GeoDashNavigationBar
            editor
            page={(addDialog, copyDialog, closeDialogs) => (
                <WidgetLayoutEditor
                    addDialog={addDialog}
                    closeDialogs={closeDialogs}
                    copyDialog={copyDialog}
                    institutionId={parseInt(args.institutionId || -1)}
                    projectId={parseInt(args.projectId || -1)}
                />
            )}
            userName={args.userName || ""}
        />,
        document.getElementById("app")
    );
}

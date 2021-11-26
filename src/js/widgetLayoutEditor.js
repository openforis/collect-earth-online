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
import WidgetContainer from "./geodash/WidgetContainer";

const ReactGridLayout = WidthProvider(RGL);

class WidgetLayoutEditor extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            // Page state
            widgets: [],
            imagery: [],
            projectTemplateList: [],

            // Widget specific state
            title: "",
            type: "-1",
            basemapId: -1,
            widgetDesign: {}
        };

        this.widgetTypes = {
            degradationTool: {
                title: "Degradation Tool",
                blankWidget: {band: "NDFI", endDate: "", startDate: ""},
                WidgetDesigner: DegradationDesigner
            },
            dualImagery: {
                title: "Dual Imagery",
                blankWidget: {
                    image1: {assetName: "", type: "imageAsset", visParams: ""},
                    image2: {assetName: "", type: "imageAsset", visParams: ""},
                    swipeAsDefault: false
                },
                WidgetDesigner: DualImageryDesigner
            },
            imageAsset: {
                title: "Image Asset",
                blankWidget: {assetName: "", visParams: ""},
                WidgetDesigner: ImageAssetDesigner
            },
            imageCollectionAsset: {
                title: "Image Collection Asset",
                blankWidget: {
                    assetName: "",
                    endDate: "",
                    reducer: "Median",
                    startDate: "",
                    visParams: ""
                },
                WidgetDesigner: ImageCollectionAssetDesigner
            },
            polygonCompare: {
                title: "Polygon Compare",
                blankWidget: {
                    assetName: "",
                    field: "",
                    visParams: "{\"max\": 1, \"palette\": [\"red\"]}"
                },
                WidgetDesigner: PolygonDesigner
            },
            preImageCollection: {
                title: "Preloaded Image Collections",
                blankWidget: {endDate: "", indexName: "NDVI", startDate: ""},
                WidgetDesigner: PreImageCollectionDesigner
            },
            imageElevation: {
                title: "SRTM Digital Elevation Data 30m",
                blankWidget: {assetName: "USGS/SRTMGL1_003", visParams: ""},
                WidgetDesigner: ImageElevationDesigner
            },
            statistics: {
                title: "Statistics",
                blankWidget: {},
                WidgetDesigner: StatsDesigner
            },
            timeSeries: {
                title: "Time Series Graph",
                blankWidget: {endDate: "", indexName: "NDVI", startDate: ""},
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

    parsePrefix = pathPrefix => {
        if (_.isArray(pathPrefix)) {
            return pathPrefix;
        } else if (_.isNumber(pathPrefix) || (_.isString(pathPrefix) && pathPrefix.length > 0)) {
            return [pathPrefix];
        } else {
            return [];
        }
    };

    setWidgetDesign = (dataKey, val, pathPrefix = "") => {
        const path = [...this.parsePrefix(pathPrefix), dataKey];
        this.setState(prevState => ({widgetDesign: _.set(_.cloneDeep(prevState.widgetDesign), path, val)}));
    };

    getWidgetDesign = (dataKey, pathPrefix = "") => {
        const path = [...this.parsePrefix(pathPrefix), dataKey];
        return _.get(this.state.widgetDesign, path);
    };

    updateTitle = newTitle => {
        this.setState({title: newTitle});
    };

    updateType = newType => this.setState({
        type: newType,
        title: "",
        widgetDesign: this.widgetTypes[newType].blankWidget
    });

    cancelNewWidget = () => {
        this.props.closeDialogs();
        this.resetWidgetDesign();
    };

    generateNewWidget = () => {
        const {title, type, widgetDesign, basemapId} = this.state;
        if (title) {
            const maxY = Math.max(...this.state.widgets.map(o => (o.layout.y || 0)), 0);
            const baseWidget = {
                layout:{
                    x: 0,
                    y: maxY + 1, // This adds the new widget to the bottom
                    w: 3,
                    h: 1
                },
                name: title,
                type
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
            // Base widget + widget design, visParams parsed
            } else if (["imageAsset", "imageElevation"].includes(type)) {
                const {visParams} = widgetDesign;
                return {
                    ...baseWidget,
                    ...widgetDesign,
                    visParams: JSON.parse(visParams || "{}")
                };
            // Base widget + basemap + widget design, visParams parsed
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
            alert("Invalid selections, unable to generate new widget.");
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
        return (
            <form>
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
                    getWidgetDesign: this.getWidgetDesign,
                    setWidgetDesign: this.setWidgetDesign,
                    widgetDesign: this.state.widgetDesign,
                    imagery: this.state.imagery,
                    getInstitutionImagery: this.getInstitutionImagery,
                    getBandsFromGateway: this.getBandsFromGateway
                }}
            >
                <div className="mb-3">
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
                        rowHeight={350}
                    >
                        {widgets.map(widget => (
                            <div
                                key={widget.id}
                                data-grid={{...widget.layout, minW: 3, w: Math.max(widget.layout.w, 3)}}
                            >
                                <WidgetContainer
                                    title={widget.name}
                                    titleButtons={(
                                        <div
                                            onClick={() => this.removeLayoutItem(widget.id)}
                                            style={{cursor: "pointer"}}
                                        >
                                            X
                                        </div>
                                    )}
                                >
                                    <div
                                        style={{
                                            backgroundImage: "url(" + this.getImageByType(widget.type) + ")",
                                            backgroundSize: "cover",
                                            height: "100%"
                                        }}
                                    >
                                        <div className="text text-danger text-center w-100 font-weight-bold mt-2">
                                            Sample Image
                                        </div>
                                    </div>
                                </WidgetContainer>
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

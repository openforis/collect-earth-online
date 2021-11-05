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

import {EditorContext} from "./geodash/constants";

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
            selectedWidgetType: "-1",
            widgetTitle: "",
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
        // FIXME, test if assetType can be proper case the the ee object
        if (assetName && assetName !== "") {
            const postObject = {
                path: "getAvailableBands",
                [assetType]: assetName
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
            selectedWidgetType: "-1",
            widgetTitle: "",
            widgetDesign: {}
        });
    };

    // TODO, add middleware conditions
    // type change
    // -  reset bands?
    setWidgetDesign = (dataKey, val) => {
        this.setState({widgetDesign: {...this.state.widgetDesign, [dataKey]: val}});
    };

    onDataBasemapSelectChanged = event => {
        this.setState({basemapId: parseInt(event.target.value)});
    };

    onWidgetTitleChange = event => {
        this.setState({widgetTitle: event.target.value});
    };

    updateWidgetType = newWidgetType => this.setState({
        selectedWidgetType: newWidgetType,
        widgetTitle: "",
        widgetDesign: {}
    });

    onCancelNewWidget = () => {
        this.props.closeDialogs();
        this.resetWidgetDesign();
    };

    onCreateNewWidget = () => {
        const {widgetTitle: name, widgetType: type, widgetDesign, basemapId} = this.state;
        const maxY = Math.max(...this.state.widgets.map(o => (o.layout.y || 0)));
        const yval = maxY > -1 ? maxY + 1 : 0; // puts it at the bottom
        let widget = {
            type,
            name,
            layout:{
                x: 0,
                y: yval,
                w: 3,
                h: 1
            }
        };
        // FIXME, use immutable design, and spread widgetDesign
        if (type === "statistics") {
            widget = {...widget};
        } else if (type === "imageAsset" || type === "imageElevation") {
            // image elevation is a specific image asset
            const {visParams, assetName} = widgetDesign;
            widget.basemapId = basemapId;
            widget.assetName = assetName;
            widget.visParams = JSON.parse(visParams || "{}");
        } else if (type === "degradationTool") {
            const {graphBand, startDate, endDate} = widgetDesign;
            widget.basemapId = basemapId;
            widget.graphBand = graphBand || "NDFI"; // FIXME, make sure this is the default or check for error
            widget.startDate = startDate;
            widget.endDate = endDate;
        } else if (type === "polygonCompare") {
            const {assetName, visParams, field} = widgetDesign;
            widget.basemapId = this.state.basemapId;
            widget.assetName = assetName;
            widget.field = field;
            widget.visParams = JSON.parse(visParams || "{}");
        } else if (type === "timeSeries") {
            const {startDate, endDate, indexName, assetName, graphBand, reducer} = widgetDesign;
            widget.indexName = indexName;
            widget.assetName = assetName;
            widget.graphBand = graphBand;
            widget.reducer = reducer;
            widget.startDate = startDate;
            widget.endDate = endDate;
        } else if (type === "preImageCollection") {
            const {startDate, endDate, indexName, bands, min, max, cloudLessThan} = widgetDesign;
            widget.basemapId = basemapId;
            widget.indexName = indexName;
            widget.bands = bands;
            widget.min = min;
            widget.max = max;
            widget.cloudLessThan = cloudLessThan;
            widget.startDate = startDate;
            widget.endDate = endDate;
        } else if (type === "imageCollectionAsset") {
            const {assetName, reducer, visParams, startDate, endDate} = widgetDesign;
            widget.basemapId = basemapId;
            widget.assetName = assetName;
            widget.visParams = JSON.parse(visParams || "{}");
            widget.reducer = reducer;
            widget.startDate = startDate;
            widget.endDate = endDate;
        } else if (type === "dualImageCollection") {
            // FIXME, this is a stub.  Will need to get each image.
            const {img1, img2} = widget;
            widget.img1 = img1;
            widget.img2 = img2;
        } else {
            console.error("Invalid widget type.");
            widget = {};
        }

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
                    widgetJSON: JSON.stringify(widget)
                })
            }
        )
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                this.props.closeDialogs();
                this.setState({
                    widgets: data
                });
                this.resetWidgetDesign();
            })
            .catch(error => {
                console.error(error);
                alert("Error creating widget. See console for details.");
            });
    };

    /// ReactGridLayout

    onRemoveItem = widgetId => {
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

    getImageByType = imageType => (imageType === "getStats" ? "/img/geodash/statssample.gif"
        : (!imageType || imageType.toLowerCase().includes("image")) ? "/img/geodash/mapsample.gif"
            : (imageType.toLowerCase().includes("degradationtool")) ? "/img/geodash/degsample.gif"
                : "/img/geodash/graphsample.gif");

    getAvailableBandsControl = (isDual, isCollection) => (
        <>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <label>Available Bands</label>
                <button className="btn btn-sm btn-secondary mb-1" onClick={() => this.getBandsFromGateway(isDual, isCollection)} type="button">Refresh</button>
            </div>
            <label>{isDual
                ? this.state.availableBandsDual || "Click on refresh to see the Available Bands."
                : this.state.availableBands || "Click on refresh to see the Available Bands."}
            </label>
        </>
    );

    // Create new widget main form

    dialogButtons = () => (
        <>
            <button
                className="btn btn-secondary"
                data-dismiss="modal"
                onClick={this.onCancelNewWidget}
                type="button"
            >
                Cancel
            </button>
            <button
                className="btn btn-primary"
                disabled={!this.state.formReady}
                onClick={this.onCreateNewWidget}
                type="button"
            >
                Create
            </button>
        </>
    );

    dialogBody = () => {
        const {WidgetDesigner} = this.widgetTypes[this.state.selectedWidgetType] || {};
        console.log(this.widgetTypes[this.state.selectedWidgetType]);
        return (
            <form>
                <div className="form-group">
                    <label htmlFor="widgetTypeSelect">Widget Type</label>
                    <select
                        className="form-control"
                        id="widgetTypeSelect"
                        name="widgetTypeSelect"
                        onChange={e => this.updateWidgetType(e.target.value)}
                        value={this.state.selectedWidgetType}
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
                        onChange={this.onWidgetTitleChange}
                        placeholder="Enter title"
                        type="text"
                        value={this.state.widgetTitle}
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
                                style={{backgroundImage: "url(" + this.getImageByType(widget.properties[0]) + ")"}}
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
                                    <span
                                        onClick={() => this.onRemoveItem(widget.id)}
                                        style={{cursor: "pointer"}}
                                    >
                                    X
                                    </span>
                                </h3>
                                <span className="text text-danger text-center">Sample Image</span>
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

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
import ImageCollectionDesigner from "./geodash/ImageCollectionDesigner";
import ImageElevationDesigner from "./geodash/ImageElevationDesigner";
import StatsDesigner from "./geodash/StatsDesigner";
import TimeSeriesDesigner from "./geodash/TimeSeriesDesigner";
import PolygonDesigner from "./geodash/PolygonDesigner";

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
            selectedWidgetType: -1,
            widgetTitle: "",
            widgetDesign: {},
            formReady: false,
            // consider defaults
            graphBandDeg: "NDFI",
            graphReducer: "Min"
        };

        this.widgetTypes = {
            statistics: {
                title: "Statistics",
                WidgetDesigner: StatsDesigner
            },
            imageAsset: {
                title: "Image Asset",
                WidgetDesigner: ImageAssetDesigner
            },
            preImageCollection: {
                title: "Preloaded Image Collections",
                WidgetDesigner: ImageCollectionDesigner
            },
            imageCollectionAsset: {
                title: "Image Collection Asset",
                WidgetDesigner: ImageCollectionAssetDesigner
            },
            dualImagery: {
                title: "Dual Imagery",
                WidgetDesigner: DualImageryDesigner
            },
            imageElevation: {
                title: "SRTM Digital Elevation Data 30m",
                WidgetDesigner: ImageElevationDesigner
            },
            timeSeries: {
                title: "Time Series Graph",
                WidgetDesigner: TimeSeriesDesigner
            },
            degradationTool: {
                title: "Degradation Tool",
                WidgetDesigner: DegradationDesigner
            },
            polygonCompare: {
                title: "Polygon Compare",
                WidgetDesigner: PolygonDesigner
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
            selectedDataType: "-1",
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
        selectedDataType: -1,
        widgetTitle: "",
        widgetDesign: {},
        formReady: newWidgetType === "statistics"
            || newWidgetType === "imageAsset"
            || newWidgetType === "imageCollectionAsset"
            || newWidgetType === "ImageElevation"
    });

    onDataTypeSelectChanged = event => {
        this.setState({
            availableBands: "",
            selectedDataType: event.target.value
        });
    };

    onCancelNewWidget = () => {
        this.props.closeDialogs();
        this.resetWidgetDesign();
    };

    onCreateNewWidget = () => {
        const {widgetTitle: name, widgetType: type, widgetDesign, basemapId} = this.state;
        const maxY = Math.max(...this.state.widgets.map(o => (o.layout.y || 0)));
        const yval = maxY > -1 ? maxY + 1 : 0; // puts it at the bottom
        const widget = {
            type,
            name,
            layout:{
                x: 0,
                y: yval,
                w: 3,
                h: 1
            }
        };
        if (type === "statistics") {
            // Do nothing
        } else if (type === "imageAsset" || type === "imageElevation") {
            // image elevation is a specific image asset
            const {visParams, assetName} = widgetDesign;
            widget.basemapId = basemapId;
            widget.eeType = "Image";
            widget.assetName = assetName;
            widget.visParams = JSON.parse(visParams || "{}");
        } else if (type === "degradationTool") {
            const {graphBand, startDate, endDate} = widgetDesign;
            widget.basemapId = basemapId;
            widget.graphBand = graphBand || "NDFI"; // FIXME, make sure this is the default or check for error
            widget.startDate = startDate;
            widget.endDate = endDate;
        } else if (type === "DualImageCollection") {
            widget.properties = ["", "", "", "", ""];
            widget.filterType = "";
            widget.visParams = {};
            widget.dualImageCollection = [];
            widget.swipeAsDefault = this.state.swipeAsDefault;
            widget.basemapId = this.state.basemapId;
            const img1 = {};
            const img2 = {};
            img1.collectionType = "ImageCollection" + this.state.selectedDataType;
            img2.collectionType = "ImageCollection" + this.state.selectedDataTypeDual;
            img1.startDate = this.state.startDate;
            img1.endDate = this.state.endDate;
            img2.startDate = this.state.startDateDual;
            img2.endDate = this.state.endDateDual;
            if (["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(this.state.selectedDataType)) {
                img1.filterType = this.state.selectedDataType !== null ? this.state.selectedDataType : "";
                img1.visParams = {
                    bands: this.state.widgetBands,
                    min: this.state.widgetMin,
                    max: this.state.widgetMax,
                    cloudLessThan: this.state.widgetCloudScore
                };
            }
            if (["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(this.state.selectedDataTypeDual)) {
                img2.filterType = this.state.selectedDataTypeDual !== null ? this.state.selectedDataTypeDual : "";
                img2.visParams = {
                    bands: this.state.widgetBandsDual,
                    min: this.state.widgetMinDual,
                    max: this.state.widgetMaxDual,
                    cloudLessThan: this.state.widgetCloudScoreDual
                };
            }
            if (this.state.selectedDataType === "imageAsset") {
                // add image asset parameters
                img1.visParams = JSON.parse(this.state.visParams);
                img1.imageAsset = this.state.imageCollection;
            }
            if (this.state.selectedDataType === "imageCollectionAsset") {
                // add image asset parameters
                img1.visParams = JSON.parse(this.state.visParams);
                img1.ImageCollectionAsset = this.state.imageCollection;
            }
            if (this.state.selectedDataTypeDual === "imageAsset") {
                // add dual image asset parameters
                img2.visParams = JSON.parse(this.state.visParamsDual);
                img2.imageAsset = this.state.imageCollectionDual;
            }
            if (this.state.selectedDataTypeDual === "imageCollectionAsset") {
                // add dual image asset parameters
                img2.visParams = JSON.parse(this.state.visParamsDual);
                img2.ImageCollectionAsset = this.state.imageCollectionDual;
            }
            widget.dualImageCollection.push(img1);
            widget.dualImageCollection.push(img2);
        } else if (type === "imageCollectionAsset") {
            widget.properties = ["", "", "", "", ""];
            widget.filterType = "";
            widget.visParams = JSON.parse(this.state.visParams);
            widget.ImageCollectionAsset = this.state.imageCollection;
            widget.basemapId = this.state.basemapId;
        } else if (type === "polygonCompare") {
            widget.properties = ["featureCollection", "", "", "", ""];
            widget.featureCollection = this.state.featureCollection;
            widget.visParams = this.state.visParams;
            widget.field = this.state.matchField;
            widget.basemapId = this.state.basemapId;
        } else {
            const wType = type === "TimeSeries"
                ? this.state.selectedDataType.toLowerCase() + type
                : type === "ImageCollection"
                    ? type + this.state.selectedDataType
                    : "custom"; // This never happens
            let prop1 = "";
            const properties = [];
            const prop4 = this.state.selectedDataType !== null ? this.state.selectedDataType : "";
            if (this.state.selectedDataType === "Custom") {
                // more work to do to label the type and add
                prop1 = this.state.imageCollection;
                widget.visParams = this.state.visParams;
                widget.graphBand = this.state.graphBand;
                widget.graphReducer = this.state.graphReducer;
            }
            if (["ImageCollection", "ImageElevation"].includes(type)) {
                widget.basemapId = this.state.basemapId;
            }
            properties[0] = wType;
            properties[1] = prop1;
            properties[2] = this.state.startDate;
            properties[3] = this.state.endDate;
            properties[4] = prop4;

            widget.properties = properties;
            if (["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(this.state.selectedDataType)) {
                widget.filterType = this.state.selectedDataType;
                widget.visParams = {
                    bands: this.state.widgetBands,
                    min: this.state.widgetMin,
                    max: this.state.widgetMax,
                    cloudLessThan: this.state.widgetCloudScore
                };
            }
            widget.dualLayer = this.state.dualLayer;
            if (widget.dualLayer) {
                widget.dualStart = this.state.startDate2;
                widget.dualEnd = this.state.endDate2;
            }
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
        const {title, WidgetDesigner} = this.widgetTypes[this.state.selectedWidgetType] || {};
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

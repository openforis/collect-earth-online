import "../css/geo-dash.css";
import "react-grid-layout/css/styles.css";

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

import {EditorContext, graphWidgetList, gridRowHeight, mapWidgetList} from "./geodash/constants";
import WidgetContainer from "./geodash/WidgetContainer";
import SvgIcon from "./components/SvgIcon";
import {cleanJSON} from "./utils/generalUtils";

const ReactGridLayout = WidthProvider(RGL);

class WidgetLayoutEditor extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            // Page state
            widgets: [],
            imagery: [],
            projectTemplateList: [],
            editDialog: false,

            // Widget specific state
            // TODO, move type into widget design.
            title: "",
            type: "-1",
            widgetDesign: {},
            originalWidget: {}
        };

        this.widgetTypes = {
            degradationTool: {
                title: "Degradation Tool",
                blankWidget: {basemapId: "-1", band: "NDFI", endDate: "", startDate: ""},
                WidgetDesigner: DegradationDesigner
            },
            dualImagery: {
                title: "Dual Imagery",
                blankWidget: {
                    basemapId: "-1",
                    image1: {assetName: "", type: "imageAsset", visParams: ""},
                    image2: {assetName: "", type: "imageAsset", visParams: ""},
                    swipeAsDefault: false
                },
                WidgetDesigner: DualImageryDesigner
            },
            imageAsset: {
                title: "Image Asset",
                blankWidget: {basemapId: "-1", assetName: "", visParams: ""},
                WidgetDesigner: ImageAssetDesigner
            },
            imageCollectionAsset: {
                title: "Image Collection Asset",
                blankWidget: {
                    basemapId: "-1",
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
                    basemapId: "-1",
                    assetName: "",
                    field: "",
                    visParams: "{\"max\": 1, \"palette\": [\"red\"]}"
                },
                WidgetDesigner: PolygonDesigner
            },
            preImageCollection: {
                title: "Preloaded Image Collections",
                blankWidget: {
                    basemapId: "-1",
                    endDate: "",
                    indexName: "NDVI",
                    startDate: ""
                },
                WidgetDesigner: PreImageCollectionDesigner
            },
            imageElevation: {
                title: "SRTM Digital Elevation Data 30m",
                blankWidget: {basemapId: "-1", assetName: "USGS/SRTMGL1_003", visParams: ""},
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
        Promise.all([this.fetchProjectWidgets(), this.getInstitutionImagery(), this.getProjectTemplateList()])
            .catch(error => {
                console.error(error);
                alert("Error loading widget designer.  See console for details.");
            });
    }

    /// API Calls

    fetchProjectWidgets = () =>
        fetch(`/geo-dash/get-project-widgets?projectId=${this.props.projectId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({widgets: data}));

    getInstitutionImagery = () =>
        fetch(`/get-institution-imagery?institutionId=${this.props.institutionId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({imagery: data}));

    getProjectTemplateList = () =>
        fetch("/get-template-projects")
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({projectTemplateList: data}))
            .catch(error => console.error(error));

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

    postNewWidget = newWidget => {
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

    updateWidget = (route, widget) => {
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
        this.updateWidget("delete-widget", widget);
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

    editWidgetDesign = widget => {
        const {id, layout, name, type, ...widgetDesign} = widget;
        this.setState({
            type,
            title: name,
            widgetDesign,
            editDialog: true,
            originalWidget: widget
        });
    };

    setWidgetDesign = (dataKey, val, pathPrefix = "") => {
        // pathPrefix to be "image1" or "image2" for dual imagery
        const {widgetDesign} = this.state;
        if ((pathPrefix === "image1" || pathPrefix === "image2")) {
            if (dataKey === "type") {
                const {basemapId, ...blankWidget} = this.widgetTypes[val].blankWidget;
                this.setState({widgetDesign: {...widgetDesign, [pathPrefix]: {...blankWidget, type: val}}});
            } else {
                this.setState({
                    widgetDesign: {...widgetDesign, [pathPrefix]: {...widgetDesign[pathPrefix], [dataKey]: val}}
                });
            }
        } else {
            this.setState({widgetDesign: {...widgetDesign, [dataKey]: val}});
        }
    };

    getWidgetDesign = (dataKey, pathPrefix = "") => {
        const path = pathPrefix.length ? [pathPrefix, dataKey] : [dataKey];
        return _.get(this.state.widgetDesign, path);
    };

    updateTitle = newTitle => {
        this.setState({title: newTitle});
    };

    updateType = newType => {
        const {widgets, imagery} = this.state;
        const widgetDesign = this.widgetTypes[newType].blankWidget;
        const getWidgetDesign = () => {
            if (widgetDesign.hasOwnProperty("basemapId")) {
                const lastBasemapId = _.get(
                    _.last(widgets.filter(w => w.hasOwnProperty("basemapId"))),
                    "basemapId",
                    {}
                );
                return {
                    ...widgetDesign,
                    basemapId: lastBasemapId || imagery[0].id || "-1"
                };
            } else {
                return widgetDesign;
            }
        };

        this.setState({
            type: newType,
            widgetDesign: getWidgetDesign()
        });
    };

    cancelNewWidget = () => {
        this.props.closeDialogs();
        this.resetWidgetDesign();
    };

    cancelEditWidget = () => {
        this.setState({editDialog: false});
        this.resetWidgetDesign();
    };

    /// Widget Creation

    getNextLayout = (width = 3, height = 1) => {
        const {widgets} = this.state;
        const layouts = widgets.map(w => w.layout);
        const maxY = Math.max(...layouts.map(l => (l.y || 0)), 0);

        if (height === 1) {
            const emptyXY = _.range(maxY + 1).map(y => {
                const row = layouts.filter(l => l.y === y);
                const emptyX = _.range(10)
                    .filter(x => row.every(l => (x < l.x && x + width <= l.x)
                    || (x >= l.x + l.w && x + width >= l.x + l.w)));
                return {x: _.first(emptyX), y};
            }).find(({x}) => _.isNumber(x)) || {x: 0, y: maxY + 1};

            return {
                ...emptyXY,
                w: width,
                h: 1
            };
        } else {
            return {
                x: 0,
                y: maxY + 1,
                w: width,
                h: height
            };
        }
    };

    // FIXME, validate widget
    buildNewWidget = () => {
        const {title, type, widgetDesign} = this.state;
        if (title) {
            return {
                name: title,
                type,
                ...Object.assign(
                    widgetDesign,
                    widgetDesign.hasOwnProperty("visParams") && {visParams: cleanJSON(widgetDesign.visParams)}
                )
            };
        } else {
            return null;
        }
    };

    createNewWidget = () => {
        const newWidget = this.buildNewWidget();
        if (newWidget) {
            this.postNewWidget({
                layout: this.getNextLayout(),
                ...newWidget
            });
        }
    };

    copyWidget = existingWidget => {
        const newWidget = {
            ...existingWidget,
            layout: this.getNextLayout(existingWidget.layout.w, existingWidget.layout.h),
            name: existingWidget.name + " - copy"
        };
        this.postNewWidget(newWidget);
    };

    saveWidgetEdits = () => {
        const {originalWidget: {id, layout}} = this.state;
        const newWidget = this.buildNewWidget();
        if (newWidget) {
            this.updateWidget(
                "update-widget",
                {
                    id,
                    layout,
                    ...this.buildNewWidget()
                }
            );
            this.setState({editDialog: false, originalWidget: null});
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
            this.updateWidget("update-widget", newWidget);
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

    createDialogButtons = () => (
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

    editDialogButtons = () => (
        <>
            <button
                className="btn btn-secondary"
                data-dismiss="modal"
                onClick={this.cancelEditWidget}
                type="button"
            >
                Cancel
            </button>
            <button
                className="btn btn-primary"
                onClick={this.saveWidgetEdits}
                type="button"
            >
                Update
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
        const {widgets, projectTemplateList, editDialog} = this.state;
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
                <div style={{marginBottom: `${gridRowHeight}px`}}>
                    {addDialog && (
                        <GeoDashModal
                            body={this.dialogBody()}
                            closeDialogs={this.cancelNewWidget}
                            footer={this.createDialogButtons()}
                            title="Create Widget"
                        />
                    )}
                    {editDialog && (
                        <GeoDashModal
                            body={this.dialogBody()}
                            closeDialogs={this.cancelEditWidget}
                            footer={this.editDialogButtons()}
                            title="Edit Widget"
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
                        onLayoutChange={this.onLayoutChange}
                        resizeHandles={["e", "s", "se"]}
                        rowHeight={gridRowHeight}
                    >
                        {widgets.map(widget => (
                            <div
                                key={widget.id}
                                data-grid={{...widget.layout, minW: 3}}
                            >
                                <WidgetContainer
                                    title={widget.name}
                                    titleButtons={(
                                        <div className="d-flex" style={{gap: ".5rem"}}>
                                            <div onClick={() => this.copyWidget(widget)}>
                                                <SvgIcon color="currentColor" icon="copy" size="1.5rem"/>
                                            </div>
                                            <div
                                                onClick={() => this.editWidgetDesign(widget)}
                                            >
                                                <SvgIcon color="currentColor" icon="edit" size="1.5rem"/>
                                            </div>
                                            <div
                                                onClick={() => this.removeLayoutItem(widget.id)}
                                            >
                                                <SvgIcon color="currentColor" icon="delete" size="1.5rem"/>
                                            </div>
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
                                        <div
                                            className="text text-danger mx-auto font-weight-bold mt-2"
                                            style={{
                                                background: "#f1f1f1",
                                                borderRadius: ".5rem",
                                                padding: "0 .5rem",
                                                width: "fit-content"
                                            }}
                                        >
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

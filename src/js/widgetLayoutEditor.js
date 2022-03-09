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
import PolygonDesigner from "./geodash/PolygonDesigner";
import PreImageCollectionDesigner from "./geodash/PreImageCollectionDesigner";
import TimeSeriesDesigner from "./geodash/TimeSeriesDesigner";
import SvgIcon from "./components/svg/SvgIcon";
import WidgetContainer from "./geodash/WidgetContainer";

import {EditorContext, graphWidgetList, gridRowHeight, mapWidgetList} from "./geodash/constants";
import {isValidJSON} from "./utils/generalUtils";
import {getNextInSequence, last} from "./utils/sequence";

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
                    image1: {assetId: "", type: "imageAsset", visParams: ""},
                    image2: {assetId: "", type: "imageAsset", visParams: ""}
                },
                WidgetDesigner: DualImageryDesigner
            },
            imageAsset: {
                title: "Image Asset",
                blankWidget: {basemapId: "-1", assetId: "", visParams: ""},
                WidgetDesigner: ImageAssetDesigner
            },
            imageCollectionAsset: {
                title: "Image Collection Asset",
                blankWidget: {
                    basemapId: "-1",
                    assetId: "",
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
                    assetId: "",
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
            statistics: {
                title: "Statistics",
                blankWidget: {},
                WidgetDesigner: () => null
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
            .then(([widgets, imagery, projectTemplateList]) =>
                this.setState({widgets, imagery, projectTemplateList}))
            .catch(error => {
                console.error(error);
                alert("Error loading widget designer.  See console for details.");
            });
    }

    /// API Calls

    fetchProjectWidgets = () => fetch(`/geo-dash/get-project-widgets?projectId=${this.props.projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)));

    getInstitutionImagery = () => fetch(`/get-institution-imagery?institutionId=${this.props.institutionId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)));

    getProjectTemplateList = () => fetch("/get-template-projects")
        .then(response => (response.ok ? response.json() : Promise.reject(response)));

    widgetAPIWrapper = (route, widget) => {
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
                alert("Error loading updated widgets. See console for details.");
            });
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
                alert("Error copying template widgets. See console for details.");
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
        // eslint-disable-next-line no-unused-vars
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
                // eslint-disable-next-line no-unused-vars
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
        const widgetPlusBasemap = {
            ...widgetDesign,
            ...widgetDesign.hasOwnProperty("basemapId") && {
                basemapId: _.get(last(widgets.filter(w => w.hasOwnProperty("basemapId"))), "basemapId")
                    || imagery[0].id
                    || "-1"
            }
        };

        this.setState({
            type: newType,
            widgetDesign: widgetPlusBasemap
        });
    };

    cancelNewWidget = () => this.props.closeDialogs();

    cancelEditWidget = () => this.setState({editDialog: false});

    /// Widget Creation

    getNextLayout = (width = 3, height = 1) => {
        const {widgets} = this.state;
        const layouts = widgets.map(w => w.layout);
        const nextY = getNextInSequence(layouts.map(l => (l.y || 0)));

        if (height === 1) {
            const emptyXY = _.range(nextY).map(y => {
                const row = layouts.filter(l => l.y === y);
                const emptyX = _.range(10)
                    .filter(x => row.every(l => (x < l.x && x + width <= l.x)
                    || (x >= l.x + l.w && x + width >= l.x + l.w)));
                return {x: _.first(emptyX), y};
            }).find(({x}) => _.isNumber(x)) || {x: 0, y: nextY};

            return {
                ...emptyXY,
                w: width,
                h: 1
            };
        } else {
            return {
                x: 0,
                y: nextY,
                w: width,
                h: height
            };
        }
    };

    getWidgetErrors = () => {
        const {title, widgetDesign} = this.state;
        return [
            !title.length && "You must add a title for the widget.",
            widgetDesign.hasOwnProperty("visParams")
                && !isValidJSON(widgetDesign.visParams)
                && "You have entered invalid JSON for Image Parameters",
            widgetDesign.hasOwnProperty("assetId")
                && !widgetDesign.assetId
                && "Asset ID is required."
        ].filter(e => e);
    };

    buildNewWidget = () => {
        const {title, type, widgetDesign} = this.state;
        return {
            name: title,
            type,
            ...widgetDesign
        };
    };

    createNewWidget = () => {
        const errors = this.getWidgetErrors();
        if (errors.length) {
            alert(errors.join("\n\n"));
        } else {
            this.widgetAPIWrapper(
                "create-widget",
                {
                    layout: this.getNextLayout(),
                    ...this.buildNewWidget()
                }
            );
            this.props.closeDialogs();
            this.resetWidgetDesign();
        }
    };

    copyWidget = existingWidget => {
        const newWidget = {
            ...existingWidget,
            layout: this.getNextLayout(existingWidget.layout.w, existingWidget.layout.h),
            name: existingWidget.name + " - copy"
        };
        this.widgetAPIWrapper("create-widget", newWidget);
    };

    saveWidgetEdits = () => {
        const {originalWidget: {id, layout}} = this.state;
        const errors = this.getWidgetErrors();
        if (errors.length) {
            alert(errors.join("\n\n"));
        } else {
            this.widgetAPIWrapper(
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
        this.widgetAPIWrapper("delete-widget", removedWidget);
    };

    sameLayout = (layout1, layout2) => layout1.x === layout2.x
        && layout1.y === layout2.y
        && layout1.h === layout2.h
        && layout1.w === layout2.w;

    onLayoutChange = layout => {
        const {widgets} = this.state;
        widgets.filter((stateWidget, idx) => !this.sameLayout(stateWidget.layout, layout[idx]))
            .forEach((stateWidget, idx) => {
                const {x, y, h, w} = layout[idx];
                const newWidget = {...stateWidget, layout: {x, y, h, w}};
                this.widgetAPIWrapper("update-widget", newWidget);
            });
    };

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
                className="btn btn-red"
                data-dismiss="modal"
                onClick={this.cancelNewWidget}
                type="button"
            >
                Cancel
            </button>
            <button
                className="btn btn-lightgreen"
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
                className="btn btn-red"
                data-dismiss="modal"
                onClick={this.cancelEditWidget}
                type="button"
            >
                Cancel
            </button>
            <button
                className="btn btn-yellow"
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
                    <label htmlFor="widgetTypeSelect">Widget Type</label>
                    <select
                        className="form-control"
                        id="widgetTypeSelect"
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

    containerButtons = widget => (
        <div className="d-flex" style={{gap: ".5rem"}}>
            <div
                onClick={() => this.copyWidget(widget)}
                title="Copy Widget"
            >
                <SvgIcon color="currentColor" cursor="pointer" icon="copy" size="1.5rem"/>
            </div>
            <div
                onClick={() => this.editWidgetDesign(widget)}
                title="Edit Widget"
            >
                <SvgIcon color="currentColor" cursor="pointer" icon="edit" size="1.5rem"/>
            </div>
            <div
                onClick={() => this.removeLayoutItem(widget.id)}
                title="Delete Widget"
            >
                <SvgIcon color="currentColor" cursor="pointer" icon="trash" size="1.5rem"/>
            </div>
        </div>
    );

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
                    getInstitutionImagery: this.getInstitutionImagery
                }}
            >
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
                <div style={{marginBottom: `${gridRowHeight}px`}}>
                    {widgets.length > 0 ? (
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
                                        titleButtons={this.containerButtons(widget)}
                                    >
                                        <div
                                            style={{
                                                height: "100%",
                                                position: "relative",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                width: "100%"
                                            }}
                                        >
                                            <div
                                                className="text text-danger mx-auto font-weight-bold mt-2"
                                                style={{
                                                    background: "#f1f1f1",
                                                    borderRadius: ".5rem",
                                                    padding: "0 .5rem",
                                                    zIndex: 100
                                                }}
                                            >
                                                Sample Image
                                            </div>
                                            <img
                                                alt="preview of widget"
                                                src={this.getImageByType(widget.type)}
                                                style={{
                                                    height: "100%",
                                                    position: "absolute",
                                                    width: "100%",
                                                    objectFit: "contain"
                                                }}
                                            />
                                        </div>
                                    </WidgetContainer>
                                </div>
                            ))}
                        </ReactGridLayout>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                margin: "2rem"
                            }}
                        >
                            <SvgIcon icon="alert" size="1.2rem"/>
                            <p style={{marginLeft: "0.4rem"}}>
                              You don&apos;t have any GeoDash Widgets.
                              Click Copy Layout or Add Widget above to get started!
                            </p>
                        </div>
                    )}
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

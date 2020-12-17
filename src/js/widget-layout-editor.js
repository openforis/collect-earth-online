import "../css/geo-dash.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";
import RGL, {WidthProvider} from "react-grid-layout";
const ReactGridLayout = WidthProvider(RGL);
import {GeoDashNavigationBar} from "./components/PageComponents";

class WidgetLayoutEditor extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            layout: [],
            widgets: [],
            imagery: [],
            selectedProjectId: 0,
            projectList: [],
            projectFilter:"",
            selectedWidgetType: "-1",
            selectedDataType: "-1",
            widgetTitle: "",
            imageCollection: "",
            featureCollection: "",
            matchField: "",
            graphBand: "",
            graphBandDeg: "NDFI",
            graphReducer: "Min",
            imageParams: "",
            dualLayer: false,
            swipeAsDefault: false,
            widgetBaseMap: "osm",
            startDate: "",
            endDate: "",
            startDate2: "",
            endDate2: "",
            widgetBands: "",
            widgetMin: "",
            widgetMax: "",
            widgetCloudScore: "",
            imageCollectionDual: "",
            selectedDataTypeDual: "-1",
            imageParamsDual: "",
            startDateDual: "",
            endDateDual: "",
            widgetBandsDual: "",
            widgetMinDual: "",
            widgetMaxDual: "",
            widgetCloudScoreDual: "",
            formReady: false,
            wizardStep: 1,
            projectId: this.getParameterByName("projectId"),
            institutionID: this.getParameterByName("institutionId") ? this.getParameterByName("institutionId") : "1",
            theURI: "/geo-dash",
        };
    }

    componentDidMount() {
        this.fetchProject(this.state.projectId, true)
            .catch(response => {
                console.log(response);
                alert("Error downloading the widget list. See console for details.");
            });
        this.getInstitutionImagery(this.state.institutionID);
        this.getProjectList();
    }

    getInstitutionImagery = institutionId => {
        fetch(`/get-institution-imagery?institutionId=${institutionId}`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                this.setState({
                    imagery: data,
                    widgetBaseMap: data.map(o => o.id.toString()).includes(this.state.widgetBaseMap)
                        ? this.state.widgetBaseMap
                        : data[0].id,
                });
            })
            .catch(response => {
                console.log(response);
                alert("Error downloading the imagery list. See console for details.");
            });
    };

    getParameterByName = (name, url) => {
        const regex = new RegExp("[?&]" + name.replace(/[[\]]/g, "\\$&") + "(=([^&#]*)|&|#|$)");
        const results = regex.exec(decodeURIComponent(url || window.location.href)); //regex.exec(url);
        return results
            ? results[2]
                ? decodeURIComponent(results[2].replace(/\+/g, " "))
                : ""
            : null;
    };

    getImageByType = (which) =>
        (which === "getStats") ? "/img/geodash/statssample.gif"
        : (which.toLowerCase().includes("image") || which === "") ? "/img/geodash/mapsample.gif"
        : (which.toLowerCase().includes("degradationtool")) ? "/img/geodash/degsample.gif"
        : "/img/geodash/graphsample.gif";

    checkWidgetStructure = (updatedWidgets) => {
        let changed = false;
        let row = 0;
        let column = 0;
        const sWidgets = _.orderBy(updatedWidgets, "id", "asc");
        const widgets = _.map(sWidgets, (widget, i) => {
            if (widget.layout) {
                if (widget["gridcolumn"]) {
                    delete widget["gridcolumn"];
                }
                if (widget["gridrow"]) {
                    delete widget["gridrow"];
                }
                widget.layout.i = i.toString();
                return widget;
            } else if (widget.gridcolumn) {
                changed = true;
                let y;
                let h;
                //let layout;
                //do the x and w
                const x = parseInt(widget.gridcolumn.split(" ")[0]) - 1;
                const w = parseInt(widget.gridcolumn.split(" ")[3]);
                if (widget.gridrow) {
                    //do the y and h
                    y = parseInt(widget.gridrow.trim().split(" ")[0]) - 1;
                    h = widget.gridrow.trim().split(" ")[3] !== undefined ? parseInt(widget.gridrow.trim().split(" ")[3]) : 1;
                }
                // create .layout
                widget.layout = {x : x, y: y, w: w, h: h};
                delete widget["gridcolumn"];
                delete widget["gridrow"];
            } else if (widget.position) {

                changed = true;
                let x;
                const h = 1;
                if (column + parseInt(widget.width) <= 12) {
                    x = column;
                    column = column + parseInt(widget.width);
                } else {
                    x = 0;
                    column = parseInt(widget.width);
                    row += 1;
                }
                widget.layout = {x : x, y: row, w: parseInt(widget.width), h: h, i:i.toString()};
            } else {
                changed = true;
                let x;
                const h = 1;
                if (column + 3 <= 12) {
                    x = column;
                    column = column + 3;
                } else {
                    x = 0;
                    column = parseInt(widget.width);
                    row += 1;
                }
                widget.layout = {x : x, y: row, w: parseInt(widget.width), h: h, i:i.toString()};
            }
            return widget;
        });
        this.setState({widgets: widgets});
        if (changed) {
            this.updateServerWidgets();
        }
    };

    updateServerWidgets = () => {
        this.state.widgets.forEach( widget => {
            const ajaxurl = this.state.theURI + "/update-widget?widgetId=" + widget.id;
            this.serveItUp(ajaxurl, widget);
        });
    };

    serveItUp = (url, widget) => {
        fetch(url,
              {
                  method: "POST",
                  headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                      dashID: this.state.dashboardID,
                      widgetJSON: JSON.stringify(widget),
                  }),
              })
            .then(response => {
                if (!response.ok) {
                    console.log(response);
                }
            });
    };

    deleteWidgetFromServer = widget => {
        const ajaxurl = this.state.theURI + "/delete-widget?widgetId=" + widget.id;
        this.serveItUp(ajaxurl, widget);
    };

    generateDOM = () => {
        const x = "x";
        return _.map(this.state.widgets, (widget, i) =>
            <div
                onDragStart={this.onDragStart}
                onDragEnd={this.onDragEnd}
                key={widget.layout ? widget.layout.i : i}
                data-grid={widget.layout}
                className="front widgetEditor-widgetBackground"
                style={{backgroundImage: "url(" + this.getImageByType(widget.properties[0]) + ")"}}
            >
                <h3 className="widgetEditor title">{widget.name}
                    <span
                        className="remove"
                        onClick={e => {
                            e.stopPropagation(); this.onRemoveItem(widget.layout.i);
                        }}
                        onMouseDown={function(e) {
                            e.stopPropagation();
                        }}
                    >
                        {x}
                    </span>
                </h3>
                <span className="text text-danger">Sample Image</span>
            </div>);
    };

    onWidgetTypeSelectChanged = event => {
        this.setState({
            selectedWidgetType: event.target.value,
            selectedDataType: "-1",
            widgetTitle: "",
            imageCollection: event.target.value === "ImageElevation" ? "USGS/SRTMGL1_003" : "",
            featureCollection: "",
            matchField: "",
            graphBand: "",
            graphBandDeg: "NDFI",
            graphReducer: "Min",
            imageParams: "",
            widgetBaseMap: "osm",
            dualLayer: false,
            swipeAsDefault: false,
            startDate:"",
            endDate:"",
            startDate2:"",
            endDate2:"",
            widgetBands:"",
            widgetMin:"",
            widgetMax:"",
            widgetCloudScore:"",
            imageCollectionDual: "",
            imageParamsDual: "",
            startDateDual:"",
            endDateDual:"",
            widgetBandsDual:"",
            widgetMinDual:"",
            widgetMaxDual:"",
            widgetCloudScoreDual:"",
            formReady: event.target.value === "statistics" || event.target.value === "imageAsset" || event.target.value === "imageCollectionAsset" || event.target.value === "ImageElevation",
            wizardStep: 1,
            availableBands:"",
            availableBandsDual:"",
        });
    };

    onDragStart = e => {
        e.preventDefault();
        e.stopPropagation();
        this.props.onMouseDown(e);
    };

    onDragEnd = e => {
        e.preventDefault();
        e.stopPropagation();
        this.props.onMouseUp(e);
    };

    getBandsFromGateway = isDual => {
        // go get available bands
        if (event.target.value !== "custom") {
            const postObject = {
                path: "getAvailableBands",
                imageCollection: event.target.value, //"LANDSAT/LT05/C01/T1"
            };
            fetch("/geo-dash/gateway-request", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(postObject),
            })
                .then(res => res.ok ? res.json() : Promise.reject())
                .then(data => {
                    if (data.hasOwnProperty("bands")) {
                        if (isDual) {
                            this.setState({
                                availableBandsDual: data.bands.join(", "),
                            });
                        } else {
                            this.setState({
                                availableBands: data.bands.join(", "),
                            });
                        }
                    }
                });
        }
    };

    onDataTypeSelectChanged = event => {
        this.setState({
            availableBands: "",
            selectedDataType: event.target.value,
        });
        this.getBandsFromGateway(false);
    };

    onCancelNewWidget = () => {
        this.props.closeDialogs();
        this.setState({
            selectedWidgetType: "-1",
            selectedDataTypeDual: "-1",
            selectedDataType: "-1",
            widgetTitle: "",
            imageCollection: "",
            featureCollection: "",
            matchField: "",
            graphBand: "",
            graphBandDeg: "NDFI",
            graphReducer: "Min",
            imageParams: "",
            widgetBaseMap: "osm",
            dualLayer: false,
            swipeAsDefault: false,
            startDate:"",
            endDate:"",
            startDate2:"",
            endDate2:"",
            widgetBands:"",
            widgetMin:"",
            widgetMax:"",
            widgetCloudScore:"",
            imageCollectionDual: "",
            imageParamsDual: "",
            startDateDual:"",
            endDateDual:"",
            widgetBandsDual:"",
            widgetMinDual:"",
            widgetMaxDual:"",
            widgetCloudScoreDual:"",
            formReady: false,
            wizardStep: 1,
            availableBands:"",
            availableBandsDual:"",
        });
    };

    onNextWizardStep = () => {
        this.setState({wizardStep: 2});
    };

    onPrevWizardStep = () => {
        this.setState({wizardStep: 1});
    };

    onCreateNewWidget = () => {
        const widget = {};
        const id = this.state.widgets.length > 0 ? (Math.max.apply(Math, this.state.widgets.map(function(o) {
            return o.id;
        }))) + 1 : 0;
        const name = this.state.widgetTitle;
        widget.id = id;
        widget.name = name;
        const yval = ((Math.max.apply(Math, this.state.widgets.map(function (o) {
            return o.layout.y !== null ? o.layout.y : 0;
        }))) + 1) > -1 ? (Math.max.apply(Math, this.state.widgets.map(function (o) {
            return o.layout.y !== null ? o.layout.y : 0;
        }))) + 1 : 0;

        widget.layout = {
            i: id.toString(),
            x: 0,
            y: yval, // puts it at the bottom
            w: 3,
            h: 1,
            minW: 3,
        };
        widget.baseMap = (this.state.imagery.filter(imagery => String(imagery.id) === this.state.widgetBaseMap))[0];
        if (this.state.selectedWidgetType === "DualImageCollection") {
            widget.properties = ["", "", "", "", ""];
            widget.filterType = "";
            widget.visParams = {};
            widget.dualImageCollection = [];
            widget.swipeAsDefault = this.state.swipeAsDefault;
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
                    cloudLessThan: this.state.widgetCloudScore,
                };
            }
            if (["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(this.state.selectedDataTypeDual)) {
                img2.filterType = this.state.selectedDataTypeDual !== null ? this.state.selectedDataTypeDual : "";
                img2.visParams = {
                    bands: this.state.widgetBandsDual,
                    min: this.state.widgetMinDual,
                    max: this.state.widgetMaxDual,
                    cloudLessThan: this.state.widgetCloudScoreDual,
                };
            }
            if (this.state.selectedDataType === "imageAsset") {
                //add image asset parameters
                img1.visParams = JSON.parse(this.state.imageParams);
                img1.imageAsset = this.state.imageCollection;
            }
            if (this.state.selectedDataType === "imageCollectionAsset") {
                //add image asset parameters
                img1.visParams = JSON.parse(this.state.imageParams);
                img1.ImageCollectionAsset = this.state.imageCollection;
            }
            if (this.state.selectedDataTypeDual === "imageAsset") {
                //add dual image asset parameters
                img2.visParams = JSON.parse(this.state.imageParamsDual);
                img2.imageAsset = this.state.imageCollectionDual;
            }
            if (this.state.selectedDataTypeDual === "imageCollectionAsset") {
                //add dual image asset parameters
                img2.visParams = JSON.parse(this.state.imageParamsDual);
                img2.ImageCollectionAsset = this.state.imageCollectionDual;
            }
            widget.dualImageCollection.push(img1);
            widget.dualImageCollection.push(img2);
        } else if (this.state.selectedWidgetType === "imageAsset" || this.state.selectedWidgetType === "ImageElevation") {
            widget.properties = ["", "", "", "", ""];
            widget.filterType = "";
            widget.visParams = this.state.imageParams === "" ? {} : JSON.parse(this.state.imageParams);
            widget.ImageAsset = this.state.imageCollection;
        } else if (this.state.selectedWidgetType === "imageCollectionAsset") {
            widget.properties = ["", "", "", "", ""];
            widget.filterType = "";
            widget.visParams = JSON.parse(this.state.imageParams);
            widget.ImageCollectionAsset = this.state.imageCollection;
        } else if (this.state.selectedWidgetType === "DegradationTool") {
            widget.type = "DegradationTool";
            widget.properties = ["DegradationTool", "", "", "", ""];
            widget.filterType = "";
            widget.startDate = this.state.startDate;
            widget.endDate = this.state.endDate;
            widget.graphBand = this.state.graphBandDeg === "" ? "NDFI" : this.state.graphBandDeg;
            widget.baseMap = this.state.widgetBaseMap;
        } else if (this.state.selectedWidgetType === "polygonCompare") {
            widget.type = "polygonCompare";
            widget.properties = ["featureCollection", "", "", "", ""];
            widget.featureCollection = this.state.featureCollection;
            widget.visParams = this.state.visParams;
            widget.field = this.state.matchField;
            widget.baseMap = this.state.widgetBaseMap;
        } else {
            const wType = this.state.selectedWidgetType === "TimeSeries" ? this.state.selectedDataType.toLowerCase() + this.state.selectedWidgetType
                : this.state.selectedWidgetType === "ImageCollection" ? this.state.selectedWidgetType + this.state.selectedDataType
                : this.state.selectedWidgetType === "statistics" ? "getStats"
                : this.state.selectedWidgetType === "ImageElevation" ? "ImageElevation"
                : "custom";
            let prop1 = "";
            const properties = [];
            const prop4 = this.state.selectedDataType !== null ? this.state.selectedDataType : "";
            if (this.state.selectedDataType === "Custom") {
                //more work to do to label the type and add
                prop1 = this.state.imageCollection;
                widget.visParams = this.state.imageParams;
                widget.graphBand = this.state.graphBand;
                widget.graphReducer = this.state.graphReducer;
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
                    cloudLessThan: this.state.widgetCloudScore,
                };
            }
            widget.dualLayer = this.state.dualLayer;
            if (widget.dualLayer) {
                widget.dualStart = this.state.startDate2;
                widget.dualEnd = this.state.endDate2;
            }
        }

        fetch(this.state.theURI + "/create-widget",
              {
                  method: "POST",
                  headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                      projectId: this.state.projectId,
                      dashID: this.state.dashboardID,
                      widgetJSON: JSON.stringify(widget),
                  }),
              })
            .then(response => {
                if (response.ok) {
                    this.props.closeDialogs();
                    this.setState({
                        widgets: [...this.state.widgets, widget],
                        selectedWidgetType: "-1",
                        selectedDataTypeDual: "-1",
                        selectedDataType: "-1",
                        widgetTitle: "",
                        imageCollection: "",
                        featureCollection: "",
                        matchField: "",
                        graphBand: "",
                        graphBandDeg: "NDFI",
                        graphReducer: "Min",
                        imageParams: "",
                        widgetBaseMap: "osm",
                        dualLayer: false,
                        swipeAsDefault: false,
                        startDate:"",
                        endDate:"",
                        startDate2:"",
                        endDate2:"",
                        widgetBands:"",
                        widgetMin:"",
                        widgetMax:"",
                        widgetCloudScore:"",
                        formReady: false,
                    });
                } else {
                    console.log("Error adding custom imagery to institution. See console for details.");
                }
            });
    };

    onDataBaseMapSelectChanged = event => {
        this.setState({widgetBaseMap: event.target.value});
    };

    onWidgetTitleChange = event => {
        this.setState({widgetTitle: event.target.value});
    };

    onImageCollectionChange = event => {
        this.setState({
            imageCollection: event.target.value,
            availableBands: "",
        });
        this.getBandsFromGateway(false);
    };

    onFeatureCollectionChange = event => {
        this.setState({featureCollection: event.target.value});
    };

    onMatchFieldChange = event => {
        this.setState({
            matchField: event.target.value,
            formReady: true,
        });
    };

    onGraphBandChange = event => {
        this.setState({graphBand: event.target.value});
    };

    onGraphBandDegChange = event => {
        this.setState({graphBandDeg: event.target.value});
    };

    onGraphReducerChanged = event => {
        this.setState({graphReducer: event.target.value});
    };

    onImageParamsChange = event => {
        this.setState({imageParams: event.target.value.replace(/\s/g, "")});
    };

    onswipeAsDefaultChange = event => {
        this.setState({swipeAsDefault: event.target.checked});
    };

    onWidgetDualLayerChange = event => {
        this.setState({dualLayer: event.target.checked});
    };

    onWidgetBandsChange = event => {
        this.setState({widgetBands: event.target.value.replace(/\s/g, "")});
    };

    onWidgetMinChange = event => {
        this.setState({widgetMin: event.target.value});
    };

    onWidgetMaxChange = event => {
        this.setState({widgetMax: event.target.value});
    };

    onStartDateChanged = event => {
        this.setState({
            startDate: event.target ? event.target.value : "",
        }, this.setFormStateByDates);
    };

    onEndDateChanged = event => {
        this.setState({
            endDate: event.target ? event.target.value : "",
        }, this.setFormStateByDates);
    };

    onWidgetCloudScoreChange = event => {
        this.setState({widgetCloudScore: event.target.value});
    };

    onImageCollectionChangeDual = event => {
        this.setState({
            imageCollectionDual: event.target.value,
            availableBandsDual: "",
        });
        this.getBandsFromGateway(true);
    };

    onImageParamsChangeDual = event => {
        this.setState({imageParamsDual: event.target.value.replace(/\s/g, "")});
    };

    onWidgetBandsChangeDual = event => {
        this.setState({widgetBandsDual: event.target.value.replace(/\s/g, "")});
    };

    onWidgetMinChangeDual = event => {
        this.setState({widgetMinDual: event.target.value});
    };

    onWidgetMaxChangeDual = event => {
        this.setState({widgetMaxDual: event.target.value});
    };

    onWidgetCloudScoreChangeDual = event => {
        this.setState({widgetCloudScoreDual: event.target.value});
    };

    onStartDateChangedDual = event => {
        this.setState({
            startDateDual: event.target ? event.target.value : "",
        }, () => this.setFormStateByDates(true));
    };

    onEndDateChangedDual = event => {
        this.setState({
            endDateDual: event.target ? event.target.value : "",
        }, () => this.setFormStateByDates(true));
    };

    onDataTypeSelectChangedDual = event => {
        this.setState({
            availableBandsDual: "",
            selectedDataTypeDual: event.target.value.trim(),
            formReady: true,
        });
        this.getBandsFromGateway(true);
    };

    setFormStateByDates = isDual => {
        const ed = isDual ? new Date(this.state.endDateDual) : new Date(this.state.endDate);
        const sd = isDual ? new Date(this.state.startDateDual) : new Date(this.state.startDate);
        let isFormReady = null;
        if (! this.state.dualLayer) {
            isFormReady = ed > sd && this.state.formReady !== true
                ? true
                : ed < sd && this.state.formReady === true
                    ? false : null;
        } else {
            const ed2 = new Date(this.state.endDate2);
            const sd2 = new Date(this.state.startDate2);
            isFormReady = ed > sd
                && ed2 > sd2
                && this.state.formReady !== true
                    ? true
                    : (ed < sd || ed2 < sd2)
                        && this.state.formReady === true
                            ? false : null;
        }
        if (isFormReady !== null) {
            this.setState({formReady: isFormReady});
        }
    };

    onStartDate2Changed = event => {
        this.setState({
            startDate2: event.target ? event.target.value : "",
        }, this.setFormStateByDates);
    };

    onEndDate2Changed = event => {
        this.setState({
            endDate2: event.target ? event.target.value : "",
        }, this.setFormStateByDates);
    };

    getProjectList = () => {
        fetch("/get-all-projects")
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({projectList: data}))
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    setWidgetLayoutTemplate = id => {
        this.setState({selectedProjectId: id});
        this.state.widgets.forEach( widget => {
            this.deleteWidgetFromServer( widget );
        });
        this.getWidgetTemplateByProjectId( id );
    };

    fetchProject = (id, setDashboardID) => fetch(this.state.theURI + "/get-by-projid?projectId=" + id)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            const widgets = Array.isArray(data.widgets)
                    ? data.widgets
                    : Array.isArray(eval(data.widgets))
                        ? eval(data.widgets)
                        : [];
            const updatedWidgets = widgets.map(widget => widget.layout
                    ? {
                        ...widget,
                        layout: {
                            ...widget.layout,
                            y: widget.layout.y ? widget.layout.y : 0,
                        },
                    }
                    : widget);
            this.checkWidgetStructure(updatedWidgets);
            this.setState({
                dashboardID: setDashboardID ? data.dashboardID : this.state.dashboardID,
                widgets:     updatedWidgets,
                haveWidgets: true,
                layout:      this.generateLayout(),
            });
        });

    getWidgetTemplateByProjectId = id => {
        this.fetchProject(id)
            .then(() => {
                this.state.widgets.forEach(widget => {
                    this.addTemplateWidget(widget);
                });
            })
            .catch(response => {
                console.log(response);
                alert("Error downloading the widget list. See console for details.");
            });
    };

    addTemplateWidget = widget => {
        fetch(this.state.theURI + "/create-widget",
              {
                  method: "POST",
                  headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                      projectId: this.state.projectId,
                      dashID: this.state.dashboardID,
                      widgetJSON: JSON.stringify(widget),
                  }),
              })
            .catch(response => {
                console.log(response);
            });
    };

    getNewWidgetForm = () => this.props.addDialog
            ? (
                <React.Fragment>
                    <div className="modal fade show" style={{display: "block"}}>
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title" id="exampleModalLabel">Create Widget</h5>
                                    <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={this.onCancelNewWidget}>
                                        <span aria-hidden="true">×</span>
                                    </button>
                                </div>
                                <div className="modal-body">
                                    <form>
                                        <div className="form-group">
                                            <label htmlFor="widgetTypeSelect">Type</label>
                                            <select
                                                name="widgetTypeSelect"
                                                className="form-control"
                                                value={this.state.selectedWidgetType}
                                                id="widgetTypeSelect"
                                                onChange={e => this.onWidgetTypeSelectChanged(e, "i am anything")}
                                            >
                                                <option value="-1">Please select type</option>
                                                <option label="Image Collection" value="ImageCollection">Image Collection</option>
                                                <option label="Time Series Graph" value="TimeSeries">Time Series Graph</option>
                                                <option label="Statistics" value="statistics">Statistics</option>
                                                <option label="Dual Image Collection" value="DualImageCollection">Dual Image Collection</option>
                                                <option label="Image Asset" value="imageAsset">Image Asset</option>
                                                <option label="Image Collection Asset" value="imageCollectionAsset">Image Collection Asset</option>
                                                <option label="SRTM Digital Elevation Data 30m" value="ImageElevation">SRTM Digital Elevation Data 30m</option>
                                                <option label="Degradation Tool" value="DegradationTool">Degradation Tool</option>
                                                <option label="Polygon Compare" value="polygonCompare">Polygon Compare</option>
                                            </select>
                                        </div>
                                        {this.getBaseMapSelector()}
                                        {this.getDataTypeSelectionControl()}
                                        {this.getSwipeOpacityDefault()}
                                        {this.getDataForm()}
                                    </form>
                                </div>
                                <div className="modal-footer">
                                    {this.getFormButtons()}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"> </div>
                </React.Fragment>
            ) : this.props.copyDialog
                ? (
                    <React.Fragment>
                        <div className="modal fade show" style={{display: "block"}}>
                            <div className="modal-dialog" role="document">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title" id="exampleModalLabel">Copy Widget Layout</h5>
                                        <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={this.onCancelNewWidget}>
                                            <span aria-hidden="true">×</span>
                                        </button>
                                    </div>
                                    <div className="modal-body">
                                        <form>
                                            <div className="form-group">
                                                <label htmlFor="project-filter">Template Filter (Name or ID)</label>
                                                <input
                                                    className="form-control form-control-sm"
                                                    id="project-filter"
                                                    type="text"
                                                    value={this.state.projectFilter}
                                                    onChange={e => this.setState({projectFilter: e.target.value})}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="project-template">From Project</label>
                                                <select
                                                    className="form-control form-control-sm"
                                                    id="project-template"
                                                    name="project-template"
                                                    size="1"
                                                    value={this.state.selectedProjectId}
                                                    onChange={e => this.setWidgetLayoutTemplate(parseInt(e.target.value))}
                                                >
                                                    <option key={0} value={0}>None</option>
                                                    {
                                                        this.state.projectList
                                                            .filter(proj => proj
                                                                && proj.id > 0
                                                                && proj.availability !== "archived"
                                                                && (proj.id + proj.name.toLocaleLowerCase())
                                                                    .includes(this.state.projectFilter.toLocaleLowerCase()))
                                                            .map((proj, uid) => <option key={uid} value={proj.id}>{proj.id} - {proj.name}</option>)
                                                    }
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <span>Warning, selecting a template project will overwrite existing widgets immediately.</span>
                                            </div>
                                        </form>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.onCancelNewWidget}>Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-backdrop fade show"> </div>
                    </React.Fragment>
                ) : "";

    getFormButtons = () => <React.Fragment>
        <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.onCancelNewWidget}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={this.onCreateNewWidget} disabled={!this.state.formReady}>Create</button>
    </React.Fragment>;

    getBaseMapSelector = () => {
        if (["ImageCollection",
             "DualImageCollection",
             "imageAsset",
             "imageCollectionAsset",
             "ImageElevation",
             "DegradationTool",
             "polygonCompare"].includes(this.state.selectedWidgetType)) {
            return (
                <div className="form-group">
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                        <label htmlFor="widgetIndicesSelect">Basemap</label>
                        <button
                            type="button"
                            className="btn btn-sm btn-secondary mb-1"
                            onClick={() => this.getInstitutionImagery(this.state.institutionID)}
                        >
                            Refresh
                        </button>
                    </div>
                    <select
                        name="widgetIndicesSelect"
                        value={this.state.widgetBaseMap}
                        className="form-control"
                        id="widgetIndicesSelect"
                        onChange={this.onDataBaseMapSelectChanged}
                    >
                        {this.state.imagery && this.state.imagery
                            .map(({id, title}) => <option key={id} value={id}>{title}</option>)
                        }
                    </select>
                </div>
            );
        }
    };

    getDataTypeSelectionControl = () => {
        if (["-1", "imageAsset", "imageCollectionAsset", "ImageElevation", "DegradationTool"].includes(this.state.selectedWidgetType)) {
            return <br/>;
        } else if (this.state.selectedWidgetType === "statistics") {
            return <React.Fragment>
                <div className="form-group">
                    <label htmlFor="widgetTitle">Title</label>
                    <input
                        type="text"
                        name="widgetTitle"
                        id="widgetTitle"
                        value={this.state.widgetTitle}
                        className="form-control"
                        onChange={this.onWidgetTitleChange}
                        placeholder={"Enter title"}
                    />
                </div>
            </React.Fragment>;
        } else if (this.state.selectedWidgetType === "ImageCollection") {
            return <React.Fragment>
                <label htmlFor="widgetIndicesSelect">Data</label>
                <select
                    name="widgetIndicesSelect"
                    value={this.state.selectedDataType}
                    className="form-control"
                    id="widgetIndicesSelect"
                    onChange={this.onDataTypeSelectChanged}
                >
                    <option value="-1" className="" >Please select type</option>
                    <option label="NDVI" value="NDVI">NDVI</option>
                    <option label="EVI" value="EVI">EVI</option>
                    <option label="EVI 2" value="EVI2">EVI 2</option>
                    <option label="NDMI" value="NDMI">NDMI</option>
                    <option label="NDWI" value="NDWI">NDWI</option>
                    <option label="LANDSAT 5" value="LANDSAT5">LANDSAT 5</option>
                    <option label="LANDSAT 7" value="LANDSAT7">LANDSAT 7</option>
                    <option label="LANDSAT 8" value="LANDSAT8">LANDSAT 8</option>
                    <option label="Sentinel-2" value="Sentinel2">Sentinel-2</option>
                    <option label="Custom widget" value="Custom">Custom widget</option>
                </select>
            </React.Fragment>;
        } else if (this.state.selectedWidgetType === "DualImageCollection") {
            if (this.state.wizardStep === 1) {
                return <React.Fragment>
                    <h3 className={"mt-4 text-center text-info"}>Dual imageCollection Step 1</h3>
                    <label htmlFor="widgetIndicesSelect">Data</label>
                    <select
                        name="widgetIndicesSelect"
                        value={this.state.selectedDataType}
                        className="form-control"
                        id="widgetIndicesSelect"
                        onChange={this.onDataTypeSelectChanged}
                    >
                        <option value="-1" className="" >Please select type</option>
                        <option label="NDVI" value="NDVI">NDVI</option>
                        <option label="EVI" value="EVI">EVI</option>
                        <option label="EVI 2" value="EVI2">EVI 2</option>
                        <option label="NDMI" value="NDMI">NDMI</option>
                        <option label="NDWI" value="NDWI">NDWI</option>
                        <option label="LANDSAT 5" value="LANDSAT5">LANDSAT 5</option>
                        <option label="LANDSAT 7" value="LANDSAT7">LANDSAT 7</option>
                        <option label="LANDSAT 8" value="LANDSAT8">LANDSAT 8</option>
                        <option label="Sentinel-2" value="Sentinel2">Sentinel-2</option>
                        <option label="Image Asset" value="imageAsset">Image Asset</option>
                        <option label="Image Collection Asset" value="imageCollectionAsset">Image Collection Asset</option>
                        <option label="Custom widget" value="Custom">Custom widget</option>
                    </select>
                </React.Fragment>;
            } else {
                return <React.Fragment>

                    <h3 className={"mt-4 text-center text-info"}>Dual imageCollection Step 2</h3>
                    <label htmlFor="widgetIndicesSelect2">Data 2</label>
                    <select
                        name="widgetIndicesSelect2"
                        value={this.state.selectedDataTypeDual}
                        className="form-control"
                        id="widgetIndicesSelect"
                        onChange={this.onDataTypeSelectChangedDual}
                    >
                        <option value="-1" className="" >Please select type</option>
                        <option label="NDVI" value="NDVI">NDVI 2</option>
                        <option label="EVI" value="EVI">EVI</option>
                        <option label="EVI 2" value="EVI2">EVI 2</option>
                        <option label="NDMI" value="NDMI">NDMI</option>
                        <option label="NDWI" value="NDWI">NDWI</option>
                        <option label="LANDSAT 5" value="LANDSAT5">LANDSAT 5</option>
                        <option label="LANDSAT 7" value="LANDSAT7">LANDSAT 7</option>
                        <option label="LANDSAT 8" value="LANDSAT8">LANDSAT 8</option>
                        <option label="Sentinel-2" value="Sentinel2">Sentinel-2</option>
                        <option label="Image Asset" value="imageAsset">Image Asset</option>
                        <option label="Image Collection Asset" value="imageCollectionAsset">Image Collection Asset</option>
                        <option label="Custom widget" value="Custom">Custom widget</option>
                    </select>

                </React.Fragment>;
            }
        } else if (this.state.selectedWidgetType === "polygonCompare") {
            return "";
        } else {
            return <React.Fragment>
                <label htmlFor="widgetIndicesSelect">Data</label>
                <select
                    name="widgetIndicesSelect"
                    value={this.state.selectedDataType}
                    className="form-control"
                    id="widgetIndicesSelect"
                    onChange={this.onDataTypeSelectChanged}
                >
                    <option value="-1" className="" >Please select type</option>
                    <option label="NDVI" value="NDVI">NDVI</option>
                    <option label="EVI" value="EVI">EVI</option>
                    <option label="EVI 2" value="EVI2">EVI 2</option>
                    <option label="NDMI" value="NDMI">NDMI</option>
                    <option label="NDWI" value="NDWI">NDWI</option>
                    <option label="Custom widget" value="Custom">Custom widget</option>
                </select>
            </React.Fragment>;
        }
    };

    getTitleBlock = () => <div className="form-group">
        <label htmlFor="widgetTitle">Title</label>
        <input
            type="text"
            name="widgetTitle"
            id="widgetTitle"
            value={this.state.widgetTitle}
            className="form-control"
            onChange={this.onWidgetTitleChange}
            placeholder={"Enter title"}
        />
    </div>;

    getSwipeOpacityDefault = () => this.state.selectedWidgetType === "DualImageCollection"
        ? <div className="form-group">
            <label htmlFor="SwipeOpacityDefault">Swipe as default</label>
            <input
                type="checkbox"
                id="SwipeOpacityDefault"
                checked={this.state.swipeAsDefault}
                className="form-control widgetWizardCheckbox"
                onChange={this.onswipeAsDefaultChange}
            />
        </div>
        : "";

    getImageParamsBlock = () => <div className="form-group">
        <label htmlFor="imageParams">Image Parameters (json format)</label>
        <textarea
            className="form-control"
            placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
            onChange={this.onImageParamsChange}
            rows="4"
            value={this.state.imageParams}
            style={{overflow: "hidden", overflowWrap: "break-word", resize: "vertical"}}
        />
    </div>;

    getInstitutionImageryInfo = () => <div>
        Adding imagery to basemaps is available on the&nbsp;
        <a href={`/review-institution?institutionId=${this.state.institutionID}`} target="_blank" rel="noreferrer noopener">
            institution review page
        </a>
        &nbsp;in the imagery tab.
    </div>;

    getNextStepButton = () => this.state.selectedWidgetType === "DualImageCollection"
        ?
            <button
                type="button"
                className="btn btn-secondary"
                data-dismiss="modal"
                onClick={this.onNextWizardStep}
            >
                Step 2 &rArr;
            </button>
        :
            "";

    getDualImageCollectionTimeSpanOption = () => {
        if (this.state.selectedWidgetType === "DualImageCollection") {
            return <div className="form-group">
                <label htmlFor="widgetDualLayer">Dual time span</label>
                <input
                    type="checkbox"
                    name="widgetDualLayer"
                    id="widgetDualLayer"
                    checked={this.state.dualLayer}
                    className="form-control widgetWizardCheckbox"
                    onChange={this.onWidgetDualLayerChange}
                />
            </div>;
        }
    };

    getDateRangeControl = () => <div className="input-group input-daterange" id="range_new_cooked">
        <input
            type="date"
            className="form-control"
            onChange={this.onStartDateChanged}
            value={this.state.startDate}
            placeholder={"YYYY-MM-DD"}
            id="sDate_new_cooked"
        />
        <div className="input-group-addon">to</div>
        <input
            type="date"
            className="form-control"
            onChange={this.onEndDateChanged}
            value={this.state.endDate}
            placeholder={"YYYY-MM-DD"}
            id="eDate_new_cooked"
        />
    </div>;

    getDualLayerDateRangeControl = () => (this.state.dualLayer === true)
            ? <div>
                <label>Select the Date Range for the top layer</label>
                <div className="input-group input-daterange" id="range_new_cooked2">
                    <input
                        type="date"
                        className="form-control"
                        onChange={this.onStartDate2Changed}
                        value={this.state.startDate2}
                        placeholder={"YYYY-MM-DD"}
                        id="sDate_new_cooked2"
                    />
                    <div className="input-group-addon">to</div>
                    <input
                        type="date"
                        className="form-control"
                        onChange={this.onEndDate2Changed}
                        value={this.state.endDate2}
                        placeholder={"YYYY-MM-DD"}
                        id="eDate_new_cooked2"
                    />
                </div>
            </div>
             : "";

    getAvailableBandsControl = () => (this.state.availableBands.length > 0)
            ? <div>
                <label>Available Bands: </label><br />
                <label>{this.state.availableBands}</label>
            </div>
             : "";

    getAvailableBandsControlDual = () => (this.state.availableBandsDual.length > 0)
            ? <div>
                <label>Available Bands: </label><br />
                <label>{this.state.availableBandsDual}</label>
            </div>
             : "";

    getDataForm = () => {
        if (this.state.selectedWidgetType === "ImageElevation") {
            return <React.Fragment>
                {this.getTitleBlock()}
                {this.getImageParamsBlock()}
            </React.Fragment>;
        }
        if (this.state.selectedWidgetType === "polygonCompare") {
            return <React.Fragment>
                {this.getTitleBlock()}
                <div className="form-group">
                    <label htmlFor="featureCollection">GEE Feature Collection Asset</label>
                    <input
                        type="text"
                        name="featureCollection"
                        id="featureCollection"
                        placeholder="users/username/collectionName"
                        value={this.state.featureCollection}
                        className="form-control"
                        onChange={this.onFeatureCollectionChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="matchField">Field to match PLOTID</label>
                    <input
                        type="text"
                        name="matchField"
                        id="matchField"
                        placeholder="OBJECTID"
                        value={this.state.matchField}
                        className="form-control"
                        onChange={this.onMatchFieldChange}
                    />
                </div>
                {this.getImageParamsBlock()}
            </React.Fragment>;
        }
        if (this.state.selectedWidgetType === "DegradationTool") {
            return <React.Fragment>
                {this.getTitleBlock()}
                <div>
                    <label>Available Bands: </label><br />
                    <label>SWIR1,NIR,RED,GREEN,BLUE,SWIR2,NDFI</label>
                </div>
                <div className="form-group">
                    <label htmlFor="graphBand">Band to graph</label>
                    <select
                        name="graphBandDeg"
                        value={this.state.graphBandDeg}
                        className="form-control"
                        id="graphBandDegSelect"
                        onChange={this.onGraphBandDegChange}
                    >
                        <option label="NDFI" value="NDFI" selected>NDFI</option>
                        <option label="SWIR1" value="SWIR1">SWIR1</option>
                        <option label="NIR" value="NIR">NIR</option>
                        <option label="RED" value="RED">RED</option>
                        <option label="GREEN" value="GREEN">GREEN</option>
                        <option label="BLUE" value="BLUE">BLUE</option>
                        <option label="SWIR2" value="SWIR2">SWIR2</option>
                    </select>
                </div>
                <label>Select the Date Range you would like</label>
                {this.getDateRangeControl()}
            </React.Fragment>;
        }
        if (this.state.selectedWidgetType === "imageAsset" || this.state.selectedWidgetType === "imageCollectionAsset") {
            return <React.Fragment>
                {this.getTitleBlock()}
                <div className="form-group">
                    <label htmlFor="imageCollection">GEE Image Asset</label>
                    <input
                        type="text"
                        name="imageCollection"
                        id="imageCollection"
                        placeholder={"LANDSAT/LC8_L1T_TOA"}
                        value={this.state.imageCollection}
                        className="form-control"
                        onChange={this.onImageCollectionChange}
                    />
                </div>
                {this.getAvailableBandsControl()}
                {this.getImageParamsBlock()}
                {this.getInstitutionImageryInfo()}
            </React.Fragment>;
        } else if (this.state.selectedDataType === "-1") {
            return "";
        } else {
            if (["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(this.state.selectedDataType) && this.state.wizardStep === 1) {
                //need to get available bands
                return <React.Fragment>
                    {this.getTitleBlock()}
                    <label>Select the Date Range you would like</label>
                    {this.getDateRangeControl()}
                    {this.getDualImageCollectionTimeSpanOption()}
                    {this.getDualLayerDateRangeControl()}
                    {this.getAvailableBandsControl()}
                    <div className="form-group">
                        <label htmlFor="widgetBands">Bands</label>
                        <input
                            type="text"
                            name="widgetBands"
                            id="widgetBands"
                            value={this.state.widgetBands}
                            className="form-control"
                            onChange={this.onWidgetBandsChange}
                            placeholder={"xx,xx,xx"}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="widgetMin">Min</label>
                        <input
                            type="text"
                            name="widgetMin"
                            id="widgetMin"
                            value={this.state.widgetMin}
                            className="form-control"
                            onChange={this.onWidgetMinChange}
                            placeholder={"-1"}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="widgetMax">Max</label>
                        <input
                            type="text"
                            name="widgetMax"
                            id="widgetMax"
                            value={this.state.widgetMax}
                            className="form-control"
                            onChange={this.onWidgetMaxChange}
                            placeholder={"100"}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="widgetCloudScore">Cloud Score</label>
                        <input
                            type="text"
                            name="widgetCloudScore"
                            id="widgetCloudScore"
                            value={this.state.widgetCloudScore}
                            className="form-control"
                            onChange={this.onWidgetCloudScoreChange}
                            placeholder={"90"}
                        />
                    </div>
                    {this.getNextStepButton()}
                </React.Fragment>;
            } else if (["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(this.state.selectedDataTypeDual) && this.state.wizardStep === 2) {
                return <React.Fragment>
                    <label>Select the Date Range you would like</label>
                    <div className="input-group input-daterange" id="range_new_cooked">
                        <input
                            type="date"
                            className="form-control"
                            onChange={this.onStartDateChangedDual}
                            value={this.state.startDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="sDate_new_cookedDual"
                        />
                        <div className="input-group-addon">to</div>
                        <input
                            type="date"
                            className="form-control"
                            onChange={this.onEndDateChangedDual}
                            value={this.state.endDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="eDate_new_cookedDual"
                        />
                    </div>
                    {this.getAvailableBandsControlDual()}
                    <div className="form-group">
                        <label htmlFor="widgetBands">Bands</label>
                        <input
                            type="text"
                            name="widgetBands"
                            id="widgetBands"
                            value={this.state.widgetBandsDual}
                            className="form-control"
                            onChange={this.onWidgetBandsChangeDual}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="widgetMin">Min</label>
                        <input
                            type="text"
                            name="widgetMin"
                            id="widgetMin"
                            value={this.state.widgetMinDual}
                            className="form-control"
                            onChange={this.onWidgetMinChangeDual}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="widgetMax">Max</label>
                        <input
                            type="text"
                            name="widgetMax"
                            id="widgetMax"
                            value={this.state.widgetMaxDual}
                            className="form-control"
                            onChange={this.onWidgetMaxChangeDual}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="widgetCloudScore">Cloud Score</label>
                        <input
                            type="text"
                            name="widgetCloudScore"
                            id="widgetCloudScore"
                            value={this.state.widgetCloudScoreDual}
                            className="form-control"
                            onChange={this.onWidgetCloudScoreChangeDual}
                        />
                    </div>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        data-dismiss="modal"
                        onClick={this.onPrevWizardStep}
                    >
                        &lArr; Step 1
                    </button>
                </React.Fragment>;
            } else if (((this.state.selectedDataType === "imageCollectionAsset"
                        || this.state.selectedDataType === "imageAsset") && this.state.selectedWidgetType === "DualImageCollection")
                        && this.state.wizardStep === 1) {
                return <React.Fragment>
                    {this.getTitleBlock()}
                    <div className="form-group">
                        <label htmlFor="imageCollection">GEE Image Asset</label>
                        <input
                            type="text"
                            name="imageCollection"
                            id="imageCollection"
                            placeholder={"LANDSAT/LC8_L1T_TOA"}
                            value={this.state.imageCollection}
                            className="form-control"
                            onChange={this.onImageCollectionChange}
                        />
                    </div>
                    {this.getAvailableBandsControl()}
                    <div className="form-group">
                        <label htmlFor="imageParams">Image Parameters (json format)</label>
                        <textarea
                            className="form-control"
                            placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                            onChange={this.onImageParamsChange}
                            rows="4"
                            value={this.state.imageParams}
                            style={{overflow: "hidden", overflowWrap: "break-word", resize: "vertical"}}
                        />
                    </div>
                    {this.getInstitutionImageryInfo()}
                    {this.getNextStepButton()}
                </React.Fragment>;
            } else if (((this.state.selectedDataType === "imageCollectionAsset"
                        || this.state.selectedDataType === "imageAsset")
                        && this.state.selectedWidgetType === "DualImageCollection")
                        && this.state.wizardStep === 2) {
                return <React.Fragment>
                    <div className="form-group">
                        <label htmlFor="imageCollection">GEE Image Asset</label>
                        <input
                            type="text"
                            name="imageCollection"
                            id="imageCollection"
                            placeholder={"LANDSAT/LC8_L1T_TOA"}
                            value={this.state.imageCollectionDual}
                            className="form-control"
                            onChange={this.onImageCollectionChangeDual}
                        />
                    </div>
                    {this.getAvailableBandsControlDual()}
                    <div className="form-group">
                        <label htmlFor="imageParams">Image Parameters (json format)</label>
                        <textarea
                            className="form-control"
                            placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                            onChange={this.onImageParamsChangeDual}
                            rows="4"
                            value={this.state.imageParamsDual}
                            style={{overflow: "hidden", overflowWrap: "break-word", resize: "vertical"}}
                        />
                    </div>
                    {this.getInstitutionImageryInfo()}
                    <button
                        type="button"
                        className="btn btn-secondary"
                        data-dismiss="modal"
                        onClick={this.onPrevWizardStep}
                    >
                        &lArr; Step 1
                    </button>
                </React.Fragment>;
            } else if ((this.state.selectedWidgetType === "ImageCollection"
                        || this.state.selectedWidgetType === "DualImageCollection")
                        && this.state.selectedDataType === "Custom"
                        && this.state.wizardStep === 1) {
                return <React.Fragment>
                    {this.getTitleBlock()}
                    <div className="form-group">
                        <label htmlFor="imageCollection">GEE Image Collection</label>
                        <input
                            type="text"
                            name="imageCollection"
                            id="imageCollection"
                            placeholder={"LANDSAT/LC8_L1T_TOA"}
                            value={this.state.imageCollection}
                            className="form-control"
                            onChange={this.onImageCollectionChange}
                        />
                    </div>
                    {this.getAvailableBandsControl()}
                    <div className="form-group">
                        <label htmlFor="imageParams">Image Parameters (json format)</label>
                        <textarea
                            className="form-control"
                            placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                            onChange={this.onImageParamsChange}
                            rows="4"
                            value={this.state.imageParams}
                            style={{overflow: "hidden", overflowWrap: "break-word", resize: "vertical"}}
                        />

                    </div>
                    <label>Select the Date Range you would like</label>
                    {this.getDateRangeControl()}
                    {this.getInstitutionImageryInfo()}
                    {this.getNextStepButton()}
                </React.Fragment>;
            } else if ((this.state.selectedWidgetType === "ImageCollection"
                        || this.state.selectedWidgetType === "DualImageCollection")
                        && this.state.selectedDataTypeDual === "Custom"
                        && this.state.wizardStep === 2) {
                return <React.Fragment>
                    <div className="form-group">
                        <label htmlFor="imageCollection">GEE Image Collection</label>
                        <input
                            type="text"
                            name="imageCollection"
                            id="imageCollection"
                            placeholder={"LANDSAT/LC8_L1T_TOA"}
                            value={this.state.imageCollectionDual}
                            className="form-control"
                            onChange={this.onImageCollectionChangeDual}
                        />
                    </div>
                    {this.getAvailableBandsControlDual()}
                    <div className="form-group">
                        <label htmlFor="imageParams">Image Parameters (json format)</label>
                        <textarea
                            className="form-control"
                            placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                            onChange={this.onImageParamsChangeDual}
                            rows="4"
                            value={this.state.imageParamsDual}
                            style={{overflow: "hidden", overflowWrap: "break-word", resize: "vertical"}}
                        />

                    </div>
                    <label>Select the Date Range you would like</label>
                    <div className="input-group input-daterange form-group" id="range_new_cooked">
                        <input
                            type="date"
                            className="form-control"
                            onChange={this.onStartDateChangedDual}
                            value={this.state.startDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="sDate_new_cookedDual"
                        />
                        <div className="input-group-addon">to</div>
                        <input
                            type="date"
                            className="form-control"
                            onChange={this.onEndDateChangedDual}
                            value={this.state.endDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="eDate_new_cookedDual"
                        />
                    </div>
                    {this.getInstitutionImageryInfo()}
                    <button
                        type="button"
                        className="btn btn-secondary"
                        data-dismiss="modal"
                        onClick={this.onPrevWizardStep}
                    >
                        &lArr; Step 1
                    </button>
                </React.Fragment>;
            } else if ((this.state.selectedWidgetType === "ImageCollection"
                        || this.state.selectedWidgetType === "DualImageCollection")
                        && this.state.wizardStep === 1) {
                if (this.state.dualLayer === true) {
                    return <React.Fragment>
                        {this.getTitleBlock()}
                        <label>Select the Date Range you would like</label>
                        {this.getDateRangeControl()}
                        {this.getDualImageCollectionTimeSpanOption()}
                        <div>
                            <label>Select the Date Range you would like</label>
                            <div className="input-group input-daterange" id="range_new_cooked2">
                                <input
                                    type="date"
                                    className="form-control"
                                    onChange={this.onStartDate2Changed}
                                    value={this.state.startDate2}
                                    placeholder={"YYYY-MM-DD"}
                                    id="sDate_new_cooked2"
                                />
                                <div className="input-group-addon">to</div>
                                <input
                                    type="date"
                                    className="form-control"
                                    onChange={this.onEndDate2Changed}
                                    value={this.state.endDate2}
                                    placeholder={"YYYY-MM-DD"}
                                    id="eDate_new_cooked2"
                                />
                            </div>
                        </div>
                        {this.getNextStepButton()}
                    </React.Fragment>;
                } else {
                    return <React.Fragment>
                        {this.getTitleBlock()}
                        <label>Select the Date Range you would like</label>
                        {this.getDateRangeControl()}
                        {this.getDualImageCollectionTimeSpanOption()}
                        {this.getNextStepButton()}
                    </React.Fragment>;
                }
            } else if ((this.state.selectedWidgetType === "ImageCollection"
                        || this.state.selectedWidgetType === "DualImageCollection")
                        && this.state.wizardStep === 2) {
                return <React.Fragment>
                    <label>Select the Date Range you would like</label>
                    <div className="input-group input-daterange form-group" id="range_new_cooked">
                        <input
                            type="date"
                            className="form-control"
                            onChange={this.onStartDateChangedDual}
                            value={this.state.startDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="sDate_new_cookedDual"
                        />
                        <div className="input-group-addon">to</div>
                        <input
                            type="date"
                            className="form-control"
                            onChange={this.onEndDateChangedDual}
                            value={this.state.endDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="eDate_new_cookedDual"
                        />
                    </div>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        data-dismiss="modal"
                        onClick={this.onPrevWizardStep}
                    >
                        &lArr; Step 1
                    </button>
                </React.Fragment>;
            } else if (this.state.selectedWidgetType === "TimeSeries" && this.state.selectedDataType === "Custom") {
                return <React.Fragment>
                    {this.getTitleBlock()}
                    <div className="form-group">
                        <label htmlFor="imageCollection">GEE Image Collection</label>
                        <input
                            type="text"
                            name="imageCollection"
                            id="imageCollection"
                            placeholder={"LANDSAT/LC8_L1T_TOA"}
                            value={this.state.imageCollection}
                            className="form-control"
                            onChange={this.onImageCollectionChange}
                        />
                    </div>
                    {this.getAvailableBandsControl()}
                    <div className="form-group">
                        <label htmlFor="graphBand">Band to graph</label>
                        <input
                            type="text"
                            name="graphBand"
                            id="graphBand"
                            placeholder={"B5"}
                            value={this.state.graphBand}
                            className="form-control"
                            onChange={this.onGraphBandChange}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="graphReducer">Reducer</label>
                        <select
                            name="graphReducer"
                            value={this.state.graphReducer}
                            className="form-control"
                            id="widgetIndicesSelect"
                            onChange={this.onGraphReducerChanged}
                        >
                            <option label="Min" value="Min">Min</option>
                            <option label="Max" value="Max">Max</option>
                            <option label="Mean" value="Mean">Mean</option>
                        </select>
                    </div>
                    <label>Select the Date Range you would like</label>
                    {this.getDateRangeControl()}
                </React.Fragment>;
            } else if (this.state.wizardStep === 2) {
                return <React.Fragment>
                    <p>Secondary data form here</p>
                </React.Fragment>;
            } else {
                console.log("nothing doing!");
                return <React.Fragment>
                    {this.getTitleBlock()}
                    <label>Select the Date Range you would like</label>
                    {this.getDateRangeControl()}
                </React.Fragment>;
            }
        }

    };

    onRemoveItem = i => {
        const removedWidget = _.filter(this.state.widgets, function(w) {
            return w.layout.i === i.toString();
        });
        this.deleteWidgetFromServer(removedWidget[0]);
        this.setState({
            widgets: _.reject(this.state.widgets, function(widget) {
                return widget.layout.i === i.toString();
            }),
            layout: _.reject(this.state.layout, function(layout) {
                return layout.i === i.toString();
            }),
        });
    };

    generateLayout = () => {
        const w = this.state.widgets;
        return _.map(w, function(item, i) {
            item.layout.i = i.toString();
            item.layout.minW = 3;
            item.layout.w = item.layout.w >= 3 ? item.layout.w : 3;
            return item.layout;
        });
    };

    onLayoutChange = layout => {
        if (this.state.haveWidgets) {
            const w = this.state.widgets;
            layout.forEach(function (lay, i) {
                w[i].layout = lay;
            });
            this.setState({
                widgets: w,
                layout: layout,
            },
                          this.updateServerWidgets);
        } else {
            this.setState({layout: layout});
        }
    };

    render() {
        const {layout} = this.state;
        return (
            <React.Fragment>
                <ReactGridLayout
                    isDraggable
                    isResizable
                    className={"layout"}
                    items={0}
                    rowHeight={300}
                    cols={12}
                    graphReducer={"Min"}
                    layout={layout}
                    onLayoutChange={this.onLayoutChange}
                >
                    {this.generateDOM()}
                </ReactGridLayout>
                {this.getNewWidgetForm()}
            </React.Fragment>
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <GeoDashNavigationBar
            userName={args.userName || ""}
            page={(addDialog, copyDialog, closeDialogs) =>
                <WidgetLayoutEditor
                    addDialog={addDialog}
                    copyDialog={copyDialog}
                    closeDialogs={closeDialogs}
                />
            }
        />
        ,
        document.getElementById("app")
    );
}

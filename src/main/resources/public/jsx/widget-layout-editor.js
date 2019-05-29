import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";
import RGL, { WidthProvider } from "react-grid-layout";
import jQuery from "jquery";
window.$ = window.jQuery = jQuery;

const ReactGridLayout = WidthProvider(RGL);

class BasicLayout extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            layout: [],
            widgets: [],
            imagery: [],
            isEditing: false,
            addCustomImagery: false,
            selectedWidgetType: "-1",
            selectedDataType: "-1",
            widgetTitle: "",
            imageCollection: "",
            graphBand: "",
            graphReducer: "Min",
            imageParams: "",
            dualLayer: false,
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
            pid: this.getParameterByName("pid"),
            institutionID: this.getParameterByName("institutionId") ? this.getParameterByName("institutionId") : "1",
            theURI: this.props.documentRoot + "/geo-dash",
        };
    }

    static defaultProps = {
        isDraggable: true,
        isResizable: true,
        className: "layout",
        items: 0,
        rowHeight: 300,
        cols: 12,
        graphReducer: "Min",
    };

    getParameterByName = (name, url) => {
        const regex = new RegExp("[?&]" + name.replace(/[\[\]]/g, "\\$&") + "(=([^&#]*)|&|#|$)");
        const results = regex.exec(decodeURIComponent(url || window.location.href)); //regex.exec(url);
        return results
            ? results[2]
                ? decodeURIComponent(results[2].replace(/\+/g, " "))
                : ""
            : null;
    };

    getGatewayPath = (widget, collectionName) => {
        const fts = {
            "LANDSAT5": "Landsat5Filtered",
            "LANDSAT7": "Landsat7Filtered",
            "LANDSAT8": "Landsat8Filtered",
            "Sentinel2": "FilteredSentinel",
        };
        const resourcePath = (widget.filterType && widget.filterType.length > 0)
            ? fts[widget.filterType]
            : (widget.ImageAsset && widget.ImageAsset.length > 0)
                ? "image"
                : (widget.ImageCollectionAsset && widget.ImageCollectionAsset.length > 0)
                    ? "ImageCollectionAsset"
                    : (widget.properties && "ImageCollectionCustom" === widget.properties[0])
                        ? "meanImageByMosaicCollections"
                        : (collectionName.trim().length > 0)
                            ? "cloudMaskImageByMosaicCollection"
                            : "ImageCollectionbyIndex";
        return resourcePath;
    };

    getImageByType = (which) => (which === "getStats")
            ? "/img/statssample.gif"
            : (which.toLowerCase().includes("image") || which === "")
                ? "/img/mapsample.gif"
                : "/img/graphsample.gif";

    componentDidMount() {
        fetch(this.state.theURI + "/id/" + this.state.pid)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                const widgets = Array.isArray(data.widgets)
                    ? data.widgets
                    : Array.isArray(eval(data.widgets))
                        ? eval(data.widgets)
                        : [];
                console.log("before updatedWidgets");
                const updatedWidgets = widgets.map(widget => widget.layout
                    ? {
                        ...widget,
                        layout: {
                            ...widget.layout,
                            y: widget.layout.y ? widget.layout.y : 0,
                        },
                    }
                    : widget);
                console.log("before checkWidgetStructure");
                this.checkWidgetStructure(updatedWidgets);
                console.log("before setState");
                this.setState({
                    dashboardID: data.dashboardID,
                    widgets:     updatedWidgets,
                    haveWidgets: true,
                    layout:      this.generateLayout(),
                });
            })
            .catch(response => {
                console.log(response);
                alert("Error downloading the widget list. See console for details.");
            });
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + this.state.institutionID)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                this.setState({
                    imagery: data,
                    widgetBaseMap: data[0].id,
                });
            })
            .catch(response => {
                console.log(response);
                alert("Error downloading the imagery list. See console for details.");
            });
    }

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
                    h = widget.gridrow.trim().split(" ")[3] !== null ? parseInt(widget.gridrow.trim().split(" ")[3]) : 1;
                }
                // create .layout
                widget.layout = { x : x, y: y, w: w, h: h };
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
                widget.layout = { x : x, y: row, w: parseInt(widget.width), h: h, i:i.toString() };
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
                widget.layout = { x : x, y: row, w: parseInt(widget.width), h: h, i:i.toString() };
            }
            return widget;
        });
        this.setState({ widgets: widgets });
        if (changed) {
            this.updateServerWidgets();
        }
    };

    updateServerWidgets = () => {
        this.state.widgets.forEach( widget => {
            const ajaxurl = this.state.theURI + "/updatewidget/widget/" + widget.id;
            this.serveItUp(ajaxurl, widget);
        });
    };

    serveItUp = (url, widget) => {
        fetch(url,
              {
                  method: "post",
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
        const ajaxurl = this.state.theURI + "/deletewidget/widget/" + widget.id;
        this.serveItUp(ajaxurl, widget);
    };

    generateDOM = () => {
        const x = "x";
        return _.map(this.state.widgets, (widget, i) =>
            <div
                onDragStart={this.onDragStart}
                onDragEnd={this.onDragEnd}
                key={i}
                data-grid={widget.layout}
                className="front widgetEditor-widgetBackground"
                style={{ backgroundImage: "url(" + this.getImageByType(widget.properties[0]) + ")" }}
            >
                <h3 className="widgetEditor title">{widget.name}
                    <span
                        className="remove"
                        onClick={e => {
                            e.stopPropagation(); this.onRemoveItem(i);
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

    addCustomImagery = imagery => {
        if(this.state.addCustomImagery === true) {
            fetch(this.props.documentRoot + "/add-geodash-imagery",
                {
                    method: "post",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(imagery),
                })
                .then(response => {
                    if (!response.ok) {
                        alert("Error adding custom imagery to institution. See console for details.")
                        console.log(response);
                    }
                });
        }
    };

    buildImageryObject = img => {
        console.log(img);
        const gatewayUrl = this.props.documentRoot + "/geo-dash/gateway-request";
        let title = img.filterType.replace(/\w\S*/g, function (word) {
            return word.charAt(0) + word.slice(1).toLowerCase();
        }) + ": " + img.startDate + " to " + img.endDate;
        const ImageAsset = img.ImageAsset ? img.ImageAsset : "";
        const ImageCollectionAsset = img.ImageCollectionAsset ? img.ImageCollectionAsset : "";
        const iObject = {
            institutionId: this.state.institutionID,
            imageryTitle: title,
            imageryAttribution: "Google Earth Engine",
            geeUrl: gatewayUrl,
            geeParams: {
                collectionType: img.collectionType,
                startDate: img.startDate,
                endDate: img.endDate,
                filterType: img.filterType,
                visParams: img.visParams,
                ImageAsset: ImageAsset,
                ImageCollectionAsset: ImageCollectionAsset,
                path:this.getGatewayPath(img),
            },
        };
        if (img.ImageAsset && img.ImageAsset.length > 0) {
            title = img.ImageAsset.substr(img.ImageAsset.lastIndexOf("/") + 1).replace(new RegExp("_", "g"), " ");
            iObject.imageryTitle = title;
            iObject.ImageAsset = img.ImageAsset;
        }
        if (img.ImageCollectionAsset && img.ImageCollectionAsset.length > 0) {
            title = img.ImageCollectionAsset.substr(img.ImageCollectionAsset.lastIndexOf("/") + 1).replace(new RegExp("_", "g"), " ");
            iObject.imageryTitle = title;
            iObject.ImageCollectionAsset = img.ImageCollectionAsset;
        }
        return iObject;

    };

    onWidgetTypeSelectChanged = event => {
        this.setState({
            selectedWidgetType: event.target.value,
            addCustomImagery: false,
            selectedDataType: "-1",
            widgetTitle: "",
            imageCollection: "",
            graphBand: "",
            graphReducer: "Min",
            imageParams: "",
            widgetBaseMap: "osm",
            dualLayer: false,
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

    onDataTypeSelectChanged = event => {
        this.setState({
            selectedDataType: event.target.value,
        });
    };

    onCancelNewWidget = () => {
        this.setState({
            selectedWidgetType: "-1",
            addCustomImagery: false,
            selectedDataTypeDual: "-1",
            isEditing: false,
            selectedDataType: "-1",
            widgetTitle: "",
            imageCollection: "",
            graphBand: "",
            graphReducer: "Min",
            imageParams: "",
            widgetBaseMap: "osm",
            dualLayer: false,
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
        });
    };

    onNextWizardStep = () => {
        this.setState({ wizardStep: 2 });
    };

    onPrevWizardStep = () => {
        this.setState({ wizardStep: 1 });
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
                this.addCustomImagery(this.buildImageryObject(img1));

            }
            if (["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(this.state.selectedDataTypeDual)) {
                img2.filterType = this.state.selectedDataTypeDual !== null ? this.state.selectedDataTypeDual : "";
                img2.visParams = {
                    bands: this.state.widgetBandsDual,
                    min: this.state.widgetMinDual,
                    max: this.state.widgetMaxDual,
                    cloudLessThan: this.state.widgetCloudScoreDual,
                };
                this.addCustomImagery(this.buildImageryObject(img2));
            }
            if (this.state.selectedDataType === "imageAsset") {
                //add image asset parameters
                img1.visParams = JSON.parse(this.state.imageParams);
                img1.imageAsset = this.state.imageCollection;
                this.addCustomImagery(this.buildImageryObject({
                    ImageAsset: this.state.imageCollection,
                    startDate: "",
                    endDate: "",
                    filterType: "",
                    visParams: img1.visParams,
                }));

            }
            if (this.state.selectedDataType === "imageCollectionAsset") {
                //add image asset parameters
                img1.visParams = JSON.parse(this.state.imageParams);
                img1.ImageCollectionAsset = this.state.imageCollection;

                this.addCustomImagery(this.buildImageryObject({
                    ImageCollectionAsset: img1.ImageCollectionAsset,
                    startDate: "",
                    endDate: "",
                    filterType: "",
                    visParams: JSON.parse(this.state.imageParams),
                }));
            }
            if (this.state.selectedDataTypeDual === "imageAsset") {
                //add dual image asset parameters
                img2.visParams = JSON.parse(this.state.imageParamsDual);
                img2.imageAsset = this.state.imageCollectionDual;
                setTimeout( () => {
                    this.addCustomImagery(this.buildImageryObject({
                        ImageAsset: this.state.imageCollectionDual,
                        startDate: "",
                        endDate: "",
                        filterType: "",
                        visParams: JSON.parse(this.state.imageParamsDual),
                    }));
                }, 500);

            }
            if (this.state.selectedDataTypeDual === "imageCollectionAsset") {
                //add dual image asset parameters
                img2.visParams = JSON.parse(this.state.imageParamsDual);
                img2.ImageCollectionAsset = this.state.imageCollectionDual;
                setTimeout(() => {
                    this.addCustomImagery(this.buildImageryObject({
                        ImageCollectionAsset: img2.ImageCollectionAsset,
                        startDate: "",
                        endDate: "",
                        filterType: "",
                        visParams: img2.visParams,
                    }));
                }, 500);

            }
            widget.dualImageCollection.push(img1);
            widget.dualImageCollection.push(img2);
        } else if (this.state.selectedWidgetType === "imageAsset" || this.state.selectedWidgetType === "ImageElevation") {
            widget.properties = ["", "", "", "", ""];
            widget.filterType = "";
            widget.visParams = this.state.imageParams === "" ? {} : JSON.parse(this.state.imageParams);
            widget.ImageAsset = this.state.imageCollection;
            if (this.state.selectedWidgetType === "imageAsset") {
                this.addCustomImagery(this.buildImageryObject({
                    ImageAsset: widget.ImageAsset,
                    startDate: "",
                    endDate: "",
                    filterType: "",
                    visParams: widget.visParams,
                }));
            }
        } else if (this.state.selectedWidgetType === "imageCollectionAsset") {
            widget.properties = ["", "", "", "", ""];
            widget.filterType = "";
            widget.visParams = JSON.parse(this.state.imageParams);
            widget.ImageCollectionAsset = this.state.imageCollection;
            this.addCustomImagery(this.buildImageryObject({
                ImageCollectionAsset: widget.ImageCollectionAsset,
                startDate: "",
                endDate: "",
                filterType: "",
                visParams: widget.visParams,
            }));
        } else {
            const wType = this.state.selectedWidgetType === "TimeSeries"
                ? this.state.selectedDataType.toLowerCase() + this.state.selectedWidgetType
                : this.state.selectedWidgetType === "ImageCollection"
                    ? this.state.selectedWidgetType + this.state.selectedDataType
                    : this.state.selectedWidgetType === "statistics"
                        ? "getStats"
                        : this.state.selectedWidgetType === "ImageElevation"
                            ? "ImageElevation" : "custom";
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

                this.addCustomImagery(this.buildImageryObject({
                    collectionType:"ImageCollection" + this.state.selectedDataType,
                    startDate: this.state.startDate,
                    endDate: this.state.endDate,
                    filterType: widget.filterType,
                    visParams: widget.visParams,
                }));
            }
            widget.dualLayer = this.state.dualLayer;
            if (widget.dualLayer) {
                widget.dualStart = this.state.startDate2;
                widget.dualEnd = this.state.endDate2;
            }
        }

        fetch(this.state.theURI + "/createwidget/widget",
              {
                  method: "post",
                  headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                      pID: this.state.pid,
                      dashID: this.state.dashboardID,
                      widgetJSON: JSON.stringify(widget),
                  }),
              })
            .then(response => {
                if (response.ok) {
                    this.setState({
                        widgets: [...this.state.widgets, widget],
                        addCustomImagery: false,
                        selectedWidgetType: "-1",
                        selectedDataTypeDual: "-1",
                        isEditing: false,
                        selectedDataType: "-1",
                        widgetTitle: "",
                        imageCollection: "",
                        graphBand: "",
                        graphReducer: "Min",
                        imageParams: "",
                        widgetBaseMap: "osm",
                        dualLayer: false,
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
        this.setState({ widgetBaseMap: event.target.value });
    };

    onWidgetTitleChange = event => {
        this.setState({ widgetTitle: event.target.value });
    };

    onaddCustomImageryChange = event => {
        this.setState({ addCustomImagery: event.target.checked });
    };

    onImageCollectionChange = event => {
        this.setState({ imageCollection: event.target.value });
    };

    onGraphBandChange = event => {
        this.setState({ graphBand: event.target.value });
    };

    onGraphReducerChanged = event => {
        this.setState({ graphReducer: event.target.value });
    };

    onImageParamsChange = event => {
        this.setState({ imageParams: event.target.value.replace(/\s/g, "") });
    };

    onWidgetDualLayerChange = event => {
        this.setState({ dualLayer: event.target.checked });
    };

    onWidgetBandsChange = event => {
        this.setState({ widgetBands: event.target.value.replace(/\s/g, "") });
    };

    onWidgetMinChange = event => {
        this.setState({ widgetMin: event.target.value });
    };

    onWidgetMaxChange = event => {
        this.setState({ widgetMax: event.target.value });
    };

    onStartDateChanged = date => {
        if (date.target) {
            if ( date.target.value) {
                this.setState({ startDate: date.target.value });
            } else {
                this.setState({ startDate: "" });
            }
        } else {
            this.setState({ startDate: date });
        }
    };

    onEndDateChanged = date => {
        if (date.target) {
            if (date.target.value) {
                this.setState({ endDate: date.target.value });
            } else {
                this.setState({ endDate: "" });
            }
        } else {
            this.setState({ endDate: date });
            this.setFormStateByDates();
        }
    };

    onWidgetCloudScoreChange = event => {
        this.setState({ widgetCloudScore: event.target.value });
    };

    onImageCollectionChangeDual = event => {
        this.setState({ imageCollectionDual: event.target.value });
    };

    onImageParamsChangeDual = event => {
        this.setState({ imageParamsDual: event.target.value.replace(/\s/g, "") });
    };

    onWidgetBandsChangeDual = event => {
        this.setState({ widgetBandsDual: event.target.value.replace(/\s/g, "") });
    };

    onWidgetMinChangeDual = event => {
        this.setState({ widgetMinDual: event.target.value });
    };

    onWidgetMaxChangeDual = event => {
        this.setState({ widgetMaxDual: event.target.value });
    };

    onWidgetCloudScoreChangeDual = event => {
        this.setState({ widgetCloudScoreDual: event.target.value });
    };

    onStartDateChangedDual = date => {
        if (date.target) {
            if (date.target.value) {
                this.setState({ startDateDual: date.target.value });
            } else {
                this.setState({ startDateDual: "" });
            }
        } else {
            this.setState({ startDateDual: date });
        }
    };

    onEndDateChangedDual = date => {
        if (date.target) {
            if (date.target.value) {
                this.setState({ endDateDual: date.target.value });
            } else {
                this.setState({ endDateDual: "" });
            }
        } else {
            this.setState({ endDateDual: date });
            this.setFormStateByDates(true);
        }
    };

    onDataTypeSelectChangedDual = event => {
        this.setState({
            selectedDataTypeDual: event.target.value.trim(),
            formReady: true,
        });
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
            this.setState({ formReady: isFormReady });
        }
    };

    onStartDate2Changed = date => {
        if (date.target) {
            if (date.target.value) {
                this.setState({ startDate2: date.target.value });
            } else {
                this.setState({ startDate2: "" });
            }
        } else {
            this.setState({ startDate2: date });
        }
    };

    onEndDate2Changed = date => {
        if (date.target) {
            if (date.target.value) {
                this.setState({ endDate2: date.target.value });
            } else {
                this.setState({ endDate2: "" });
            }
        } else {
            this.setState({ endDate2: date });
            this.setFormStateByDates();
        }
    };

    getNewWidgetForm = () => {
        if (this.state.isEditing) {
            return <React.Fragment>
                <div className="modal fade show" style={{ display: "block" }}>
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
                                        </select>
                                    </div>
                                    {this.getBaseMapSelector()}
                                    {this.getDataTypeSelectionControl()}
                                    {this.getDataForm()}
                                </form>
                            </div>
                            <div className="modal-footer">
                                {
                                    this.getFormButtons()
                                }
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-backdrop fade show"> </div>
            </React.Fragment>;
        }
    };

    getFormButtons = () => <React.Fragment>
        <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.onCancelNewWidget}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={this.onCreateNewWidget} disabled={!this.state.formReady}>Create</button>
    </React.Fragment>;

    getBaseMapSelector = () => {
        if (this.state.selectedWidgetType === "ImageCollection"
            || this.state.selectedWidgetType === "DualImageCollection"
            || this.state.selectedWidgetType === "imageAsset"
            || this.state.selectedWidgetType === "imageCollectionAsset"
            || this.state.selectedWidgetType === "ImageElevation") {
            return <React.Fragment>
                <label htmlFor="widgetIndicesSelect">Basemap</label>
                <select
                    name="widgetIndicesSelect"
                    value={this.state.widgetBaseMap}
                    className="form-control"
                    id="widgetIndicesSelect"
                    onChange={this.onDataBaseMapSelectChanged}
                >
                    {this.baseMapOptions()}
                </select>
            </React.Fragment>;
        }
    };

    baseMapOptions = () => _.map(this.state.imagery, function (imagery) {
        return <option key={imagery.id} value={imagery.id}> {imagery.title} </option>;
    });

    getDataTypeSelectionControl = () => {
        if (this.state.selectedWidgetType === "-1") {
            return <br/>;
        } else if (this.state.selectedWidgetType === "statistics") {
            if (this.state.formReady !== true) {
                this.setState({
                    formReady: true,
                });
            }
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
                    />
                </div>
            </React.Fragment>;
        } else if (this.state.selectedWidgetType === "imageAsset"
                    || this.state.selectedWidgetType === "imageCollectionAsset"
                    || this.state.selectedWidgetType === "ImageElevation") {
            if (this.state.formReady !== true) {
                this.setState({
                    formReady: true,
                });
            }
            return <br/>;
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
        />
    </div>;

    getImageParamsBlock = () => <div className="form-group">
        <label htmlFor="imageParams">Image Parameters (json format)</label>
        <textarea
            className="form-control"
            placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
            onChange={this.onImageParamsChange}
            rows="4"
            value={this.state.imageParams}
            style={{ overflow: "hidden", overflowWrap: "break-word", resize: "vertical" }}
        />
    </div>;

    getCustomImageryCheckbox = () => <div className="form-group">
            <label htmlFor="addCustomImagery">Add Asset to institution basemaps</label>
            <input
                type="checkbox"
                name="addCustomImagery"
                id="addCustomImagery"
                value={this.state.addCustomImagery}
                className="form-control"
                onChange={() => this.setState({ addCustomImagery: event.target.checked })}
                style={{width:"auto", display: "inline-block", marginLeft: "8px"}}
            />
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
                    className="form-control"
                    onChange={this.onWidgetDualLayerChange}
                />
            </div>;
        }
    };

    getDateRangeControl = () => <div className="input-group input-daterange" id="range_new_cooked">
        <input
            type="text"
            className="form-control"
            onChange={this.onStartDateChanged}
            value={this.state.startDate}
            placeholder={"YYYY-MM-DD"}
            id="sDate_new_cooked"
        />
        <div className="input-group-addon">to</div>
        <input
            type="text"
            className="form-control"
            onChange={this.onEndDateChanged}
            value={this.state.endDate}
            placeholder={"YYYY-MM-DD"}
            id="eDate_new_cooked"/>
    </div>;

    getDualLayerDateRangeControl = () => {
        if (this.state.dualLayer === true) {
            return <div>
                <label>Select the Date Range for the top layer</label>
                <div className="input-group input-daterange" id="range_new_cooked2">
                    <input
                        type="text"
                        className="form-control"
                        onChange={this.onStartDate2Changed}
                        value={this.state.startDate2}
                        placeholder={"YYYY-MM-DD"}
                        id="sDate_new_cooked2"
                    />
                    <div className="input-group-addon">to</div>
                    <input
                        type="text"
                        className="form-control"
                        onChange={this.onEndDate2Changed}
                        value={this.state.endDate2}
                        placeholder={"YYYY-MM-DD"}
                        id="eDate_new_cooked2"
                    />
                </div>
            </div>;
        }
    };

    getDataForm = () => {
        if (this.state.selectedWidgetType === "ImageElevation") {
            this.setState({
                imageCollection: "USGS/SRTMGL1_003",
            });
            return <React.Fragment>
                {this.getTitleBlock()}
                {this.getImageParamsBlock()}
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
                {this.getImageParamsBlock()}
                {this.getCustomImageryCheckbox()}
            </React.Fragment>;
        } else if (this.state.selectedDataType === "-1") {
            return "";
        } else {
            const gObject = this;
            setTimeout(() => {
                $(".input-daterange input").each(function () {
                    try {
                        const bindEvt = this.id === "sDate_new_cookedDual"
                            ? gObject.onStartDateChangedDual
                            : this.id === "eDate_new_cookedDual"
                                ? gObject.onEndDateChangedDual
                                : this.id === "sDate_new_cooked"
                                    ? gObject.onStartDateChanged
                                    : this.id === "eDate_new_cooked"
                                        ? gObject.onEndDateChanged
                                        : this.id === "sDate_new_cooked2"
                                            ? gObject.onStartDate2Changed : gObject.onEndDate2Changed;
                        console.log("i did this!");
                        $(this).datepicker({
                            changeMonth: true,
                            changeYear: true,
                            dateFormat: "yy-mm-dd",
                            onSelect: function() {
                                bindEvt(this.value);
                            },
                        });
                    } catch (e) {
                        console.warn(e.message);
                    }
                });
            }, 250);
            if (["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(this.state.selectedDataType) && this.state.wizardStep === 1) {
                return <React.Fragment>
                    {this.getTitleBlock()}
                    <label>Select the Date Range you would like</label>
                    {this.getDateRangeControl()}
                    {this.getDualImageCollectionTimeSpanOption()}
                    {this.getDualLayerDateRangeControl()}
                    <div className="form-group">
                        <label htmlFor="widgetBands">Bands</label>
                        <input
                            type="text"
                            name="widgetBands"
                            id="widgetBands"
                            value={this.state.widgetBands}
                            className="form-control"
                            onChange={this.onWidgetBandsChange}
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
                        />
                    </div>
                    {this.getNextStepButton()}
                </React.Fragment>;
            } else if (["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(this.state.selectedDataTypeDual) && this.state.wizardStep === 2) {
                return <React.Fragment>
                    <label>Select the Date Range you would like</label>
                    <div className="input-group input-daterange" id="range_new_cooked">
                        <input
                            type="text"
                            className="form-control"
                            onChange={this.onStartDateChangedDual}
                            value={this.state.startDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="sDate_new_cookedDual"
                        />
                        <div className="input-group-addon">to</div>
                        <input
                            type="text"
                            className="form-control"
                            onChange={this.onEndDateChangedDual}
                            value={this.state.endDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="eDate_new_cookedDual"
                        />
                    </div>
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
                    <div className="form-group">
                        <label htmlFor="imageParams">Image Parameters (json format)</label>
                        <textarea
                            className="form-control"
                            placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                            onChange={this.onImageParamsChange}
                            rows="4"
                            value={this.state.imageParams}
                            style={{ overflow: "hidden", overflowWrap: "break-word", resize: "vertical" }}
                        />
                    </div>
                    {this.getCustomImageryCheckbox()}
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
                    <div className="form-group">
                        <label htmlFor="imageParams">Image Parameters (json format)</label>
                        <textarea
                            className="form-control"
                            placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                            onChange={this.onImageParamsChangeDual}
                            rows="4"
                            value={this.state.imageParamsDual}
                            style={{ overflow: "hidden", overflowWrap: "break-word", resize: "vertical" }}
                        />
                    </div>
                    {this.getCustomImageryCheckbox()}
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
                    <div className="form-group">
                        <label htmlFor="imageParams">Image Parameters (json format)</label>
                        <textarea
                            className="form-control"
                            placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                            onChange={this.onImageParamsChange}
                            rows="4"
                            value={this.state.imageParams}
                            style={{ overflow: "hidden", overflowWrap: "break-word", resize: "vertical" }}
                        />

                    </div>
                    <label>Select the Date Range you would like</label>
                    {this.getDateRangeControl()}
                    {this.getCustomImageryCheckbox()}
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
                    <div className="form-group">
                        <label htmlFor="imageParams">Image Parameters (json format)</label>
                        <textarea
                            className="form-control"
                            placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                            onChange={this.onImageParamsChangeDual}
                            rows="4"
                            value={this.state.imageParamsDual}
                            style={{ overflow: "hidden", overflowWrap: "break-word", resize: "vertical" }}
                        />

                    </div>
                    <label>Select the Date Range you would like</label>
                    <div className="input-group input-daterange form-group" id="range_new_cooked">
                        <input
                            type="text"
                            className="form-control"
                            onChange={this.onStartDateChangedDual}
                            value={this.state.startDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="sDate_new_cookedDual"
                        />
                        <div className="input-group-addon">to</div>
                        <input
                            type="text"
                            className="form-control"
                            onChange={this.onEndDateChangedDual}
                            value={this.state.endDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="eDate_new_cookedDual"
                        />
                    </div>
                    {this.getCustomImageryCheckbox()}
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
                                    type="text"
                                    className="form-control"
                                    onChange={this.onStartDate2Changed}
                                    value={this.state.startDate2}
                                    placeholder={"YYYY-MM-DD"}
                                    id="sDate_new_cooked2"
                                />
                                <div className="input-group-addon">to</div>
                                <input
                                    type="text"
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
                            type="text"
                            className="form-control"
                            onChange={this.onStartDateChangedDual}
                            value={this.state.startDateDual}
                            placeholder={"YYYY-MM-DD"}
                            id="sDate_new_cookedDual"
                        />
                        <div className="input-group-addon">to</div>
                        <input
                            type="text"
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
            this.setState({ layout: layout });
        }
    };

    onAddItem = () => {
        this.setState({ isEditing : true });
    };

    render() {
        const { layout } = this.state;
        return (
            <React.Fragment>
                <button
                    type="button"
                    id="addWidget"
                    onClick={this.onAddItem}
                    className="btn btn-outline-lightgreen btn-sm"
                    style={{ display: "none" }}
                >
                    Add Widget
                </button>
                <ReactGridLayout
                    {...this.props}
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

export function renderWidgetEditorPage(documentRoot) {
    ReactDOM.render(
        <BasicLayout documentRoot={documentRoot}/>,
        document.getElementById("content")
    );
}

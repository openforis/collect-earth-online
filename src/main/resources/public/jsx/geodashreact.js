import React from "react";
import ReactDOM from "react-dom";
import { mercator } from "../js/mercator-openlayers.js";

class Geodash extends React.Component {
    constructor(props) {
        super(props);
        this.state = { widgets: [ ],
            callbackComplete: false,
            left: 0,
            ptop: 0,
            projAOI: getParameterByName("aoi"),
            projPairAOI: ""
        };
        let theSplit = decodeURI(this.state.projAOI).replace("[", "").replace("]", "").split(",");
        this.state.projPairAOI = "[[" + theSplit[0] + "," + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[1] + "]]";
    };
    componentDidMount() {
        fetch(theURL + "/id/" + pid,)
            .then(response => response.json())
            .then(data => data.widgets.map(function(widget){
                widget.isFull = false;
                widget.opacity = "0.9";
                widget.sliderType = "opacity";
                widget.swipeValue = "1.0";
                return widget;}))
            .then(data => this.setState({ widgets: data, callbackComplete: true}));
        window.addEventListener("resize", this.handleResize);
    };
    handleResize = e => {
        this.state.widgets.forEach(function(widget){
            if(graphWidgetArray["widgetgraph_" + widget.id] != null)
            {
                const gwidget = document.getElementById("widgetgraph_" + widget.id);
                graphWidgetArray["widgetgraph_" + widget.id].setSize(gwidget.clientWidth, gwidget.clientHeight, true);
            }
            else if(mapWidgetArray["widgetgraph_" + widget.id] != null){
                mapWidgetArray["widgetmap_" + widget.id].updateSize();
            }
        })
    };
    render() {
        return ( <React.Fragment>
            <Widgets widgets={this.state.widgets}
                     projAOI={this.state.projAOI}
                     projPairAOI={this.state.projPairAOI}
                     onFullScreen={this.handleFullScreen}
                     onOpacityChanged={this.handleOpacityChange}
                     onSliderChange={this.handleSliderChange}
                     onSwipeChange={this.handleSwipeChange}
                     callbackComplete={this.state.callbackComplete}
            />
        </React.Fragment> );
    };
    handleFullScreen = (widget, type) => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        widgets[index].isFull = !widgets[index].isFull;
        this.setState({ widgets },
            function() { this.updateSize(widget, type);}
         );
    };
    handleOpacityChange = (widget, id, evt) => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        widgets[index].opacity = evt.target.value;
        this.setOpacity(evt.target.value, "widgetmap_" + id);
        this.setState({ widgets });
    };
    handleSliderChange = (widget) => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        widgets[index].sliderType = widgets[index].sliderType === "opacity"? "swipe": "opacity";
        this.setState({ widgets });
    };
    handleSwipeChange = (widget, id, evt) => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        widgets[index].swipeValue = evt.target.value;
        this.setState({ widgets });
    };
    updateSize(which, type)
    {
        if(which.isFull)
        {
            document.body.classList.remove("bodyfull");
        }
        else{
            document.body.classList.add("bodyfull");
        }
        const doc = document.documentElement;
        if((window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0) === 0 && (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0) === 0)
        {
            window.scrollTo(this.state.left, this.state.ptop);
            this.state.left = 0;
            this.state.ptop = 0;
        }
        else{
            this.state.left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
            this.state.ptop = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
            window.scrollTo(0,0);
        }
        if(type === "mapwidget"){
            mapWidgetArray["widgetmap_" + which.id].updateSize();
        }
        else if(type === "graphwidget"){
            const gwidget = document.getElementById("widgetgraph_"+ which.id);
            graphWidgetArray["widgetgraph_"+ which.id].setSize(gwidget.clientWidth, gwidget.clientHeight, true);
        }
    }
    setOpacity (value, layerID) {
        try{
            const id = layerID;
            mapWidgetArray[layerID].getLayers().forEach(function (lyr) {
                if (id === lyr.get("id") || id + "_dual" === lyr.get("id")) {
                    lyr.setOpacity(value);
                }
            });
        }
        catch(e){}
    };
}

class Widgets extends React.Component {
    render() {
        if(this.props.widgets.length > 0)
        {
        return ( <div className="row placeholders">
            {this.props.widgets.map(widget => (
                <Widget
                    key={widget.id}
                    id={widget.id}
                    widget={widget}
                    projAOI={this.props.projAOI}
                    projPairAOI={this.props.projPairAOI}
                    onFullScreen ={this.props.onFullScreen}
                    onOpacityChanged = {this.props.onOpacityChanged}
                    opacityValue = {this.props.opacityValue}
                    onSliderChange = {this.props.onSliderChange}
                    onSwipeChange = {this.props.onSwipeChange}
                />
            ))}
        </div> );
        }
        else{
            return ( <div className="row placeholders">
                <div className="placeholder columnSpan3 rowSpan2" style={{gridArea: "1 / 1 / span 2 / span 12"}}>
                    <h1 id="noWidgetMessage" style={{display: this.props.callbackComplete === false? "none" : "block" }}>The Administrator has not configured any Geo-Dash Widgets for this project</h1>
                </div>
            </div> );
        }
    };
}

class Widget extends React.Component {
    constructor(props) {
        super(props);
        this.imageCollectionList = ["ImageCollectionCustom", "addImageCollection", "ndviImageCollection", "ImageCollectionNDVI", "ImageCollectionEVI", "ImageCollectionEVI2", "ImageCollectionNDWI", "ImageCollectionNDMI", "ImageCollectionLANDSAT5", "ImageCollectionLANDSAT7", "ImageCollectionLANDSAT8", "ImageCollectionSentinel2"];
        this.graphControlList = ["customTimeSeries", "timeSeriesGraph", "ndviTimeSeries", "ndwiTimeSeries", "eviTimeSeries", "evi2TimeSeries", "ndmiTimeSeries"];
    };
    render() {
        const {widget} = this.props;
        return (    <React.Fragment>{ this.getWidgetHtml(widget, this.props.onOpacityChanged, this.props.opacityValue, this.props.onSliderChange, this.props.onSwipeChange) }</React.Fragment>);
    };
    getWidgetHtml(widget, onOpacityChanged, opacityValue, onSliderChange, onSwipeChange){
        if(widget.gridcolumn || widget.layout)
        {
            return (<div className={ Widget.getClassNames(widget.isFull, widget.gridcolumn != null? widget.gridcolumn: "", widget.gridrow != null? widget.gridrow: widget.layout != null? "span " + widget.layout.h: "") }
                        style={{gridColumn:widget.gridcolumn != null? widget.gridcolumn: Widget.generategridcolumn(widget.layout.x, widget.layout.w), gridRow:widget.gridrow != null? widget.gridrow: Widget.generategridrow(widget.layout.y, widget.layout.h)}}>
                <div className="panel panel-default" id={"widget_" + widget.id}>
                    <div className="panel-heading">
                        <ul className="list-inline panel-actions pull-right">
                            <li style={{display: "inline"}}>{widget.name}</li>
                            <li style={{display: "inline"}}><a className="list-inline panel-actions panel-fullscreen" onClick={() => this.props.onFullScreen(this.props.widget, this.getWidgetType(widget))}
                                                           role="button" title="Toggle Fullscreen"><i className="fas fa-expand-arrows-alt" style={{color: "#31BAB0"}}></i></a></li>
                        </ul>
                    </div>
                    <div id={"widget-container_" + widget.id} className="widget-container">
                            {this.getWidgetInnerHtml(widget, onOpacityChanged, opacityValue, onSliderChange, onSwipeChange)}
                    </div>
                </div>
            </div>);
        }
        else{
            return (<div className={widget.isFull? "fullwidget columnSpan3 rowSpan1 placeholder": "columnSpan3 rowSpan1 placeholder"}>
                <div className="panel panel-default" id={"widget_" + widget.id}>
                    <div className="panel-heading">
                        <ul className="list-inline panel-actions pull-right">
                            <li style={{display: "inline"}}>{widget.name}</li>
                            <li style={{display: "inline"}}><a className="list-inline panel-actions panel-fullscreen" onClick={() => this.props.onFullScreen(this.props.widget, this.getWidgetType(widget))}
                                                               role="button" title="Toggle Fullscreen"><i className="fas fa-expand-arrows-alt" style={{color: "#31BAB0"}}></i></a></li>
                        </ul>
                    </div>
                    <div id={"widget-container_" + widget.id} className="widget-container">
                        {this.getWidgetInnerHtml(widget, onOpacityChanged, opacityValue, onSliderChange, onSwipeChange)}
                    </div>
                </div>
            </div>);
        }
    };
    static generategridcolumn(x, w){
        return (x + 1) + " / span " + w;
    };
    static generategridrow(x, h){
        return (x + 1) + " / span " + h;
    };
    getWidgetType(awidget)
    {
        if((awidget.dualImageCollection && awidget.dualImageCollection != null) || (awidget.ImageAsset && awidget.ImageAsset.length > 0))
        {
            return "mapwidget";
        }
        let wtext = awidget.properties[0];
        if(this.imageCollectionList.includes(wtext))
        {
            return "mapwidget";
        }else if (this.graphControlList.includes(wtext)) {
            return "graphwidget";
        }else if (wtext === "getStats") {
            return "statswidget";
        }
        else {
            return "undefinedwidget";
        }
    };
    static getClassNames(fullState, c, r)
    {
        let classnames = "placeholder";
        if(fullState)
        {
            classnames += " fullwidget";
        }
        else{
        classnames += c.includes("span 12")? " fullcolumnspan": c.includes("span 9")? " columnSpan9": c.includes("span 6")? " columnSpan6": " columnSpan3";
        classnames += r.includes("span 2")? " rowSpan2": r.includes("span 3")? " rowSpan3": " rowSpan1";
        }
        return classnames;
    };
    getWidgetInnerHtml(widget, onOpacityChanged, opacityValue, onSliderChange, onSwipeChange){
        let wtext = widget.properties[0];
        if(this.imageCollectionList.includes(wtext) || (widget.dualImageCollection && widget.dualImageCollection != null) || (widget.ImageAsset && widget.ImageAsset.length > 0))
        {
            return <div className="front"><MapWidget widget={widget} projAOI={this.props.projAOI} projPairAOI={this.props.projPairAOI} onOpacityChange={onOpacityChanged} opacityValue={opacityValue} onSliderChange={onSliderChange} onSwipeChange={onSwipeChange}/>

            </div>
        }else if (this.graphControlList.includes(wtext)) {
            return <div className="front"><GraphWidget widget={widget} projPairAOI={this.props.projPairAOI} /></div>
        }else if (wtext === "getStats") {
            return <div className="front"><StatsWidget widget={widget} projPairAOI={this.props.projPairAOI} /></div>
        }
        else {
            return <img src="data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==" width ="200" height ="200" className="img-responsive" />;
        }
    };
}

class MapWidget extends React.Component {
    render() {
        const widget = this.props.widget;

        return  <React.Fragment>
                    <div id={"widgetmap_" + widget.id} className="minmapwidget" style={{width:"100%", minHeight:"200px" }}>
                    </div>
            {this.getSliderControl()}
        </React.Fragment>
    };
    getSliderControl(){
        let widget = this.props.widget;
        const onOpacityChange = this.props.onOpacityChange;
        const onSliderChange = this.props.onSliderChange;
        const onSwipeChange = this.props.onSwipeChange;

        if(widget.dualLayer || widget.dualImageCollection){
            const oStyle = {display: widget.sliderType === "opacity"? "block": "none"};
            const sStyle = {display: widget.sliderType === "swipe"? "block": "none"};
           return <div>
                    <input type="button" value={this.props.widget.sliderType === "opacity"? "swipe": "opacity"} style={{width: "80px", float: "left", margin: "8px 0 0 5px"}} onClick={() => onSliderChange(widget)}/>
                    <input type = "range" className = "mapRange dual" id = {"rangeWidget_" + widget.id}
                           value = {this.props.widget.opacity}
                           min = "0"
                           max = "1"
                           step = ".01"
                           onChange = {(evt) => onOpacityChange(widget, widget.id, evt )}
                           onInput = {(evt) => onOpacityChange(widget, widget.id, evt )}
                           style={oStyle}
                    />
               <input type="range" className="mapRange dual" id={"swipeWidget_" + widget.id} min="0" max="1" step=".01" value={this.props.widget.swipeValue}
                      onChange = {(evt) => onSwipeChange(widget, widget.id, evt )}
                      onInput = {(evt) => onSwipeChange(widget, widget.id, evt )}
                      style={sStyle}
               />
                </div>
        }
        else{
            return <input type = "range" className = "mapRange" id = {"rangeWidget_" + widget.id}
                          value = {this.props.widget.opacity}
                          min = "0"
                          max = "1"
                          step = ".01"
                          onChange = {(evt) => onOpacityChange(widget, widget.id, evt )}
                          onInput = {(evt) => onOpacityChange(widget, widget.id, evt )}
            />
        }
    };
    static getRasterByBasemapConfig(basemap)
    {
        let raster;
        if(basemap == null || basemap.id === "osm")
        {
            raster = new ol.layer.Tile({
                source: new ol.source.OSM()
            });
        }
        else{
            const source = mercator.createSource(basemap.sourceConfig);
            raster = new ol.layer.Tile({
                source: source
            });
        }
        return raster;
    };
    static getGatewayUrl(widget, collectionName){
        let url = "";
        if(widget.filterType != null && widget.filterType.length > 0){
            const fts = {"LANDSAT5": "Landsat5Filtered", "LANDSAT7": "Landsat7Filtered", "LANDSAT8":"Landsat8Filtered", "Sentinel2": "FilteredSentinel"};
            url = "https://geegateway.servirglobal.net:8888/" + fts[widget.filterType];
        }
        else if(widget.ImageAsset && widget.ImageAsset.length > 0)
        {
            url = "https://geegateway.servirglobal.net:8888/image";
        }
        else if("ImageCollectionCustom" === widget.properties[0]){
            url = "https://geegateway.servirglobal.net:8888/meanImageByMosaicCollections";
        }
        else if(collectionName.trim().length > 0)
        {
            url = "https://geegateway.servirglobal.net:8888/cloudMaskImageByMosaicCollection";

        }
        else{
            url = "https://geegateway.servirglobal.net:8888/ImageCollectionbyIndex";
        }
        return url;
    };
    static getImageParams(widget){
        let visParams;
        if(widget.visParams) {
            try {
                visParams = JSON.parse(widget.visParams);
            }
            catch (e) {
                console.log('parse issue');
                visParams = widget.visParams;
            }
        }
        else {
            let min;
            let max;
            try {
                if (widget.min > 0) {
                    min = widget.min;
                }

                if (widget.max > 0) {
                    max = widget.max;
                }
            }
            catch (e) {
                //alert(0);
            }
            visParams = {
                min: min,
                max: max,
                bands: widget.bands
            };
        }
        return visParams;
    };
    componentDidMount()
    {
        const widget = this.props.widget;
        const basemap = widget.baseMap;
        const raster =  MapWidget.getRasterByBasemapConfig(basemap);
        let projAOI = this.props.projAOI;
        let projPairAOI= this.props.projPairAOI;

        const mapdiv = "widgetmap_" + widget.id;
        let map = new ol.Map({
            layers: [raster],
            target: mapdiv,
            view: new ol.View({
                center: [0, 0],
                projection: "EPSG:3857",
                zoom: 4
            }),
            id: "widgetmapobject_" + widget.id
        });
        map.getView().on("propertychange", onpropertychange);

        function onpropertychange(){
            map.dispatchEvent("movestart");
            let view = map.getView();
            view.un("propertychange", onpropertychange);
            map.on("moveend", function() {
                view.on("propertychange", onpropertychange);
            });
        }

        map.on("movestart", MapWidget.pauseGeeLayer);
        map.on("moveend", this.resumeGeeLayer);
        mapWidgetArray[mapdiv] = map;

        if (projAOI === "") {
            projAOI = [-108.30322265625, 21.33544921875, -105.347900390625, 23.53271484375];
        } else {
            if (typeof projAOI === "string") {
                projAOI = JSON.parse(projAOI);
            }
        }
        if (projAOI) {
            mapWidgetArray["widgetmap_" + widget.id].getView().fit(
                ol.proj.transform([projAOI[0], projAOI[1]], "EPSG:4326", "EPSG:3857").concat(ol.proj.transform([projAOI[2], projAOI[3]], "EPSG:4326", "EPSG:3857")),
                mapWidgetArray["widgetmap_" + widget.id].getSize()
            );
        } else {
            mapWidgetArray["widgetmap_" + widget.id].getView().fit(
                projAOI,
                mapWidgetArray["widgetmap_" + widget.id].getSize()
            );
        }

        let postObject = {};
        let collectionName = "";
        let dateFrom = "";
        let dateTo = "";
        let requestedIndex = "";
        let url = "";
        let dualImageObject = null;
        let bands = "";
        const ref = this;
        if (widget.properties.length === 5) {
            bands = widget.properties[4];
        }
        widget.bands = bands;
        // let min = "";
        // let max = "0.3";
        // let visParams;

        /*********************Check here if widget is dualImageCollection *********************/
        if(widget.dualImageCollection  && widget.dualImageCollection != null){

            //still have to make the same postObject, but set a different callback to recall for second layer
            // might be best to rewrite the other at the same time.
            //hmmmm, maybe i can handle all of this logic in the callback instead by setting a different variable
            let firstImage = widget.dualImageCollection[0];
            let secondImage = widget.dualImageCollection[1];
            collectionName = firstImage.collectionType;
            requestedIndex = collectionName === "ImageCollectionNDVI" ? "NDVI" : collectionName === "ImageCollectionEVI" ? "EVI" : collectionName === "ImageCollectionEVI2" ? "EVI2" : collectionName === "ImageCollectionNDMI" ? "NDMI" : collectionName === "ImageCollectionNDWI" ? "NDWI" : "";
            collectionName = collectionName === "ImageCollectionNDVI" ? "" : collectionName === "ImageCollectionEVI" ? "" : collectionName === "ImageCollectionEVI2" ? "" : collectionName === "ImageCollectionNDMI" ? "" : collectionName === "ImageCollectionNDWI" ? "" : collectionName;
            dateFrom = firstImage.startDate;
            dateTo = firstImage.endDate;

            let shortWidget = {};
            shortWidget.filterType = firstImage.filterType;
            shortWidget.properties = [];
            shortWidget.properties.push(collectionName);
            url = MapWidget.getGatewayUrl(shortWidget, collectionName);
            shortWidget.visParams = firstImage.visParams;
            shortWidget.min = firstImage.min != null? firstImage.min: "";
            shortWidget.max = firstImage.max != null? firstImage.max: "";
            shortWidget.band = firstImage.band != null? firstImage.band: "";
            postObject.visParams = MapWidget.getImageParams(shortWidget);

            if(postObject.visParams.cloudLessThan) {
                postObject.bands = postObject.visParams.bands;
                postObject.min = postObject.visParams.min;
                postObject.max = postObject.visParams.max;
                postObject.cloudLessThan = parseInt(postObject.visParams.cloudLessThan);
            }



            //Create the fetch object for the second call here
            dualImageObject = {};
            dualImageObject.collectionName = secondImage.collectionType;
            dualImageObject.index = dualImageObject.collectionName === "ImageCollectionNDVI" ? "NDVI" : dualImageObject.collectionName === "ImageCollectionEVI" ? "EVI" : dualImageObject.collectionName === "ImageCollectionEVI2" ? "EVI2" : dualImageObject.collectionName === "ImageCollectionNDMI" ? "NDMI" : dualImageObject.collectionName === "ImageCollectionNDWI" ? "NDWI" : "";
            dualImageObject.collectionName = dualImageObject.collectionName === "ImageCollectionNDVI" ? "" : dualImageObject.collectionName === "ImageCollectionEVI" ? "" : dualImageObject.collectionName === "ImageCollectionEVI2" ? "" : dualImageObject.collectionName === "ImageCollectionNDMI" ? "" : dualImageObject.collectionName === "ImageCollectionNDWI" ? "" : dualImageObject.collectionName;
            dualImageObject.dateFrom = secondImage.startDate;
            dualImageObject.dateTo = secondImage.endDate;
            let shortWidget2 = {};
            shortWidget2.filterType = secondImage.filterType;
            shortWidget2.properties = [];
            shortWidget2.properties.push(dualImageObject.collectionName);

            dualImageObject.url = MapWidget.getGatewayUrl(shortWidget2, dualImageObject.collectionName);

            shortWidget2.visParams = secondImage.visParams;
            shortWidget2.min = secondImage.min != null? secondImage.min: "";
            shortWidget2.max = secondImage.max != null? secondImage.max: "";
            shortWidget2.band = secondImage.band != null? secondImage.band: "";
            if(shortWidget2.visParams && shortWidget2.visParams.cloudLessThan != null) {
                dualImageObject.bands = shortWidget2.visParams.bands;
                dualImageObject.min = shortWidget2.visParams.min;
                dualImageObject.max = shortWidget2.visParams.max;
                dualImageObject.cloudLessThan = parseInt(shortWidget2.visParams.cloudLessThan);
            }



            dualImageObject.visParams = MapWidget.getImageParams(shortWidget2);


        }
        else {

            /***************This is what happens if not***********************/

            collectionName = widget.properties[1];
            dateFrom = widget.properties[2];
            dateTo = widget.properties[3];
            requestedIndex = widget.properties[0] === "ImageCollectionNDVI" ? "NDVI" : widget.properties[0] === "ImageCollectionEVI" ? "EVI" : widget.properties[0] === "ImageCollectionEVI2" ? "EVI2" : widget.properties[0] === "ImageCollectionNDMI" ? "NDMI" : widget.properties[0] === "ImageCollectionNDWI" ? "NDWI" : "";

            url = MapWidget.getGatewayUrl(widget, collectionName);
            postObject.visParams = MapWidget.getImageParams(widget);

            if(postObject.visParams.cloudLessThan) {
                postObject.bands = postObject.visParams.bands;
                postObject.min = postObject.visParams.min;
                postObject.max = postObject.visParams.max;
                postObject.cloudLessThan = parseInt(postObject.visParams.cloudLessThan);
            }
            if(widget.ImageAsset)
            {
                postObject.imageName = widget.ImageAsset;
            }
        }

        postObject.collectionName = collectionName;
        postObject.dateFrom = dateFrom;
        postObject.dateTo= dateTo;
        postObject.geometry= JSON.parse(projPairAOI);
        postObject.index= requestedIndex;

        fetch(url, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(postObject)
        })
        .then(function(res){ return res.json(); })
        .then(function(data) {

            if (data.hasOwnProperty("mapid")) {
                let mapId = data.mapid;
                let token = data.token;
                let dualImage = JSON.stringify(dualImageObject);
                ref.addTileServer(mapId, token, "widgetmap_" + widget.id);
                return true;
            } else {
                console.warn("Wrong Data Returned");
                return false;
            }
        })
            .then(function(isValid){
                if(isValid) {
                   // let secondObject;
                    if (widget.dualLayer) {
                       // secondObject = postObject;
                        postObject.dateFrom = widget.dualStart;
                        postObject.dateTo = widget.dualEnd;

                        fetch(url, {
                            method: "POST",
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(postObject)
                        })
                            .then(function(res){return res.json();})
                            .then(function(data){
                                if (data.hasOwnProperty("mapid")) {
                                    let mapId = data.mapid;
                                    let token = data.token;

                                    ref.addDualLayer(mapId, token, "widgetmap_" + widget.id);
                                } else {
                                    console.warn("Wrong Data Returned");
                                }
                            })
                    }
                    else if (dualImageObject && dualImageObject != null) {
                        let workingObject;
                        try {
                            workingObject = JSON.parse(dualImageObject);
                        }
                        catch (e) {
                            workingObject = dualImageObject;
                        }
                        if (workingObject != null) {
                            fetch(workingObject.url, {
                                method: "POST",
                                headers: {
                                    "Accept": "application/json",
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify(workingObject)
                            })
                                .then(function(res){return res.json();})
                                .then(function(data){
                                    if (data.hasOwnProperty("mapid")) {
                                        let mapId = data.mapid;
                                        let token = data.token;

                                        ref.addDualLayer(mapId, token, "widgetmap_" + widget.id);
                                    } else {
                                        console.warn("Wrong Data Returned");
                                    }
                                })
                        }
                    }
                }
        });

    };
    static pauseGeeLayer(e)
    {
        let layers = e.target.getLayers().getArray();
        layers.forEach(function(lyr){
            if(lyr.get("id") && lyr.get("id").indexOf("widget") === 0){
                lyr.setVisible(false);
            }
        })
    };
    resumeGeeLayer(e)
    {
        if(geeTimeout[e.target.get("target")]){
            window.clearTimeout(geeTimeout[e.target.get("target")]);
            delete geeTimeout[e.target.get("target")];
        }
        geeTimeout[e.target.get("target")] = window.setTimeout(function(){
            let layers = e.target.getLayers().getArray();
            layers.forEach(function(lyr){
                if(lyr.get("id") && lyr.get("id").indexOf("widget") === 0){
                    lyr.setVisible(true);
                }
            })
        }, 1000);
    };
    addTileServer (imageid, token, mapdiv, isDual) {
        let googleLayer = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: "https://earthengine.googleapis.com/map/" + imageid + "/{z}/{x}/{y}?token=" + token
            }),
            id: mapdiv
        });
        let ref = this;
        window.setTimeout(function () {
            mapWidgetArray[mapdiv].addLayer(googleLayer);
            if(!isDual)
            {
                ref.addBuffer(mapWidgetArray[mapdiv]);
            }
        }, 250);
    };
    addDualLayer (imageid, token, mapdiv) {
        let googleLayer = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: "https://earthengine.googleapis.com/map/" + imageid + "/{z}/{x}/{y}?token=" + token
            }),
            id: mapdiv + "_dual"
        });
        mapWidgetArray[mapdiv].addLayer(googleLayer);
        let swipe = document.getElementById("swipeWidget_" + mapdiv.replace("widgetmap_", ""));

        googleLayer.on("precompose", function(event) {
            let ctx = event.context;
            const width = ctx.canvas.width * (swipe.value);
            ctx.save();
            ctx.beginPath();
            ctx.rect(width, 0, ctx.canvas.width - width, ctx.canvas.height);
            ctx.clip();
        });

        googleLayer.on("postcompose", function(event) {
            let ctx = event.context;
            ctx.restore();
        });
        swipe.addEventListener("input", function() {mapWidgetArray[mapdiv].render();}, false);
        this.addBuffer(mapWidgetArray[mapdiv]);
    };
    addBuffer (whichMap) {
        "use strict";
        try {
            //check to see the shape here...
            const bradius = getParameterByName("bradius");
            const bcenter = getParameterByName("bcenter");
            const plotshape = getParameterByName("plotshape");
            const projectID = getParameterByName("pid");
            const plotID = getParameterByName("plotid");
            if (plotshape && plotshape === "square") {
                const centerPoint = new ol.geom.Point(ol.proj.transform(JSON.parse(bcenter).coordinates, "EPSG:4326", "EPSG:3857"));
                const pointFeature = new ol.Feature(centerPoint);
                const poitnExtent = pointFeature.getGeometry().getExtent();
                const bufferedExtent = new ol.extent.buffer(poitnExtent,parseInt(bradius));
                const bufferPolygon = new ol.geom.Polygon(
                    [
                        [[bufferedExtent[0],bufferedExtent[1]],
                            [bufferedExtent[0],bufferedExtent[3]],
                            [bufferedExtent[2],bufferedExtent[3]],
                            [bufferedExtent[2],bufferedExtent[1]],
                            [bufferedExtent[0],bufferedExtent[1]]]
                    ]
                );
                const bufferedFeature = new ol.Feature(bufferPolygon);
                const vectorSource = new ol.source.Vector({});
                vectorSource.addFeatures([bufferedFeature]);
                const layer = new ol.layer.Vector({
                    source: vectorSource,
                    style: [
                        new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: "#8b2323",
                                width: 2
                            }),
                            fill: null
                        })
                    ]
                });
                whichMap.addLayer(layer);
            }
            else if(plotshape && plotshape === "circle") {
                const circle = new ol.geom.Circle(ol.proj.transform(JSON.parse(bcenter).coordinates, "EPSG:4326", "EPSG:3857"), bradius * 1);
                const CircleFeature = new ol.Feature(circle);
                let vectorSource = new ol.source.Vector({});
                vectorSource.addFeatures([CircleFeature]);
                const layer = new ol.layer.Vector({
                    source: vectorSource,
                    style: [
                        new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: "#8b2323",
                                width: 2
                            }),
                            fill: null
                        })
                    ]
                });
                whichMap.addLayer(layer);
            }
            else{

                fetch(theURL.replace("/geo-dash", "") + "/get-project-plot/" + projectID + "/" + plotID)
                    .then(function(res){return res.json();})
                    .then(function(data){
                        const _geojson_object = typeof(data) === "string" ? JSON.parse(data) : data;
                        const vectorSource = mercator.geometryToVectorSource(mercator.parseGeoJson(_geojson_object.geom, true));
                        let mapConfig = {};
                        mapConfig.map = whichMap;
                        const style = [
                            new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    color: "yellow",
                                    width: 3
                                }),
                                fill: null
                            })
                        ];
                        mercator.addVectorLayer(mapConfig, "geeLayer", vectorSource, style);

                        if (_geojson_object.samples) {
                            _geojson_object.samples.forEach(function (element) {
                                const vectorSource = mercator.geometryToVectorSource(mercator.parseGeoJson(element.geom, true));
                                mercator.addVectorLayer(mapConfig, "geeLayer", vectorSource, style);
                            });
                        }
                    })
            }
        } catch (e) {
            console.warn("buffer failed: " + e.message);
        }
    };
}

class GraphWidget extends React.Component {
    constructor(props){
        super(props);
        Date.prototype.yyyymmdd = function() {
            let mm = this.getMonth() + 1; // getMonth() is zero-based
            let dd = this.getDate();

            return [this.getFullYear(),
                (mm>9 ? "" : "0") + mm,
                (dd>9 ? "" : "0") + dd
            ].join("-");
        };
    }
    render() {
        const widget = this.props.widget;
        return <div id={"widgetgraph_" + widget.id} className="minmapwidget">
            <div id={"graphcontainer_" + widget.id} className="minmapwidget graphwidget normal">
            </div>
            <h3 id={"widgettitle_" + widget.id} />
        </div>
    };
    componentDidMount()
    {
        const widget = this.props.widget;
        let collectionName = widget.properties[1];
        let indexName = widget.properties[4];
        let date = new Date();
        let url = collectionName.trim().length > 0 ? "https://geegateway.servirglobal.net:8888/timeSeriesIndex":  "https://geegateway.servirglobal.net:8888/timeSeriesIndex2";
        const ref = this;
        fetch(url, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                collectionNameTimeSeries: collectionName,
                geometry: JSON.parse(this.props.projPairAOI),
                indexName: widget.graphBand != null? widget.graphBand: indexName,
                dateFromTimeSeries: widget.properties[2].trim().length === 10 ? widget.properties[2].trim() : "2000-01-01",
                dateToTimeSeries: widget.properties[3].trim().length === 10 ? widget.properties[3].trim() :  date.yyyymmdd(),
                reducer: widget.graphReducer != null? widget.graphReducer.toLowerCase(): '',
                scale: 200
            })
        })
            .then(function(res){return res.json();})
            .then(function(data)
            {
                if (data.errMsg) {
                    console.warn(data.errMsg);
                } else {
                    if (data.hasOwnProperty("timeseries")) {

                        let timeseriesData = [];
                        data.timeseries.forEach(function (value) {
                            if (value[0] !== null) {
                                timeseriesData.push([value[0], value[1]]);
                            }
                        });
                        timeseriesData = timeseriesData.sort(ref.sortData);

                        graphWidgetArray["widgetgraph_" + widget.id] = ref.createChart(widget.id, indexName, timeseriesData, indexName);
                        graphWidgetArray["widgetgraph_" + widget.id].id = widget.id;
                    } else {
                        console.warn("Wrong Data Returned");
                    }
                }
            })
    };
    sortData(a, b){
        if (a[0] < b[0]) return -1;
        if (a[0] > b[0]) return 1;
        return 0;
    }

    createChart (wIndex, wText, wTimeseriesData, indexName) {
        "use strict";
        return Highcharts.chart("graphcontainer_" + wIndex, {
            chart: {
                zoomType: "x"
            },
            title: {
                text: ""
            },
            subtitle: {
                text: document.ontouchstart === undefined
                    ? "Click and drag in the plot area to zoom in"
                    : "Pinch the chart to zoom in"
            },
            xAxis: {
                type: "datetime"
            },
            yAxis: {
                title: {
                    text: wText
                }
            },
            legend: {
                enabled: false
            },
            plotOptions: {
                area: {
                    connectNulls: indexName.toLowerCase() == "custom" ? true : false,
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1
                        },
                        stops: [
                            [0, "#31bab0"],
                            [1, Highcharts.Color("#31bab0").setOpacity(0).get("rgba")]
                        ]
                    },
                    marker: {
                        radius: 2
                    },
                    lineWidth: 1,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    threshold: null
                }
            },
            tooltip: {
                pointFormat: "Value: {point.y}"
            },
            series: [{
                type: "area",
                name: wText,
                data: wTimeseriesData,
                color: "#31bab0"
            }]
        }, function () {
            document.getElementById("widgettitle_" + wIndex).innerHTML = wText;
            document.getElementsByClassName("highcharts-yaxis")[0].firstChild.innerHTML = wText;
        });
    };
}
class StatsWidget extends React.Component {
    render() {
        const widget = this.props.widget;
            return <div id={"widgetstats_" + widget.id} className="minmapwidget" style={{padding: "20px"}}>
                        <div>
                            <div className="form-group">
                                <div className="input-group">
                                    <div className="input-group-addon">
                                        <img src="img/icon-population.png" style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "25px", backgroundColor: "#31bab0"}}/>
                                    </div>
                                    <label htmlFor={"totalPop_" + widget.id} style={{color: "#787878", padding: "10px 20px"}}>Total population</label>
                                    <h3 id={"totalPop_" + widget.id} style={{
                                        color: "#606060",
                                        fontSize: "16px", fontWeight: "bold", paddingTop: "12px"}}></h3>
                                </div>
                            </div>
                            <div className="form-group">
                                <div className="input-group">
                                    <div className="input-group-addon">
                                        <img src="img/icon-area.png" style={{
                                            width: "50px",
                                            height: "50px",
                                            borderRadius: "25px", backgroundColor: "#31bab0"}}/>
                                    </div>
                                    <label htmlFor={"totalArea_" + widget.id} style={{color: "#787878", padding: "10px 20px"}}>Area</label>
                                <h3 id={"totalArea_" + widget.id} style={{
                                    color: "#606060",
                                    fontSize: "16px", fontWeight: "bold", paddingTop: "12px"}}></h3>
                                </div>
                            </div>
                            <div className="form-group">
                                <div className="input-group">
                                    <div className="input-group-addon">
                                        <img src="img/icon-elevation.png" style={{
                                            width: "50px",
                                            height: "50px",
                                            borderRadius: "25px", backgroundColor: "#31bab0"}}/>
                                    </div>
                                    <label htmlFor={"elevationRange_" + widget.id} style={{color: "#787878", padding: "10px 20px"}}>Elevation</label>
                                    <h3 id={"elevationRange_" + widget.id} style={{color: "#606060", fontSize: "16px", fontWeight: "bold", paddingTop: "12px"}}></h3>
                                </div>
                            </div>
                        </div>
                    </div>
        };

    componentDidMount() {
        const ref = this;
        const widget = this.props.widget;
        const projPairAOI = this.props.projPairAOI;
        fetch("https://geegateway.servirglobal.net:8888/getStats", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                paramValue: JSON.parse(projPairAOI)
            })
        })
            .then(function(res){return res.json();})
            .then(function(data) {
                if (data.errMsg) {
                    console.warn(e.message + _textStatus + _jqXHR);
                } else {
                    document.getElementById("totalPop_" + widget.id).innerHTML = ref.numberWithCommas(data.pop);
                    document.getElementById("totalArea_" + widget.id).innerHTML = ref.calculateArea(JSON.parse(projPairAOI)) + " ha";
                    document.getElementById("elevationRange_" + widget.id).innerHTML = ref.numberWithCommas(data.minElev) + " - " + ref.numberWithCommas(data.maxElev) + " m";

                }
            })
    };
    calculateArea (poly) {
        const sphere = new ol.Sphere(6378137);
        const area_m = sphere.geodesicArea(poly);
        let area_ha = area_m / 10000;
        if (area_ha < 0) {
            area_ha = area_ha * -1;
        }
        area_ha = Math.round(area_ha * Math.pow(10, 4)) / Math.pow(10, 4);
        return this.numberWithCommas(area_ha);
    }
    numberWithCommas(x) {
        if (typeof x === "number") {
            try {
                const parts = x.toString().split(".");
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                return parts.join(".");
            } catch (e) {
                console.warn(e.message);
            }
        }
        return "N/A";
    }
    calculateArea (poly) {
        const sphere = new ol.Sphere(6378137);
        const area_m = sphere.geodesicArea(poly);
        let area_ha = area_m / 10000;
        if (area_ha < 0) {
            area_ha = area_ha * -1;
        }
        area_ha = Math.round(area_ha * Math.pow(10, 4)) / Math.pow(10, 4);
        return this.numberWithCommas(area_ha);
    }
}

/* Todo: move these variables into the component */
let geeTimeout = {};
let mapWidgetArray = [];
let graphWidgetArray = [];

export function renderGeodashPage(args) {
    ReactDOM.render(
        <Geodash/>,
        document.getElementById("dashHolder")
    );
}

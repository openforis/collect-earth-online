var debugreturn;
var gObject;
class Geodash extends React.Component {
    constructor(props) {
        super(props);
        this.state = { widgets: [ ], callbackComplete: false };
        gObject = this;
    }
    componentDidMount() {
        fetch(theURL + "/id/" + pid,)
            .then(response => response.json())
            .then(data => data.widgets.map(function(widget){
                widget.isFull = false;
                widget.opacity = '0.9';
                widget.sliderType = 'opacity';
                widget.swipeValue = '1.0';
                return widget;}))
            .then(data => debugreturn = data)
            .then(data => this.setState({ widgets: data, callbackComplete: true}))

            ;
    }
    render() {
        return ( <React.Fragment>
            <Widgets
                widgets={this.state.widgets}
                projAOI={this.state.projAOI}
                onFullScreen = {this.handleFullScreen}
                onOpacityChanged = {this.handleOpacityChange}
                onSliderChange = {this.handleSliderChange}
                onSwipeChange = {this.handleSwipeChange}
                callbackComplete = {this.state.callbackComplete}
            />
        </React.Fragment> );
    }
    handleFullScreen = (widget, type) => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        widgets[index].isFull = !widgets[index].isFull;
        this.setState({ widgets },
            function() {updateSize(widget, type);}
         );
    };
    handleOpacityChange = (widget, id, evt) => {

        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        widgets[index].opacity = evt.target.value;
        setOpacity($("#rangeWidget_" + id).val(), 'widgetmap_' + id);
        this.setState({ widgets });
    };
    handleSliderChange = (widget, id, evt) => {

        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        console.log('change slider');
        widgets[index].sliderType = widgets[index].sliderType == 'opacity'? 'swipe': 'opacity';
        // setOpacity($("#rangeWidget_" + id).val(), 'widgetmap_' + id);
        this.setState({ widgets });
    };
    handleSwipeChange = (widget, id, evt) => {

        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        widgets[index].swipeValue = evt.target.value;
        // setOpacity($("#rangeWidget_" + id).val(), 'widgetmap_' + id);
        this.setState({ widgets });
    };
}
$( window ).resize(function() {
    if($(".placeholder.fullwidget").length > 0)
    {
        var id = $(".placeholder.fullwidget")[0].childNodes[0].id.substring($(".placeholder.fullwidget")[0].childNodes[0].id.indexOf('_') + 1);
        if(graphWidgetArray["widgetgraph_" + id] != null)
        {
            graphWidgetArray['widgetgraph_' + id].setSize($('#widgetgraph_' + id).outerWidth(), $('#widgetgraph_' + id).outerHeight(), true);
        }
        else if(mapWidgetArray["widgetgraph_" + id] != null){
            mapWidgetArray["widgetmap_" + id].updateSize();
        }
    }
});
function updateSize(which, type)
{
    $('body').toggleClass('bodyfull');
    var doc = document.documentElement;
    if((window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0) == 0 && (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0) == 0)
    {
        window.scrollTo(left, ptop);
        left = 0;
        ptop = 0;
    }
    else{
        left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
        ptop = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
        window.scrollTo(0,0);
    }
    if(type === 'mapwidget'){
    mapWidgetArray["widgetmap_" + which.id].updateSize();
    }
    else if(type === 'graphwidget'){
        graphWidgetArray['widgetgraph_'+ which.id].setSize($('#widgetgraph_'+ which.id).outerWidth(), $('#widgetgraph_'+ which.id).outerHeight(), true);
    }
}


class Widgets extends React.Component {
    render() {
        if(this.props.widgets.length > 0)
        {
        return ( <div className="row placeholders">
            {this.props.widgets.map(widget => (
                <Widget
                    key={widget.id}
                    widget={widget}
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
                    <h1 id="noWidgetMessage" style={{display: this.props.callbackComplete == false? 'none' : 'block' }}>The Administrator has not configured any Geo-Dash Widgets for this project</h1>
                </div>
            </div> );
        }
    }
}

class Widget extends React.Component {
    constructor(props) {
        super(props);
        this.imageCollectionList = ["addImageCollection", "ndviImageCollection", "ImageCollectionNDVI", "ImageCollectionEVI", "ImageCollectionEVI2", "ImageCollectionNDWI", "ImageCollectionNDMI", "ImageCollectionLANDSAT5", "ImageCollectionLANDSAT7", "ImageCollectionLANDSAT8", "ImageCollectionSentinel2"];
        this.graphControlList = ["timeSeriesGraph", "ndviTimeSeries", "ndwiTimeSeries", "eviTimeSeries", "evi2TimeSeries", "ndmiTimeSeries"];
    }
    render() {
        const {key, widget, isFull} = this.props;
        return (    <React.Fragment>{ this.getWidgetHtml(widget, this.props.onOpacityChanged, this.props.opacityValue, this.props.onSliderChange, this.props.onSwipeChange) }</React.Fragment>);
    }
    getWidgetHtml(widget, onOpacityChanged, opacityValue, onSliderChange, onSwipeChange){
        if(widget.gridcolumn || widget.layout)
        {
            return (<div className={ this.getClassNames(widget.isFull, widget.gridcolumn != null? widget.gridcolumn: '', widget.gridrow != null? widget.gridrow: widget.layout != null? 'span ' + widget.layout.h: '') }
                        style={{gridColumn:widget.gridcolumn != null? widget.gridcolumn: this.generategridcolumn(widget.layout.x, widget.layout.w), gridRow:widget.gridrow != null? widget.gridrow: this.generategridrow(widget.layout.y, widget.layout.h)}}>
                <div className="panel panel-default" id={"widget_" + widget.id}>
                    <div className="panel-heading">
                        <ul className="list-inline panel-actions pull-right">
                            <li style={{display: "inline"}}>{widget.name}</li>
                            <li style={{display: "inline"}}><a className="list-inline panel-actions panel-fullscreen" onClick={() => this.props.onFullScreen(this.props.widget, this.getWidgetType(widget.properties[0]))}
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
            return (<div className={widget.isFull? 'fullwidget columnSpan3 rowSpan1 placeholder': 'columnSpan3 rowSpan1 placeholder'}>
                <div className="panel panel-default" id={"widget_" + widget.id}>
                    <div className="panel-heading">
                        <ul className="list-inline panel-actions pull-right">
                            <li style={{display: "inline"}}>{widget.name}</li>
                            <li style={{display: "inline"}}><a className="list-inline panel-actions panel-fullscreen" onClick={() => this.props.onFullScreen(this.props.widget, this.getWidgetType(widget.properties[0]))}
                                                               role="button" title="Toggle Fullscreen"><i className="fas fa-expand-arrows-alt" style={{color: "#31BAB0"}}></i></a></li>
                        </ul>
                    </div>
                    <div id={"widget-container_" + widget.id} className="widget-container">

                        {this.getWidgetInnerHtml(widget, onOpacityChanged, opacityValue, onSliderChange, onSwipeChange)}

                    </div>
                </div>
            </div>);
        }
    }
    generategridcolumn(x, w){
        return (x + 1) + ' / span ' + w;
    }
    generategridrow(x, h){
        return (x + 1) + ' / span ' + h;
    }
    getWidgetType(wtext)
    {
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
    }
    getClassNames(fullState, c, r)
    {
        let classnames = 'placeholder';
        if(fullState)
        {
            classnames += " fullwidget";
        }
        else{
        classnames += c.includes("span 12")? " fullcolumnspan": c.includes("span 9")? " columnSpan9": c.includes("span 6")? " columnSpan6": " columnSpan3";
        classnames += r.includes("span 2")? " rowSpan2": r.includes("span 3")? " rowSpan3": " rowSpan1";
        }
        return classnames;
    }
    getWidgetInnerHtml(widget, onOpacityChanged, opacityValue, onSliderChange, onSwipeChange){
        let wtext = widget.properties[0];
        let control;
        let slider;
        if(this.imageCollectionList.includes(wtext))
        {
            return <div className="front"><MapWidget widget={widget} onOpacityChange={onOpacityChanged} opacityValue={opacityValue} onSliderChange={onSliderChange} onSwipeChange={onSwipeChange}/>

            </div>
        }else if (this.graphControlList.includes(wtext)) {
            return <div className="front"><GraphWidget widget={widget}/></div>
        }else if (wtext === "getStats") {
            return <div className="front"><StatsWidget widget={widget}/></div>
        }
        else {
            return <img src="data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==" width ="200" height ="200"className="img-responsive" />;
        }
    }

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
        var widget = this.props.widget;
        const onOpacityChange = this.props.onOpacityChange;
        const onSliderChange = this.props.onSliderChange;
        const onSwipeChange = this.props.onSwipeChange;

        const widgetId = "widgetmap_" + widget.id;
        if(widget.dualLayer){
            var oStyle = {display: widget.sliderType == 'opacity'? 'block': 'none'};
            var sStyle = {display: widget.sliderType == 'swipe'? 'block': 'none'};
           return <div>
                    <input type="button" value={this.props.widget.sliderType == 'opacity'? 'swipe': 'opacity'} style={{width: "80px", float: "left", margin: "8px 0 0 5px"}} onClick={(evt) => onSliderChange(widget, widget.id, evt)}/>
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
    }
    componentDidMount()
    {
        const widget = this.props.widget;
        var raster;
        var basemap = widget.baseMap;
        console.log('basemap: ' + basemap);
        if(basemap == null || basemap.id == 'osm')
        {
            raster = new ol.layer.Tile({
                source: new ol.source.OSM()
            });
        }
        else{
            var source = mercator.createSource(widget.baseMap.sourceConfig)
            raster = new ol.layer.Tile({
                source: source
            });
        }
        //raster.id = "geeLayer";
        var mapdiv = "widgetmap_" + widget.id;
        var map = new ol.Map({
            layers: [raster],
            target: mapdiv,
            view: new ol.View({
                center: [0, 0],
                projection: "EPSG:3857",
                zoom: 4
            }),
            id: "widgetmapobject_" + widget.id
        });
        map.getView().on('propertychange', onpropertychange);

        function onpropertychange(){
            map.dispatchEvent('movestart');
            var view = map.getView();
            view.un('propertychange', onpropertychange);
            map.on('moveend', function() {
                view.on('propertychange', onpropertychange);
            });
        }

        map.on("movestart", this.pauseGeeLayer);
        map.on("moveend", this.resumeGeeLayer);
        mapWidgetArray[mapdiv] = map;

        if (projAOI === "") {
            projAOI = [-108.30322265625, 21.33544921875, -105.347900390625, 23.53271484375];
        } else {
            if (typeof projAOI === "string") {
                projAOI = $.parseJSON(projAOI);
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
        var postObject = {};
        var collectionName = widget.properties[1];
        var dateFrom = widget.properties[2];
        var dateTo = widget.properties[3];
        var requestedIndex = widget.properties[0] === "ImageCollectionNDVI"? 'NDVI': widget.properties[0] === "ImageCollectionEVI"? 'EVI': widget.properties[0] === "ImageCollectionEVI2"? 'EVI2': widget.properties[0] === "ImageCollectionNDMI"? 'NDMI': widget.properties[0] === "ImageCollectionNDWI"? 'NDWI': '';
        var url = '';
        if(widget.filterType != null && widget.filterType.length > 0){
            var fts = {'LANDSAT5': 'Landsat5Filtered', 'LANDSAT7': 'Landsat7Filtered', 'LANDSAT8':'Landsat8Filtered', 'Sentinel2': 'FilteredSentinel'}
            url = "http://collect.earth:8888/" + fts[widget.filterType]
        }
        else if(collectionName.trim().length > 0)
        {
            url = "http://collect.earth:8888/cloudMaskImageByMosaicCollection";
        }
        else{
            url = "http://collect.earth:8888/ImageCollectionbyIndex";
        }
        var bands = "";
        if (widget.properties.length === 5) {
            bands = widget.properties[4];
        }
        var min = "";
        var max = "0.3";
        var visParams;
        var postObject = {};
        postObject.collectionName = collectionName;
        postObject.dateFrom = dateFrom;
        postObject.dateTo= dateTo;
        postObject.geometry= $.parseJSON(projPairAOI);
        postObject.index= requestedIndex;
        if(widget.visParams)
        {
            postObject.bands = widget.visParams.bands;
            postObject.min = widget.visParams.min;
            postObject.max = widget.visParams.max;
            postObject.cloudLessThan = parseInt(widget.visParams.cloudLessThan);
        }
        else {
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
                bands: bands
            };
            postObject.visParams = visParams;
        }


        $.ajax({
            url: url,
            type: "POST",
            async: true,
            indexVal: widget.id,
            dualLayer: widget.dualLayer,
            dualStart: widget.dualStart,
            dualEnd: widget.dualEnd,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify(postObject),
            postObject: JSON.stringify(postObject)
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.warn(jqXHR + textStatus + errorThrown);
        }).done(function (data, _textStatus, _jqXHR) {
            if (data.errMsg) {
                console.info(data.errMsg);
            } else {
                if (data.hasOwnProperty("mapid")) {
                    var mapId = data.mapid;
                    var token = data.token;
                    var $this = this;
                    var dualLayer = $this.dualLayer;
                    addTileServer(mapId, token, "widgetmap_" + $this.indexVal);
                    if(dualLayer)
                    {
                        console.log('dual');
                        //console.log($this.postObject);
                        console.log('dualStart: ' + $this.dualStart);
                        console.log('dualEnd: ' + $this.dualEnd);
                        var secondObject = JSON.parse($this.postObject);
                        secondObject.dateFrom = $this.dualStart;
                        secondObject.dateTo = $this.dualEnd;
                        sajax = secondObject;
                        $.ajax({
                            url: url,
                            type: "POST",
                            async: true,
                            indexVal: $this.indexVal,
                            crossDomain: true,
                            contentType: "application/json",
                            data: JSON.stringify(secondObject)
                        }).fail(function (jqXHR, textStatus, errorThrown) {
                            console.warn(jqXHR + textStatus + errorThrown);
                        }).done(function (data, _textStatus, _jqXHR) {
                            if (data.errMsg) {
                                console.info(data.errMsg);
                            } else {
                                if (data.hasOwnProperty("mapid")) {
                                    var mapId = data.mapid;
                                    var token = data.token;
                                    var $this = this;
                                    var dualLayer = $this.dualLayer;
                                    addDualLayer(mapId, token, "widgetmap_" + $this.indexVal);
                                } else {
                                    console.warn("Wrong Data Returned");
                                }
                            }
                        });



                    }
                } else {
                    console.warn("Wrong Data Returned");
                }
            }
        });

    }
    pauseGeeLayer(e)
    {
        whatise = e;
        var layers = e.target.getLayers().getArray();
        layers.forEach(function(lyr){
            if(lyr.get('id') && lyr.get('id').indexOf('widget') ==0){
                lyr.setVisible(false);
            }
        })
    }
    resumeGeeLayer(e)
    {
        if(geeTimeout[e.target.get('target')]){
            window.clearTimeout(geeTimeout[e.target.get('target')]);
            delete geeTimeout[e.target.get('target')];
        }
        geeTimeout[e.target.get('target')] = window.setTimeout(function(){
            var layers = e.target.getLayers().getArray();
            layers.forEach(function(lyr){
                if(lyr.get('id') && lyr.get('id').indexOf('widget') ==0){
                    lyr.setVisible(true);
                }
            })
        }, 1000);
    }
}
var sajax;
var sout;
var geeTimeout = {};
var whatise;
class GraphWidget extends React.Component {
    render() {
        const widget = this.props.widget;
        return <div id={"widgetgraph_" + widget.id} className="minmapwidget">
            <div id={"graphcontainer_" + widget.id} className="minmapwidget graphwidget normal">
            </div>
            <h3 id={"widgettitle_" + widget.id} />
        </div>
    }
    componentDidMount()
    {
        const widget = this.props.widget;
        var collectionName = widget.properties[1];
        var indexName = widget.properties[4];
        var date = new Date();
        var url = '';
        if(collectionName.trim().length > 0)
        {
            url = "http://collect.earth:8888/timeSeriesIndex";
        }
        else{
            url = "http://collect.earth:8888/timeSeriesIndex2";
        }
        $.ajax({
            url: url,
            type: "POST",
            async: true,
            indexVal: widget.id,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                collectionNameTimeSeries: widget.properties[1],
                polygon: $.parseJSON(projPairAOI),
                indexName: widget.properties[4],
                dateFromTimeSeries: widget.properties[2].trim().length == 10 ? widget.properties[2].trim() : '2000-01-01',
                dateToTimeSeries: widget.properties[3].trim().length == 10 ? widget.properties[3].trim() :  date.yyyymmdd()
            })
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.warn(jqXHR + textStatus + errorThrown);
        }).done(function (data, _textStatus, _jqXHR) {
            if (data.errMsg) {
                console.warn(data.errMsg);
            } else {
                if (data.hasOwnProperty("timeseries")) {

                    var timeseriesData = [];
                    $.each(data.timeseries, function (ignore, value) {
                        if (value[0] !== null) {
                            timeseriesData.push([value[0], value[1]]);
                        }
                    });
                    timeseriesData = timeseriesData.sort(sortData);
                    var $this = this;
                    graphWidgetArray["widgetgraph_" + $this.indexVal] = createChart($this.indexVal, indexName, timeseriesData);
                    graphWidgetArray["widgetgraph_" + $this.indexVal].id = $this.indexVal;
                } else {
                    console.warn("Wrong Data Returned");
                }
            }
        });
    }
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
        }
    componentDidMount() {
        const widget = this.props.widget;
        $.ajax({
            url: "http://collect.earth:8888/getStats",
            type: "POST",
            async: true,
            indexVal: widget.id,
            polyVal: $.parseJSON(projPairAOI),
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                paramValue: $.parseJSON(projPairAOI)
            })
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.warn(jqXHR + textStatus + errorThrown);
        }).done(function (data, _textStatus, _jqXHR) {
            if (data.errMsg) {
                console.warn(e.message + _textStatus + _jqXHR);
            } else {
                var $this = this;
                $("#totalPop_" + $this.indexVal).text(numberWithCommas(data.pop));
                $("#totalArea_" + $this.indexVal).text(calculateArea($this.polyVal) + " ha");
                $("#elevationRange_" + $this.indexVal).text(numberWithCommas(data.minElev) + " - " + numberWithCommas(data.maxElev) + " m");

            }
        });
    }
}
function sortData(a, b){

    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
}
function createChart (wIndex, wText, wTimeseriesData) {
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
            $("#widgettitle_" +wIndex ).text(wText);
            $("#widgetgraph_" + wIndex + " .highcharts-yaxis").children()[0].innerHTML = wText;

    });
}


function numberWithCommas(x) {
    if (typeof x === "number") {
        try {
            var parts = x.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        } catch (e) {
            console.warn(e.message);
        }
    }
    return "N/A";
}
function calculateArea (poly) {
    var sphere = new ol.Sphere(6378137);
    var coordinates = poly;
    var area_m = sphere.geodesicArea(coordinates);
    var area_ha = area_m / 10000;
    if (area_ha < 0) {
        area_ha = area_ha * -1;
    }
    area_ha = Math.round(area_ha * Math.pow(10, 4)) / Math.pow(10, 4);
    return numberWithCommas(area_ha);
}
function addTileServer (imageid, token, mapdiv, isDual) {
    var googleLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: "https://earthengine.googleapis.com/map/" + imageid + "/{z}/{x}/{y}?token=" + token
        }),
        id: mapdiv
    });
    mapWidgetArray[mapdiv].addLayer(googleLayer);
    if(!isDual)
    {
        addBuffer(mapWidgetArray[mapdiv]);
    }
};

function addDualLayer (imageid, token, mapdiv) {
    var googleLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: "https://earthengine.googleapis.com/map/" + imageid + "/{z}/{x}/{y}?token=" + token
        }),
        id: mapdiv + '_dual'
    });
    mapWidgetArray[mapdiv].addLayer(googleLayer);
    var swipe = document.getElementById('swipeWidget_' + mapdiv.replace('widgetmap_', ''));

    googleLayer.on('precompose', function(event) {
        var ctx = event.context;
        var width = ctx.canvas.width * (swipe.value);
        ctx.save();
        ctx.beginPath();
        ctx.rect(width, 0, ctx.canvas.width - width, ctx.canvas.height);
        ctx.clip();
    });

    googleLayer.on('postcompose', function(event) {
        var ctx = event.context;
        ctx.restore();
    });
    swipe.addEventListener('input', function() {mapWidgetArray[mapdiv].render();}, false);
    addBuffer(mapWidgetArray[mapdiv]);
};

function setOpacity (value, layerID) {
    try{
    var id = layerID;
    var theLayers = mapWidgetArray[layerID].getLayers().forEach(function (lyr) {
        if (id == lyr.get('id') || id + '_dual' == lyr.get('id')) {
            lyr.setOpacity(value);
        }
    });
    }
    catch(e){}
};
function addBuffer (whichMap) {
    "use strict";
    try {
        var circle = new ol.geom.Circle(ol.proj.transform(JSON.parse(bcenter).coordinates, "EPSG:4326", "EPSG:3857"), bradius * 1);
        var CircleFeature = new ol.Feature(circle);
        var vectorSource = new ol.source.Vector({});
        vectorSource.addFeatures([CircleFeature]);
        var layer = new ol.layer.Vector({
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
    } catch (e) {
        console.warn("buffer failed: " + e.message);
    }
};
Date.prototype.yyyymmdd = function() {
    var mm = this.getMonth() + 1; // getMonth() is zero-based
    var dd = this.getDate();

    return [this.getFullYear(),
        (mm>9 ? '' : '0') + mm,
        (dd>9 ? '' : '0') + dd
    ].join('-');
};
var left = 0;
var ptop = 0;
var bradius = getParameterByName("bradius");
var bcenter = getParameterByName("bcenter");
var projAOI = getParameterByName("aoi");
var theSplit = decodeURI(projAOI).replace("[", "").replace("]", "").split(",");
var projPairAOI = "[[" + theSplit[0] + "," + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[1] + "]]";
var mapWidgetArray = [];
var graphWidgetArray = [];
ReactDOM.render(
    <Geodash/>,
    document.getElementById('dashHolder')
);
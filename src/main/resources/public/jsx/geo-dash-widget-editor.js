
//import PureRenderMixin from 'react-addons-pure-render-mixin';

//import ReactGridLayout from 'react-grid-layout';
//const RGL = ReactGridLayout.WidthProvider(ReactGridLayout);

// import PureRenderMixin from 'react-addons-pure-render-mixin';
// import GridLayout from 'react-grid-layout';

//import _ from 'lodash';

//import PropTypes from 'prop-types';

//import PureRenderMixin from 'react-addons-pure-render-mixin';

//import PureRenderMixin from 'react-addons-pure-render-mixin';
//const PureRenderMixin = require('react-addons-pure-render-mixin'); //React.addons.PureRenderMixin;
//import ReactGridLayout from 'react-grid-layout';
//const RGL = ReactGridLayout.WidthProvider(ReactGridLayout);
//import GridLayout from 'react-grid-layout';
//const GridLayout = require('react-grid-layout');

//


import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';

//import PureRenderMixin from 'react-addons-pure-render-mixin'

import RGL, { WidthProvider } from 'react-grid-layout'
const ReactGridLayout = WidthProvider(RGL);
// import GridLayout from 'react-grid-layout';
//
// const RGL = GridLayout.WidthProvider(GridLayout);


// import {GridLayout} from 'react-grid-layout'

//const RGL = ReactGridLayout.WidthProvider(ReactGridLayout);
//import _ from 'lodash'

var debugreturn;
var theLayout = [];
var dashboardID;
var gObject;
var haveWidgets = false;
var backwidget;
class BasicLayout extends React.PureComponent{
    static defaultProps = {
        isDraggable: true,
        isResizable: true,
        className: "layout",
        items: 0,
        rowHeight: 300,
        onLayoutChange: function() {},
        cols: 12
    }
    constructor(props) {
        super(props);
        console.log('here');
        this.state = {  layout: [],
            widgets: [ ],
            imagery: [],
            isEditing: false,
            selectedWidgetType: -1,
            selectedDataType: -1,
            WidgetTitle: '',
            imageCollection: '',
            imageParams: '',
            dualLayer: false,
            WidgetBaseMap: 'osm',
            startDate:'',
            endDate:'',
            startDate2:'',
            endDate2:'',
            widgetBands:'',
            widgetMin:'',
            widgetMax:'',
            widgetCloudScore:'',
            FormReady: false

        };
        gObject = this;
    };


    componentDidMount() {
        console.log("componentDidMount");
        fetch(theURL + "/id/" + pid,)
            .then(response => response.json())
            .then(function(response){dashboardID = response.dashboardID;  return response})
            .then(data => data.widgets.map(function(widget){
                if(widget.layout.y == null)
                {
                    widget.layout.y = 0;
                }
                return widget;}))
            .then(data => debugreturn = data)
            //.then(function(data){if(data){this.setState({ widgets: data})}  return response})
             .then(data => this.setState({ widgets: data}))
            .then(function(data){ console.log('widgets should be updated'); haveWidgets = true; return data;})
            .then(data => this.checkWidgetStructure())
            .then(data => this.setState({layout: this.generateLayout()}))
        ;
        fetch(theRoot + "/get-all-imagery?institutionId=" + institutionID )
            .then(response => response.json())
            .then(function(data){data.unshift({title: 'Open Street Maps', id: 'osm'}); return data;})
            .then(data => this.setState({ imagery: data, WidgetBaseMap: data[0].id}))

    }
    checkWidgetStructure(){
        let widgets = this.state.widgets;
        console.log('I have ' + widgets.length + ' widgets to check');
        var changed = false;
        var row = 0;
        var column = 0;
        var sWidgets = _.orderBy(this.state.widgets, 'id', 'asc');
        widgets = _.map(sWidgets, function(widget, i) {
            if(widget.layout)
            {
                if(widget['gridcolumn']){
                    delete widget['gridcolumn'];
                }
                if(widget['gridrow']){
                    delete widget['gridrow'];
                }
                widget.layout.i = i.toString();
                return widget;
            }
            else if(widget.gridcolumn){
                changed = true;
                let x;
                let w;
                let y;
                let h;
                let layout;
                //do the x and w
                x = parseInt(widget.gridcolumn.split(' ')[0]) - 1;
                w = parseInt(widget.gridcolumn.split(' ')[3]);
                if(widget.gridrow){
                    //do the y and h
                    y = parseInt(widget.gridrow.trim().split(' ')[0]) - 1;
                    h = widget.gridrow.trim().split(' ')[3] != null? parseInt(widget.gridrow.trim().split(' ')[3]): 1;
                }
                // create .layout
                widget.layout = {x : x, y: y, w: w, h: h};
                delete widget['gridcolumn'];
                delete widget['gridrow'];
            }
            else if(widget.position){

                changed = true;
                let x;
                let w;
                let y;
                let h = 1;
                let layout;

                console.log('id: ' + widget.id);
                console.log('column: ' + column);
                console.log('widget.position: ' + widget.position);
                console.log('widget.width: ' + widget.width);
                console.log('row: ' + row);
                if(column + parseInt(widget.width) <= 12)
                {
                    x = column;
                    column = column + parseInt(widget.width);
                }
                else{
                    x = 0;
                    column = parseInt(widget.width);
                    row +=1;
                }
                widget.layout = {x : x, y: row, w: parseInt(widget.width), h: h, i:i};
                // Create a starter layout based on the i value
                // need to add both layout and gridcolumn/gridrow properties
            }
            else{
                changed = true;
                let x;
                let w;
                let y;
                let h = 1;
                let layout;
                console.log('id: ' + widget.id);
                console.log('column: ' + column);
                console.log('widget.position: ' + widget.position);
                console.log('widget.width: ' + widget.width);
                console.log('row: ' + row);
                if(column + 3 <= 12)
                {
                    x = column;
                    column = column + 3;
                }
                else{
                    x = 0;
                    column = parseInt(widget.width);
                    row +=1;
                }
                widget.layout = {x : x, y: row, w: parseInt(widget.width), h: h, i:i};

            }
            return widget;
        });
        console.log(changed);
        this.setState({ widgets: widgets});
        if(changed){
            this.updateServerWidgets();
        }
    }
    generategridcolumn(x, w){
        return (x + 1) + ' / span ' + w;
    }
    generategridrow(x, w){
        return (x + 1) + ' / span ' + w;
    }
    updateServerWidgets(){
        var holdRef = this;
        this.state.widgets.forEach(function(widget) {
            let ajaxurl = theURL + "/updatewidget/widget/" + widget.id;
            holdRef.serveItUp(ajaxurl, widget);

        });
    }
    serveItUp(url, widget )
    {
        $.ajax({
            url: url,
            type: "get",
            dataType: "jsonp",
            indexVal: widget.id,
            data: {
                dashID: dashboardID,
                widgetJSON: JSON.stringify(widget)
            },
            success: function () {
                // no action needed
            },
            error: function (xhr) {
                console.log('it failed');
            }
        });
    }
    deleteWidgetFromServer(widget)
    {
        let ajaxurl = theURL + "/deletewidget/widget/" + widget.id;
        this.serveItUp(ajaxurl, widget);
    }

    generateDOM() {
        console.log('generateDOM');
        var layout = this.state.layout;
        var holdRef = this;
        return _.map(this.state.widgets, function(widget, i) {
            return <div onDragStart={holdRef.onDragStart} onDragEnd={holdRef.onDragEnd} key={i} data-grid={widget.layout} className="front widgetEditor-widgetBackground" style={{backgroundImage: "url(" + holdRef.getImageByType(widget.properties[0]) +")"}}>
                <h3 className="widgetEditor title">{widget.name}
                    <span onClick={(e) => {e.stopPropagation(); holdRef.onRemoveItem(i)}} onMouseDown={function(e){console.log('mousedown happened'); e.stopPropagation()}} className="remove">
                    x
                </span>
                </h3>
                <span className="text text-danger">Sample Image</span></div>;
        });
    }
    onWidgetTypeSelectChanged = (event, anything) => {
        console.log(anything);
        this.setState({
            selectedWidgetType: event.target.value,
            selectedDataType: '-1',
            WidgetTitle: '',
            imageCollection: '',
            imageParams: '',
            WidgetBaseMap: 'osm',
            dualLayer: false,
            startDate:'',
            endDate:'',
            startDate2:'',
            endDate2:'',
            widgetBands:'',
            widgetMin:'',
            widgetMax:'',
            widgetCloudScore:'',
            FormReady: false

        });
    }
    onDragStart = (e) => {
        console.log('drag start');
        e.preventDefault();
        e.stopPropagation();
        this.props.onMouseDown(e);
    }

    onDragEnd = (e) => {
        console.log('drag end');
        e.preventDefault();
        e.stopPropagation();
        this.props.onMouseUp(e);
    }

    onDataTypeSelectChanged = event => {
        this.setState({
            selectedDataType: event.target.value
        });
    };
    onCancelNewWidget = event =>{
        console.log('need to reset form values to defaults');
        this.setState({
            selectedWidgetType: '-1',
            isEditing: false,
            selectedDataType: '-1',
            WidgetTitle: '',
            imageCollection: '',
            imageParams: '',
            WidgetBaseMap: 'osm',
            dualLayer: false,
            startDate:'',
            endDate:'',
            startDate2:'',
            endDate2:'',
            widgetBands:'',
            widgetMin:'',
            widgetMax:'',
            widgetCloudScore:'',
            FormReady: false
        });
    };
    onCreateNewWidget = event =>{
        console.log('need to create the defined widget');
        console.log('need to reset form values to defaults');
        var widget = {};
        var id = this.state.widgets.length > 0?(Math.max.apply(Math, this.state.widgets.map(function(o) { return o.id; }))) + 1: 0;
        var name = this.state.WidgetTitle;
        var wType = this.state.selectedWidgetType == 'TimeSeries'?  this.state.selectedDataType.toLowerCase() + this.state.selectedWidgetType: this.state.selectedWidgetType == 'ImageCollection'? this.state.selectedWidgetType + this.state.selectedDataType: this.state.selectedWidgetType == 'statistics'? 'getStats': 'custom';
        var prop1 = '';
        var properties = [];
        var prop4 = this.state.selectedDataType != null? this.state.selectedDataType: '';
        if(['LANDSAT5', 'LANDSAT7', 'LANDSAT8', 'Sentinel2'].includes(this.state.selectedDataType))
        {
            widget.filterType = this.state.selectedDataType;
            widget.visParams = {
                bands: this.state.widgetBands,
                min: this.state.widgetMin,
                max: this.state.widgetMax,
                cloudLessThan: this.state.widgetCloudScore
            }
        }

        if(this.state.selectedDataType == 'Custom')
        {
            //more work to do to label the type and add
            prop1 = this.state.imageCollection;
            widget.visParams = this.state.imageParams;
        }
        properties[0] = wType;
        properties[1] = prop1;
        properties[2] = this.state.startDate;
        properties[3] = this.state.endDate;
        properties[4] = prop4;

        widget.id = id;
        widget.name = name;
        widget.properties = properties;
        let yval = ((Math.max.apply(Math, this.state.widgets.map(function(o) { return o.layout.y != null? o.layout.y: 0; }))) + 1) > -1? (Math.max.apply(Math, this.state.widgets.map(function(o) { return o.layout.y != null? o.layout.y: 0; }))) + 1: 0;

        widget.layout = {
            i: id.toString(),
            x: 0,
            y: yval, // puts it at the bottom
            w: 3,
            h: 1,
            minW:3
        }
        widget.baseMap = (this.state.imagery.filter(imagery => imagery.id == this.state.WidgetBaseMap))[0];
        widget.dualLayer = this.state.dualLayer;
        if(widget.dualLayer)
        {
            widget.dualStart = this.state.startDate2;
            widget.dualEnd = this.state.endDate2;
        }

        var holdRef = this;

        $.ajax({
            url: theURL + "/createwidget/widget",
            type: "get",
            dataType: "jsonp",
            widget: JSON.stringify(widget),
            data: {
                pID: pid,
                dashID: dashboardID,
                widgetJSON: JSON.stringify(widget)
            },
            success: function () {
                var myWidget = JSON.parse(this.widget);
                backwidget = myWidget;
                holdRef.setState({
                    widgets: holdRef.state.widgets.concat(myWidget),
                    selectedWidgetType: '-1',
                    isEditing: false,
                    selectedDataType: '-1',
                    WidgetTitle: '',
                    imageCollection: '',
                    imageParams: '',
                    WidgetBaseMap: 'osm',
                    dualLayer: false,
                    startDate:'',
                    endDate:'',
                    startDate2:'',
                    endDate2:'',
                    widgetBands:'',
                    widgetMin:'',
                    widgetMax:'',
                    widgetCloudScore:'',
                    FormReady: false
                });
            },
            error: function (xhr) {
            }
        });

    };
    onDataBaseMapSelectChanged = event =>{
        this.setState({WidgetBaseMap: event.target.value});
    }
    onWidgetTitleChange = event => {
        this.setState({WidgetTitle: event.target.value});
    };
    onImageCollectionChange = event => {
        this.setState({imageCollection: event.target.value});
    }
    onImageParamsChange = event => {
        this.setState({imageParams: event.target.value});
    }
    onWidgetDualLayerChange = event => {
        this.setState({dualLayer: event.target.checked});
    }
    onWidgetBandsChange = event => {
        this.setState({widgetBands: event.target.value});
    };
    onWidgetMinChange = event => {
        this.setState({widgetMin: event.target.value});
    };
    onWidgetMaxChange = event => {
        this.setState({widgetMax: event.target.value});
    };
    onWidgetCloudScoreChange = event => {
        this.setState({widgetCloudScore: event.target.value});
    };
    onStartDateChanged = date => {
        if(date.target)
        {
            if(date.target.value) {
                this.setState({startDate: date.target.value});
            }
            else{
                this.setState({startDate: ''});
            }
        }
        else {
            this.setState({startDate: date});
        }
    };
    onEndDateChanged = date => {
        if(date.target)
        {
            if(date.target.value) {
                this.setState({endDate: date.target.value});
            }
            else{
                this.setState({endDate: ''});
            }
        }
        else {
            this.setState({endDate: date});
            this.checkDates();
        }
    };
    onStartDate2Changed = date => {
        if(date.target)
        {
            if(date.target.value) {
                this.setState({startDate2: date.target.value});
            }
            else{
                this.setState({startDate2: ''});
            }
        }
        else {
            this.setState({startDate2: date});
        }
    };
    onEndDate2Changed = date => {
        if(date.target)
        {
            if(date.target.value) {
                this.setState({endDate2: date.target.value});
            }
            else{
                this.setState({endDate2: ''});
            }
        }
        else {
            this.setState({endDate2: date});
            this.checkDates();
        }
    };
    checkDates() {
        var ed = new Date(this.state.endDate);
        var sd = new Date(this.state.startDate);
        if(! this.state.dualLayer) {
            if (ed > sd && this.state.FormReady != true) {
                this.setState({FormReady: true})
            }
            else if (ed < sd) {
                if (this.state.FormReady == true) {
                    this.setState({FormReady: false})
                }
            }
        }
        else{
            var ed2 = new Date(this.state.endDate2);
            var sd2 = new Date(this.state.startDate2);

            if (ed > sd && ed2 > sd2 && this.state.FormReady != true) {
                this.setState({FormReady: true})
            }
            else if (ed < sd || ed2 < sd2) {
                if (this.state.FormReady == true) {
                    this.setState({FormReady: false})
                }
            }
        }

    };
    getNewWidgetForm() {
        if(this.state.isEditing)
        {
            return  <React.Fragment>
                <div className="modal fade show" style={{display: 'block'}}>
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
                                        <select name="widgetTypeSelect" className="form-control" value={this.state.selectedWidgetType} id="widgetTypeSelect" onChange={(e) => this.onWidgetTypeSelectChanged(e, 'i am anything')}>
                                            <option value="-1">Please select type</option>
                                            <option label="Image Collection" value="ImageCollection">Image Collection</option>
                                            <option label="Time Series Graph" value="TimeSeries">Time Series Graph</option>
                                            <option label="Statistics" value="statistics">Statistics</option>
                                        </select>
                                    </div>
                                    {this.getBaseMapSelector()}
                                    {this.getDataType()}
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
            </React.Fragment>
        }
        else{
            return
        }
    }
    getFormButtons(){
        //need to check if form is ready, if not just add the cancel button, or disable the create?
        return <React.Fragment>
            <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={this.onCancelNewWidget}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={this.onCreateNewWidget} disabled={!this.state.FormReady}>Create</button>
        </React.Fragment>

    }
    getBaseMapSelector(){
        if(this.state.selectedWidgetType == 'ImageCollection') {
            return <React.Fragment>
                <label htmlFor="widgetIndicesSelect">Basemap</label>
                <select name="widgetIndicesSelect" value={this.state.WidgetBaseMap} className="form-control"
                        id="widgetIndicesSelect" onChange={this.onDataBaseMapSelectChanged}>
                    {this.baseMapOptions()}
                </select>
            </React.Fragment>
        }
        else{return;}
    }
    baseMapOptions(){

        var options = _.map(this.state.imagery, function(imagery)
        {
            return <option key={imagery.id} value={imagery.id}> {imagery.title} </option>
        });
        return options;
    }
    getDataType()
    {
        console.log('getting datatype');
        if(this.state.selectedWidgetType == '-1')
        {
            console.log('Blank');
            return
        }
        else if(this.state.selectedWidgetType == 'statistics')
        {
            if(this.state.FormReady != true){
                this.setState({
                    FormReady: true
                });
            }
            return <React.Fragment>
                <div className="form-group">
                    <label htmlFor="widgetTitle">Title</label>
                    <input type="text" name="widgetTitle" id="widgetTitle" value={this.state.WidgetTitle} className="form-control" onChange={this.onWidgetTitleChange}/>
                </div>
            </React.Fragment>
        }
        else if(this.state.selectedWidgetType == 'ImageCollection')
        {
            return <React.Fragment>
                <label htmlFor="widgetIndicesSelect">Data</label>
                <select name="widgetIndicesSelect" value={this.state.selectedDataType} className="form-control" id="widgetIndicesSelect" onChange={this.onDataTypeSelectChanged} >
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
            </React.Fragment>
        }
        else{
            return <React.Fragment>
                <label htmlFor="widgetIndicesSelect">Data</label>
                <select name="widgetIndicesSelect" value={this.state.selectedDataType} className="form-control" id="widgetIndicesSelect" onChange={this.onDataTypeSelectChanged} >
                    <option value="-1" className="" >Please select type</option>
                    <option label="NDVI" value="NDVI">NDVI</option>
                    <option label="EVI" value="EVI">EVI</option>
                    <option label="EVI 2" value="EVI2">EVI 2</option>
                    <option label="NDMI" value="NDMI">NDMI</option>
                    <option label="NDWI" value="NDWI">NDWI</option>
                    <option label="Custom widget" value="Custom">Custom widget</option>
                </select>
            </React.Fragment>
        }
    }
    getDataForm()
    {
        if(this.state.selectedDataType == '-1')
        {
            console.log('Blank');
            return
        }
        else{
            setTimeout(() => {$(".input-daterange input").each(function () {
                try {
                    console.log('init: ' + this.id);
                    var bindEvt = this.id == 'sDate_new_cooked'? gObject.onStartDateChanged: this.id == 'eDate_new_cooked'? gObject.onEndDateChanged: this.id   == 'sDate_new_cooked2'? gObject.onStartDate2Changed : gObject.onEndDate2Changed;
                    $(this).datepicker({
                        changeMonth: true,
                        changeYear: true,
                        dateFormat: "yy-mm-dd",
                        onSelect: function(dateText){console.log(dateText); bindEvt(this.value);}
                    });
                } catch (e) {
                    console.warn(e.message);
                }
            });},250);
            if(['LANDSAT5', 'LANDSAT7', 'LANDSAT8', 'Sentinel2'].includes(this.state.selectedDataType)){
                return <React.Fragment>
                    <div className="form-group">
                        <label htmlFor="widgetTitle">Title</label>
                        <input type="text" name="widgetTitle" id="widgetTitle" value={this.state.WidgetTitle}
                               className="form-control" onChange={this.onWidgetTitleChange}/>
                    </div>
                    <label>Select the Date Range you would like</label>
                    <div className="input-group input-daterange" id="range_new_cooked">

                        <input type="text" className="form-control" onChange={this.onStartDateChanged} value={this.state.startDate} placeholder={"YYYY-MM-DD"} id="sDate_new_cooked"/>
                        <div className="input-group-addon">to</div>
                        <input type="text" className="form-control" onChange={this.onEndDateChanged} value={this.state.endDate} placeholder={"YYYY-MM-DD"} id="eDate_new_cooked"/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="widgetDualLayer">Dual Layer</label>
                        <input type="checkbox" name="widgetDualLayer" id="widgetDualLayer" checked={this.state.dualLayer}
                               className="form-control" onChange={this.onWidgetDualLayerChange}/>
                    </div>
                    <div style={{display : this.state.dualLayer == true? 'block': 'none'}}>
                        <label>Select the Date Range for the top layer</label>
                        <div className="input-group input-daterange" id="range_new_cooked2">

                            <input type="text" className="form-control"  onChange={this.onStartDate2Changed} value={this.state.startDate2} placeholder={"YYYY-MM-DD"} id="sDate_new_cooked2"/>
                            <div className="input-group-addon">to</div>
                            <input type="text" className="form-control" onChange={this.onEndDate2Changed} value={this.state.endDate2} placeholder={"YYYY-MM-DD"} id="eDate_new_cooked2"/>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="widgetBands">Bands</label>
                        <input type="text" name="widgetBands" id="widgetBands" value={this.state.widgetBands}
                               className="form-control" onChange={this.onWidgetBandsChange}/>
                    </div>

                    <div className="form-group">
                        <label htmlFor="widgetMin">Min</label>
                        <input type="text" name="widgetMin" id="widgetMin" value={this.state.widgetMin}
                               className="form-control" onChange={this.onWidgetMinChange}/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="widgetMax">Max</label>
                        <input type="text" name="widgetMax" id="widgetMax" value={this.state.widgetMax}
                               className="form-control" onChange={this.onWidgetMaxChange}/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="widgetCloudScore">Cloud Score</label>
                        <input type="text" name="widgetCloudScore" id="widgetCloudScore" value={this.state.widgetCloudScore}
                               className="form-control" onChange={this.onWidgetCloudScoreChange}/>
                    </div>
                </React.Fragment>
            }
            else if(this.state.selectedWidgetType == 'ImageCollection' && this.state.selectedDataType == 'Custom')
            {
                return <React.Fragment>
                    <div className="form-group">
                        <label htmlFor="widgetTitle">Title</label>
                        <input type="text" name="widgetTitle" id="widgetTitle" value={this.state.WidgetTitle}
                               className="form-control" onChange={this.onWidgetTitleChange}/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="imageCollection">GEE Image Collection</label>
                        <input type="text" name="imageCollection" id="imageCollection" placeholder={"LANDSAT/LC8_L1T_TOA"} value={this.state.imageCollection}
                               className="form-control" onChange={this.onImageCollectionChange}/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="imageParams">Image Parameters (json format)</label>
                        <textarea placeholder="json format" rows="1" className="form-control" placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"} onChange={this.onImageParamsChange} rows="4" value={this.state.imageParams} style={{overflow: 'hidden', overflowWrap: 'break-word', resize: 'vertical'}}></textarea>
                        {/*<input type="text" name="imageParams" id="imageParams" value={this.state.imageParams}*/}
                               {/*className="form-control" onChange={this.onImageParamsChange}/>*/}
                    </div>
                    <label>Select the Date Range you would like</label>
                    <div className="input-group input-daterange" id="range_new_cooked">

                        <input type="text" className="form-control" onChange={this.onStartDateChanged} value={this.state.startDate} placeholder={"YYYY-MM-DD"} id="sDate_new_cooked"/>
                        <div className="input-group-addon">to</div>
                        <input type="text" className="form-control" onChange={this.onEndDateChanged} value={this.state.endDate} placeholder={"YYYY-MM-DD"} id="eDate_new_cooked"/>
                    </div>
                </React.Fragment>
            }
            else if(this.state.selectedWidgetType == 'ImageCollection')
            {
                return <React.Fragment>
                    <div className="form-group">
                        <label htmlFor="widgetTitle">Title</label>
                        <input type="text" name="widgetTitle" id="widgetTitle" value={this.state.WidgetTitle}
                               className="form-control" onChange={this.onWidgetTitleChange}/>
                    </div>
                    <label>Select the Date Range you would like</label>
                    <div className="input-group input-daterange" id="range_new_cooked">

                        <input type="text" className="form-control" onChange={this.onStartDateChanged} value={this.state.startDate} placeholder={"YYYY-MM-DD"} id="sDate_new_cooked"/>
                        <div className="input-group-addon">to</div>
                        <input type="text" className="form-control" onChange={this.onEndDateChanged} value={this.state.endDate} placeholder={"YYYY-MM-DD"} id="eDate_new_cooked"/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="widgetDualLayer">Dual Layer</label>
                        <input type="checkbox" name="widgetDualLayer" id="widgetDualLayer" checked={this.state.dualLayer}
                               className="form-control" onChange={this.onWidgetDualLayerChange}/>
                    </div>
                    <div style={{display : this.state.dualLayer == true? 'block': 'none'}}>
                        <label>Select the Date Range you would like</label>
                        <div className="input-group input-daterange" id="range_new_cooked2">

                            <input type="text" className="form-control" onChange={this.onStartDate2Changed} value={this.state.startDate2} placeholder={"YYYY-MM-DD"} id="sDate_new_cooked2"/>
                            <div className="input-group-addon">to</div>
                            <input type="text" className="form-control" onChange={this.onEndDate2Changed} value={this.state.endDate2} placeholder={"YYYY-MM-DD"} id="eDate_new_cooked2"/>
                        </div>
                    </div>
                </React.Fragment>
            }
            else if(this.state.selectedWidgetType == 'TimeSeries' && this.state.selectedDataType == 'Custom')
            {
              return <React.Fragment>
                    <div className="form-group">
                        <label htmlFor="widgetTitle">Title</label>
                        <input type="text" name="widgetTitle" id="widgetTitle" value={this.state.WidgetTitle}
                               className="form-control" onChange={this.onWidgetTitleChange}/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="imageCollection">GEE Image Collection</label>
                        <input type="text" name="imageCollection" id="imageCollection" placeholder={"LANDSAT/LC8_L1T_TOA"} value={this.state.imageCollection}
                               className="form-control" onChange={this.onImageCollectionChange}/>
                    </div>
                    <label>Select the Date Range you would like</label>
                    <div className="input-group input-daterange" id="range_new_cooked">

                        <input type="text" className="form-control" onChange={this.onStartDateChanged} value={this.state.startDate} placeholder={"YYYY-MM-DD"} id="sDate_new_cooked"/>
                        <div className="input-group-addon">to</div>
                        <input type="text" className="form-control" onChange={this.onEndDateChanged} value={this.state.endDate} placeholder={"YYYY-MM-DD"} id="eDate_new_cooked"/>
                    </div>
                </React.Fragment>
            }
            else {
                return <React.Fragment>
                    <div className="form-group">
                        <label htmlFor="widgetTitle">Title</label>
                        <input type="text" name="widgetTitle" id="widgetTitle" value={this.state.WidgetTitle}
                               className="form-control" onChange={this.onWidgetTitleChange}/>
                    </div>
                    <label>Select the Date Range you would like</label>
                    <div className="input-group input-daterange" id="range_new_cooked">

                        <input type="text" className="form-control" onChange={this.onStartDateChanged} value={this.state.startDate} placeholder={"YYYY-MM-DD"} id="sDate_new_cooked"/>
                        <div className="input-group-addon">to</div>
                        <input type="text" className="form-control" onChange={this.onEndDateChanged} value={this.state.endDate} placeholder={"YYYY-MM-DD"} id="eDate_new_cooked"/>
                    </div>
                </React.Fragment>
            }
        }

    }

    onRemoveItem(i) {

        console.log('i was here');
        var removedWidget = _.filter(this.state.widgets, function(w){
            return w.layout.i == i.toString();
        });
        gremovedWidget = removedWidget;
        this.deleteWidgetFromServer(removedWidget[0]);
        this.setState({ widgets: _.reject(this.state.widgets, function(widget){
                return widget.layout.i == i.toString(); }),
            layout: _.reject(this.state.layout, function(layout){
                return layout.i == i.toString(); })
        });
    }

    getImageByType(which){
        var theImage = "";
        if (which === "getStats") {
            theImage = "/img/statssample.gif";
        }
        else if (which.toLowerCase().includes("image")) {
            theImage = "/img/mapsample.gif";
        }
        else {
            theImage = "/img/graphsample.gif";
        }

        return theImage;
    }
    generateLayout() {
        var w = this.state.widgets;
        var xrow = 0;
        var yrow = 0;
        return _.map(w, function(item, i) {
            item.layout.i = i.toString();
            item.layout.minW = 3;
            item.layout.w = item.layout.w >= 3? item.layout.w: 3;
            return item.layout;
        });
    }

    onLayoutChange = (layout) => {


        console.log('Widgets length: ' + this.state.widgets.length);
        console.log('layouts length: ' + this.state.layout.length);
        if (haveWidgets) {
            var w = this.state.widgets;
            layout.forEach(function (lay, i) {
                w[i].layout = lay;
            });
            console.log('Post layout loop: ' + JSON.stringify(w[w.length -1]));
            this.setState({widgets: w,
                layout: layout},this.updateServerWidgets);
        }
        else{
            this.setState({layout: layout});
        }


    }
    onAddItem = (evt) => {
        this.setState({isEditing : true});
    }
    render() {
        const {layout} = this.state;
        return (
            <React.Fragment>
                <button id="addWidget" onClick={this.onAddItem} className="btn btn-outline-lightgreen btn-sm" style={{display: 'none'}}>Add Widget</button>
                <ReactGridLayout {...this.props}
                                 layout={layout}
                                 onLayoutChange={this.onLayoutChange}>


                    {this.generateDOM()}
                </ReactGridLayout>
                {this.getNewWidgetForm()}
            </React.Fragment>
        );
    }
}
var gremovedWidget;
// BasicLayout.defaultProps = {
//     isDraggable: true,
//     isResizable: true,
//     className: "layout",
//     items: 2,
//     rowHeight: 300,
//     cols: 12
// }

export function renderWidgetEditorPage(args) {
    ReactDOM.render(
        <BasicLayout/>,
        document.getElementById('content')
    );
}

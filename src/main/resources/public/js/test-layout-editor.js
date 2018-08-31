'use strict';
const PureRenderMixin = React.addons.PureRenderMixin;
const RGL = ReactGridLayout.WidthProvider(ReactGridLayout);
var debugreturn;
var theLayout = [];
var dashboardID;
var gObject;
var haveWidgets = false;
class BasicLayout extends React.Component{

    constructor(props) {
        super(props);
        this.state = {  layout: {},
                        widgets: [ ]
                      };
        gObject = this;
    }


    componentDidMount() {
        console.log("componentDidMount");
        fetch(theURL + "/id/" + pid,)
            .then(response => response.json())
            .then(function(response){dashboardID = response.dashboardID;  return response})
            .then(data => data.widgets.map(function(widget){
                return widget;}))
            .then(data => debugreturn = data)
            .then(data => this.setState({ widgets: data}))
            .then(function(data){ console.log('widgets should be updated'); haveWidgets = true; return data;})
            .then(data => this.checkWidgetStructure())
            .then(data => this.setState({layout: this.generateLayout()}))
        ;
    }
    checkWidgetStructure(){
        let widgets = this.state.widgets;
        console.log('I have ' + widgets.length + ' widgets to check');
        var changed = false;
        widgets = _.map(this.state.widgets, function(widget, i) {
            if(widget.layout)
            {
                if(widget['gridcolumn']){
                    delete widget['gridcolumn'];
                }
                if(widget['gridrow']){
                    delete widget['gridrow'];
                }
                widget.layout.i = i;
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
            else{
                console.log('why am i in here????');
                changed = true;
                // Create a starter layout based on the i value
                // need to add both layout and gridcolumn/gridrow properties
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

            // if(widget.layout) {
            //     delete widget.layout['i'];
            // }
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
                //window.location = window.location.href;
                console.log('it updated');
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
            return <div key={i} data-grid={layout[i]} className="front widgetEditor-widgetBackground" style={{backgroundImage: "url(" + holdRef.getImageByType(widget.properties[0]) +")"}}>
                <h3 className="widgetEditor title">{widget.name}
                    <span  onClick={holdRef.onRemoveItem.bind(holdRef, i)} className="remove">
                    x
                </span>
                </h3>
                <span className="text text-danger">Sample Image</span></div>;
        });
    }

    onRemoveItem(i) {
        console.log("removing", i);
        var removedWidget = _.filter(this.state.widgets, function(w){
            return w.layout.i == i;
        });
        gremovedWidget = removedWidget;
        this.deleteWidgetFromServer(removedWidget);
        this.setState({ widgets: _.reject(this.state.widgets, function(widget){
            console.log('widget.layout.i: ' + widget.layout.i);
            console.log('i: ' + i);
            return widget.layout.i == i; }) });
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
        console.log('i think the length is: ' + w.length);

        var xrow = 0;
        var yrow = 0;
        return _.map(w, function(item, i) {
            console.log( item.id.toString() );
            item.layout.i = i;
            item.layout.minW = 3;
            item.layout.w = item.layout.w >= 3? item.layout.w: 3;
            return item.layout;
        });
    }

    onLayoutChange = (layout) => {
        this.setState({layout: layout});
        console.log('Need to update widget state and send to server');
        // where layout.i == widget.id
        //widget.layout = layout
        // try {
        // var widgets;
        //      if (haveWidgets) {
        //         widgets = _.map(this.state.widgets, function (widget, i) {
        //
        //             widget.layout = layout[i];
        //             console.log('i = ' + i + ' layout: ' + layout[i]);
        //             return widget;
        //         });
        //
        //         //this.setState({widgets: widgets});
        //         //this.updateServerWidgets();
        //     }
        // }
        // catch(e){}
        try{
        console.log('w = ' + layout[0].w);
        }
        catch(e){}
        //var updatedLayout = this.state.layout;
        if (haveWidgets) {
            var w = this.state.widgets;
            console.log('got here');
            layout.forEach(function (lay, i) {
                console.log('in foreach and i = ' + 1);
                console.log('this should be the width: ' + lay.w);
                w[i].layout = lay;
            });
            console.log('should be setting widget state');
            this.setState({widgets: w},this.updateServerWidgets);
        }

    }

    render() {
        const {layout} = this.state;
        return (
            <RGL {...this.props}
                 layout={layout}
                 onLayoutChange={this.onLayoutChange}>
                {this.generateDOM()}
            </RGL>
        );
    }
}
var gremovedWidget;
BasicLayout.defaultProps = {
    mixins: [PureRenderMixin],
    className: "layout",
    items: 2,
    rowHeight: 300,
    cols: 12
}

ReactDOM.render(
    <BasicLayout />,
    document.getElementById('democontent')
);

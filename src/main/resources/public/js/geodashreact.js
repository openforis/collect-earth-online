var debugreturn;
class Geodash extends React.Component {
    constructor(props) {
        super(props);
        this.state = { widgets: [ ] }
    }
    componentDidMount() {
        fetch(theURL + "/id/" + pid,)
            .then(response => response.json())
            .then(data => this.setState({ widgets: data.widgets }));
    }
    render() {
        return ( <React.Fragment>
            <Widgets
                widgets={this.state.widgets}/>
        </React.Fragment> );
    }
}


class Widgets extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return ( <div className="row placeholders">
            <div className="grid-sizer"></div>
            {this.props.widgets.map(widget => (
                <Widget
                    key={widget.id}
                    widget={widget}
                />
            ))}
        </div> );
    }
}

class Widget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {  };
        this.imageCollectionList = ["addImageCollection", "ndviImageCollection", "ImageCollectionNDVI", "ImageCollectionEVI", "ImageCollectionEVI2", "ImageCollectionNDWI", "ImageCollectionNDMI"];
        this.graphControlList = ["timeSeriesGraph", "ndviTimeSeries", "ndwiTimeSeries", "eviTimeSeries", "evi2TimeSeries", "ndmiTimeSeries"];
    }
    render() {
        const {key, widget} = this.props;
        return (    <React.Fragment>{ this.getWidgetHtml(widget) }</React.Fragment>);
    }
    getWidgetHtml(widget){
        if(widget.gridcolumn)
        {
            return (<div className={ this.getClassNames(widget.gridcolumn, widget.gridrow) }
                        style={{gridColumn:widget.gridcolumn, gridRow:widget.gridrow}}>
                <div className="panel panel-default" id={"widget_" + widget.id}>
                    <div className="panel-heading">
                        <ul className="list-inline panel-actions pull-right">
                            <li style={{display: "inline"}}>{widget.name}</li>
                            <li style={{display: "inline"}}><a className="list-inline panel-actions panel-fullscreen"
                                                           role="button" title="Toggle Fullscreen"><i className="fas fa-expand-arrows-alt" style={{color: "#31BAB0"}}></i></a></li>
                        </ul>
                    </div>
                    <div id={"widget-container_" + widget.id} className="widget-container">

                            {this.getWidgetInnerHtml(widget)}

                    </div>
                </div>
            </div>);
        }
        else{
            return  <div className="row placeholdersOld">
                    </div>;
        }
    }
    getClassNames(c, r)
    {
        let classnames = 'placeholder';
        classnames += c.includes("span 12")? " fullcolumnspan": c.includes("span 9")? " columnSpan9": c.includes("span 6")? " columnSpan6": " columnSpan3";
        classnames += r.includes("span 2")? " rowSpan2": r.includes("span 3")? " rowSpan3": " rowSpan1";
        return classnames;
    }
    getWidgetInnerHtml(widget){
        let wtext = widget.properties[0];
        let control;
        let slider;
        if(this.imageCollectionList.includes(wtext))
        {
            return <div className="front"><h1>Image Collection Control</h1>
                <input type = "range" className = "mapRange" id = {"rangeWidget_" + widget.id}
                       value = ".9"
                       min = "0"
                       max = "1"
                       step = ".01"
                       onChange = {"gmodcdash.setOpacity(this.value, 'widgetmap_" + widget.id + "')"}
                       onInput = {"gmodcdash.setOpacity(this.value, 'widgetmap_" + widget.id + "')"} />
            </div>
        }else if (this.graphControlList.includes(wtext)) {
            return <div className="front"><h1>Graph Control</h1></div>
        }else if (wtext === "getStats") {
            return <div className="front"><h1>Stats Control</h1></div>
        }
        else {
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==" width ="200" height ="200"className="img-responsive" />;
        }
    }

}

ReactDOM.render(
    <Geodash/>,
    document.getElementById('dashHolder')
);
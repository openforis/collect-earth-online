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
        this.state = {  }
    }
    render() {
        const {key, widget} = this.props;
        return (    <React.Fragment>{ this.getWidgetHtml(widget) }</React.Fragment>);
    }
    getWidgetHtml(widget){
        if(widget.gridcolumn)
        {
            return (<div className="placeholder columnSpan6 rowSpan1"
                        style={{gridColumn:widget.gridcolumn, gridRow:widget.gridrow}}>
                <div className="panel panel-default" id={"widget_" + widget.id}>
                    <div className="panel-heading">
                        <ul className="list-inline panel-actions pull-right">
                            <li style={{display: "inline"}}>{widget.name}</li>
                            <li style={{display: "inline"}}><a className="list-inline panel-actions panel-fullscreen"
                                                           role="button" title="Toggle Fullscreen"></a></li>
                        </ul>
                    </div>
                    <div id="widget-container_1" className="widget-container"></div>
                </div>
            </div>);
        }
        else{
            return  <div className="row placeholdersOld">
                    </div>;
        }
    }
}

/*
{if(widget.gridcolumn)
        {
            <div className="row placeholders">
                <div className="grid-sizer">
                    <div className="col-xs-6 col-sm-3 placeholder">

                        var hasSpan = false;
                        if(widget.gridcolumn){
                        var classnames = "";
                        if (widget.gridcolumn.includes("span 12"))
                    {
                        classnames = "placeholder fullcolumnspan";
                    }
                        else if (widget.gridcolumn.includes("span 9"))
                    {
                        classnames = "placeholder columnSpan9";
                    }
                        else if (widget.gridcolumn.includes("span 6"))
                    {
                        classnames = "placeholder columnSpan6";
                    }
                        else{
                        classnames = "placeholder columnSpan3";
                    }
                        if(widget.gridrow.includes("span 2")){
                        classnames += " rowSpan2";
                        hasSpan = true;
                    }
                        else if(widget.gridrow.includes("span 3")){
                        classnames += " rowSpan3";
                        hasSpan = true;
                    }
                        else{
                        classnames += " rowSpan1";
                    }
                        <div className={classnames} style= "grid-column: {widget.gridcolumn}; grid-row: {widget.gridrow}">
                        </div>
                    </div>
                </div>
            </div>
        }
        else{
            <div className="row placeholdersOld">
            </div>
        }
        }

 */

ReactDOM.render(
    <Geodash/>,
    document.getElementById('dashHolder')
);
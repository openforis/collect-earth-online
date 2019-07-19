import React from "react";
import ReactDOM from "react-dom";
import Collapsible from "react-collapsible";

class GeoDashHelp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            LngObject: {},
        }
        fetch(this.props.documentRoot + "/locale/geodashhelp_" + this.props.browserLanguage + ".json")
            .then(res => res.json())
            .then(data => this.setState({LngObject: data}));
    }
    render() {
        return (
            <div>
                <h1>{this.state.LngObject.title}</h1>
                <Collapsible trigger={this.state.LngObject.head_image_collection_widget} triggerTagName="h2">
                    <img
                        src={this.props.documentRoot + "/img/image_collection_widget.gif"}
                        className="previewImg"
                        onClick={(e) => this.toggleHelpImage(e)}
                    />
                    <br className="previewbreak"/>
                    <ol>
                        <li>
                            {this.state.LngObject.click_add_widget}
                        </li>
                        <li>
                            {this.state.LngObject.select_image_collection}
                        </li>
                        <li>
                            {this.state.LngObject.choose_basemap}
                        </li>
                        <li>
                            <span>{this.state.LngObject.select_data}</span>
                            <ol style={{listStyleType: "lower-alpha"}}>
                                <li>
                                    {this.state.LngObject.ic_data_info_preset}
                                </li>
                                <li>
                                    {this.state.LngObject.ic_data_info_configure}
                                    <ol style={{listStyleType: "lower-roman"}}>
                                        <li>
                                            Landsat 5 - B1, B2, B3, B4, B5, B6, B7
                                        </li>
                                        <li>
                                            Landsat 7 - B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8
                                        </li>
                                        <li>
                                            Landsat 8 - B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11
                                        </li>
                                        <li>
                                            Sentinel 2 - B1, B2, B3, B4, B5, B6, B7, B8, B8a, B9, B10, B11, B12
                                        </li>
                                    </ol>
                                </li>
                                <li>
                                    <span data-tag="custom_widget_info"></span>
                                    <ol style={{listStyleType: "lower-roman"}}>
                                        <li>
                                            Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO
                                            {"{\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"}"}
                                            2018-01-01 to 2018-12-31
                                        </li>
                                        <li>
                                            {this.state.LngObject.custom_widget_warning}
                                        </li>
                                    </ol>
                                </li>
                            </ol>
                        </li>
                        <li>
                            {this.state.LngObject.select_date_range}
                        </li>
                        <li>
                            {this.state.LngObject.click_create}
                        </li>
                        <li>{this.state.LngObject.reposition}</li>
                    </ol>
                </Collapsible>
                <Collapsible trigger="Start here" triggerTagName="h2">
                    <p>This is the collapsible content. It can be any element or React component you like.</p>
                    <p>It can even be another Collapsible component. Check out the next section!</p>
                </Collapsible>
            </div>
        );
    }

    toggleHelpImage = event => {
        const which = event.target;
        if (document.body.style.overflow === "hidden") {
            document.body.style.overflow = "auto";
            which.className = which.className.replace(/\bfullpreview\b/g, "");
        } else {
            document.body.style.overflow = "hidden";
            const arr = which.className.split(" ");
            if (arr.indexOf("fullpreview") === -1) {
                which.className += " " + "fullpreview";
            }
        }
    };
}

export function renderGeodashHelpPage(args) {
    ReactDOM.render(
        <GeoDashHelp documentRoot={args.documentRoot} browserLanguage={args.browserLanguage}/>,
        document.getElementById("dashHolder")
    );
}

import React from "react";
import ReactDOM from "react-dom";
import Collapsible from "react-collapsible";

class GeoDashHelp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            LngObject: {},
        };
    }

    componentDidMount = () => {
        fetch(this.props.documentRoot + "/locale/geodashhelp_" + this.props.browserLanguage + ".json")
            .then(res => res.json())
            .then(data => this.setState({ LngObject: data }));
    }


    createListItem = text => <li style={{ overflowWrap: "break-word" }}> {text} </li>;

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

    render() {
        return (
            <div className="container-fluid">
                <br style={{ clear: "both" }} />
                <div className="col-xl-10 offset-xl-1 col-lg-10 offset-lg-1 justify-content-center">
                    <h1>{this.state.LngObject.title}</h1>
                    <Collapsible
                        trigger={this.state.LngObject.head_image_collection_widget}
                        triggerTagName="h2"
                    >
                        <img
                            src={this.props.documentRoot + "/img/image_collection_widget.gif"}
                            className="previewImg"
                            onClick={(e) => this.toggleHelpImage(e)}
                        />
                        <br className="previewbreak"/>
                        <ol>
                            {this.createListItem(this.state.LngObject.click_add_widget)}
                            {this.createListItem(this.state.LngObject.select_image_collection)}
                            {this.createListItem(this.state.LngObject.choose_basemap)}
                            <li>
                                <span>{this.state.LngObject.select_data}</span>
                                <ol style={{ listStyleType: "lower-alpha" }}>
                                    {this.createListItem(this.state.LngObject.ic_data_info_preset)}
                                    <li>
                                        {this.state.LngObject.ic_data_info_configure}
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            {this.createListItem("Landsat 5 - B1, B2, B3, B4, B5, B6, B7")}
                                            {this.createListItem("Landsat 7 - B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8")}
                                            {this.createListItem("Landsat 8 - B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11")}
                                            {this.createListItem("Sentinel 2 - B1, B2, B3, B4, B5, B6, B7, B8, B8a, B9, B10, B11, B12")}
                                        </ol>
                                    </li>
                                    <li>
                                        <span data-tag="custom_widget_info"></span>
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            {this.createListItem(" Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO\n" +
                                                "                                                {\"{\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"}\"}\n" +
                                                "                                            2018-01-01 to 2018-12-31")}
                                            {this.createListItem(this.state.LngObject.custom_widget_warning)}
                                        </ol>
                                    </li>
                                </ol>
                            </li>
                            {this.createListItem(this.state.LngObject.select_date_range)}
                            {this.createListItem(this.state.LngObject.click_create)}
                            {this.createListItem(this.state.LngObject.reposition)}
                        </ol>
                    </Collapsible>
                    <Collapsible trigger={this.state.LngObject.add_time_series_graph} triggerTagName="h2">
                        <img
                            src={this.props.documentRoot + "/img/time_series_graph_widget.gif"}
                            className="previewImg"
                            onClick={(e) => this.toggleHelpImage(e)}
                        />
                        <br className="previewbreak"/>
                        <ol>
                            <li>
                                {this.state.LngObject.click_add_widget}
                            </li>
                            <li>
                                {this.state.LngObject.select_time_series}
                            </li>
                            <li>
                                <span>{this.state.LngObject.select_data}</span>
                                <ol style={{ listStyleType: "lower-alpha" }}>
                                    <li>
                                        {this.state.LngObject.configured_graph}
                                    </li>
                                    <li>
                                        <span>{this.state.LngObject.custom_graph}</span>
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            <li>
                                                {this.state.LngObject.image_collection_graph}
                                            </li>
                                            <li>
                                                {this.state.LngObject.band_to_graph}
                                            </li>
                                            <li>
                                                {this.state.LngObject.graph_reducer}
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
                    <Collapsible
                        trigger={this.state.LngObject.add_stats_widget}
                        triggerTagName="h2"
                    >
                        <img
                            src={this.props.documentRoot + "/img/statistics_widget.gif"}
                            className="previewImg"
                            onClick={(e) => this.toggleHelpImage(e)}
                        />
                        <br className="previewbreak"/>
                        <ol>
                            {this.createListItem(this.state.LngObject.click_add_widget)}
                            {this.createListItem(this.state.LngObject.select_stats)}
                            {this.createListItem(this.state.LngObject.give_title)}
                            {this.createListItem(this.state.LngObject.click_create)}
                            {this.createListItem(this.state.LngObject.reposition)}
                        </ol>
                        <br style={{ clear: "both" }}/>
                    </Collapsible>
                    <Collapsible
                        trigger={this.state.LngObject.add_dual_image_collection}
                        triggerTagName="h2"
                    >
                        <img
                            src={this.props.documentRoot + "/img/dual_image_collection_widget.gif"}
                            className="previewImg"
                            onClick={(e) => this.toggleHelpImage(e)}
                        />
                        <br className="previewbreak"/>
                        <ol>
                            {this.createListItem(this.state.LngObject.click_add_widget)}
                            {this.createListItem(this.state.LngObject.select_dual_image_collection)}
                            {this.createListItem(this.state.LngObject.choose_basemap)}
                            <li>
                                <span data-tag="select_data">{this.state.LngObject.select_data}</span>
                                <ol style={{ listStyleType: "lower-alpha" }}>
                                    {this.createListItem(this.state.LngObject.ic_data_info_preset)}
                                    <li data-tag="ic_data_info_configure">
                                        {this.state.LngObject.ic_data_info_configure}
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            {this.createListItem("Landsat 5 - B1, B2, B3, B4, B5, B6, B7")}
                                            {this.createListItem("Landsat 7 - B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8")}
                                            {this.createListItem("Landsat 8 - B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11")}
                                            {this.createListItem("Sentinel 2 - B1, B2, B3, B4, B5, B6, B7, B8, B8a, B9, B10, B11, B12")}
                                        </ol>
                                    </li>
                                    {this.createListItem(this.state.LngObject.image_asset)}
                                    <li>
                                        <span data-tag="image_collection_asset">{this.state.LngObject.image_collection_asset}</span>
                                        <ol style={{ listStyleType: "lower-alpha" }}>
                                            {this.createListItem(this.state.LngObject.give_title)}
                                            <li>
                                                <span>{this.state.LngObject.enter_image_asset}</span> users/ValeriaContessa/Indonesia_2000
                                            </li>
                                            <li>
                                                <span>{this.state.LngObject.enter_image_asset_params} </span> {"{\"bands\":\"B4,B5,B3\",\"min\":\"10,0,10\",\"max\":\"120,90,70\"}"}
                                            </li>
                                            {this.createListItem(this.state.LngObject.skip_date)}
                                        </ol>
                                    </li>
                                    <li>
                                        <span data-tag="custom_widget_info">{this.state.LngObject.custom_widget_info}</span>
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            {this.createListItem("Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"} \n 2018-01-01 to 2018-12-31")}
                                            {this.createListItem(this.state.LngObject.custom_widget_warning)}
                                        </ol>
                                    </li>
                                </ol>
                            </li>
                            {this.createListItem(this.state.LngObject.select_date_range)}
                            {this.createListItem(this.state.LngObject.click_step2)}
                            <li>
                                <span data-tag="select_data2">{this.state.LngObject.select_data2}</span>
                                <ol style={{ listStyleType: "lower-alpha" }}>
                                    {this.createListItem(this.state.LngObject.ic_data_info_preset)}
                                    <li style={{ overflowWrap: "break-word" }}>
                                        {this.state.LngObject.ic_data_info_configure}
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            {this.createListItem("Landsat 5 - B1, B2, B3, B4, B5, B6, B7")}
                                            {this.createListItem("Landsat 7 - B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8")}
                                            {this.createListItem("Landsat 8 - B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11")}
                                            {this.createListItem("Sentinel 2 - B1, B2, B3, B4, B5, B6, B7, B8, B8a, B9, B10, B11, B12")}
                                        </ol>
                                    </li>
                                    {this.createListItem(this.state.LngObject.image_asset)}
                                    <li>
                                        <span>{this.state.LngObject.image_collection_asset}</span>
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            <li style={{ overflowWrap: "break-word" }}>
                                                <span>{this.state.LngObject.enter_image_asset}</span> users/ValeriaContessa/Indonesia_2000
                                            </li>
                                            <li style={{ overflowWrap: "break-word" }}>
                                                <span data-tag="enter_image_asset_params"> {this.state.LngObject.enter_image_asset_params}</span>
                                                {"{\"bands\":\"B4,B5,B3\",\"min\":\"10,0,10\",\"max\":\"120,90,70\"}"}
                                            </li>
                                            {this.createListItem(this.state.LngObject.skip_date)}
                                        </ol>
                                    </li>
                                    <li>
                                        <span data-tag="image_collection_asset">{this.state.LngObject.image_collection_asset}</span>
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            {this.createListItem("Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"} \n   2018-01-01 to 2018-12-31")}
                                            {this.createListItem(this.state.LngObject.custom_widget_warning)}
                                        </ol>
                                    </li>
                                </ol>
                            </li>
                            <li>
                                <span>{this.state.LngObject.select_date_range}</span> <span>{this.state.LngObject.for_data2}</span>
                            </li>
                            {this.createListItem(this.state.LngObject.click_create)}
                            {this.createListItem(this.state.LngObject.reposition)}
                        </ol>
                        <br style={{ clear: "both" }}/>
                    </Collapsible>
                    <Collapsible
                        trigger={this.state.LngObject.add_image_asset}
                        triggerTagName="h2"
                    >
                        <img
                            src={this.props.documentRoot + "/img/image_asset_widget.gif"}
                            className="previewImg"
                            onClick={(e) => this.toggleHelpImage(e)}
                        />
                        <br className="previewbreak"/>
                        <ol>
                            {this.createListItem(this.state.LngObject.click_add_widget)}
                            {this.createListItem(this.state.LngObject.select_image_asset)}
                            {this.createListItem(this.state.LngObject.choose_basemap)}
                            {this.createListItem(this.state.LngObject.give_title)}
                            <li style={{ overflowWrap: "break-word" }}>
                                <span data-tag="enter_image_asset">{this.state.LngObject.enter_image_asset}</span> {"users/billyz313/carbon_monoxide"}
                            </li>
                            <li style={{ overflowWrap: "break-word" }}>
                                <span data-tag="enter_image_asset_params">{this.state.LngObject.enter_image_asset_params}</span>
                                {"{\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"}"}
                            </li>
                            {this.createListItem(this.state.LngObject.click_create)}
                            {this.createListItem(this.state.LngObject.reposition)}
                        </ol>
                        <br style={{ clear: "both" }}/>
                    </Collapsible>
                    <Collapsible
                        trigger={this.state.LngObject.add_image_collection_widget}
                        triggerTagName="h2"
                    >
                        <img
                            src={this.props.documentRoot + "/img/image_collection_asset_widget.gif"}
                            className="previewImg"
                            onClick={(e) => this.toggleHelpImage(e)}
                        />
                        <br className="previewbreak"/>
                        <ol>
                            {this.createListItem(this.state.LngObject.click_add_widget)}
                            {this.createListItem(this.state.LngObject.select_image_collection)}
                            {this.createListItem(this.state.LngObject.choose_basemap)}
                            {this.createListItem(this.state.LngObject.give_title)}
                            <li>
                                <span>{this.state.LngObject.enter_image_collection_asset}</span> {"users/ValeriaContessa/Indonesia_2000"}
                            </li>
                            <li>
                                <span>{this.state.LngObject.enter_image_asset_params}</span> {"{\"bands\":\"B4,B5,B3\",\"min\":\"10,0,10\",\"max\":\"120,90,70\"}"}
                            </li>
                            {this.createListItem(this.state.LngObject.click_create)}
                            {this.createListItem(this.state.LngObject.reposition)}
                        </ol>
                        <br style={{ clear: "both" }}/>
                    </Collapsible>
                    <Collapsible
                        trigger={this.state.LngObject.to_move_resize}
                        triggerTagName="h2"
                    >
                        <img
                            src={this.props.documentRoot + "/img/change_widget_layout.gif"}
                            className="previewImg"
                            onClick={(e) => this.toggleHelpImage(e)}
                        />
                        <br className="previewbreak"/>
                        <ol>
                            {this.createListItem(this.state.LngObject.drag_drop)}
                            {this.createListItem(this.state.LngObject.resize_by)}
                            {this.createListItem(this.state.LngObject.widgets_realtime)}
                            {this.createListItem(this.state.LngObject.view_rendered)}
                        </ol>
                        <br style={{ clear: "both" }}/>
                    </Collapsible>
                    <Collapsible
                        trigger={this.state.LngObject.gee_image_asset_creation}
                        triggerTagName="h2"
                    >
                        <br className="previewbreak"/>
                        <iframe
                            style={{ width: "100%", height: "570px" }}
                            src="https://www.youtube.com/embed/l57IhmduVBQ"
                            frameBorder="0"
                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                        <br style={{ clear: "both" }}/>
                    </Collapsible>
                    <Collapsible
                        trigger={this.state.LngObject.gee_imageCollection_asset_creation}
                        triggerTagName="h2"
                    >
                        <br className="previewbreak"/>
                        <iframe
                            style={{ width: "100%", height: "570px" }}
                            src="https://www.youtube.com/embed/7eIvltgDbXw"
                            frameBorder="0"
                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                        <br style={{ clear: "both" }}/>
                    </Collapsible>
                </div>
                <p>
                    <span>{this.state.LngObject.pre_sepal_link}</span>
                    <a
                        href="http://www.openforis.org/tools/sepal.html"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        OpenForis-SEPAL
                    </a>
                    <span>{this.state.LngObject.post_sepal_link}</span>
                </p>
            </div>
        );
    }
}

export function renderGeodashHelpPage(args) {
    ReactDOM.render(
        <GeoDashHelp documentRoot={args.documentRoot} browserLanguage={args.browserLanguage}/>,
        document.getElementById("dashHolder")
    );
}

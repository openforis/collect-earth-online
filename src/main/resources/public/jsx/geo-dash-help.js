import React from "react";
import ReactDOM from "react-dom";
import { CollapsibleSectionBlock, ExpandableImage } from "./components/FormComponents";

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

    expandableImageWrapper = (src) => (
        <ExpandableImage
            src={this.props.documentRoot + src}
            previewStyles={{
                float:"right",
                width:"284px",
                marginBottom:"1rem",
                marginLeft:"1rem",
            }}
        />
    )

    render() {
        const { LngObject } = this.state;
        return (
            <div className="container-fluid" style={{ overflowWrap: "break-word" }}>
                <div className="col-xl-10 offset-xl-1 col-lg-10 offset-lg-1 justify-content-center">
                    <h1>{LngObject.title}</h1>
                    <CollapsibleSectionBlock title={LngObject.head_image_collection_widget}>
                        {this.expandableImageWrapper("/img/image_collection_widget.gif")}
                        <ol>
                            <li>{LngObject.click_add_widget}</li>
                            <li>{LngObject.select_image_collection}</li>
                            <li>{LngObject.choose_basemap}</li>
                            <li>
                                {LngObject.select_data}
                                <ol style={{ listStyleType: "lower-alpha" }}>
                                    <li>{LngObject.ic_data_info_preset}</li>
                                    <li>
                                        {LngObject.ic_data_info_configure}
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            <li>{"Landsat 5 - B1, B2, B3, B4, B5, B6, B7"}</li>
                                            <li>{"Landsat 7 - B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8"}</li>
                                            <li>{"Landsat 8 - B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11"}</li>
                                            <li>{"Sentinel 2 - B1, B2, B3, B4, B5, B6, B7, B8, B8a, B9, B10, B11, B12"}</li>
                                        </ol>
                                    </li>
                                    <li>
                                        <span data-tag="custom_widget_info"></span>
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            <li>
                                                {" Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO\n" +
                                                 "                                                {\"{\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"}\"}\n" +
                                                 "                                            2018-01-01 to 2018-12-31"}
                                            </li>
                                            <li>{LngObject.custom_widget_warning}</li>
                                        </ol>
                                    </li>
                                </ol>
                            </li>
                            <li>{LngObject.select_date_range}</li>
                            <li>{LngObject.click_create}</li>
                            <li>{LngObject.reposition}</li>
                        </ol>
                    </CollapsibleSectionBlock>
                    <CollapsibleSectionBlock title={LngObject.add_time_series_graph}>
                        {this.expandableImageWrapper("/img/time_series_graph_widget.gif")}
                        <ol>
                            <li>{LngObject.click_add_widget}</li>
                            <li>{LngObject.select_time_series}</li>
                            <li>
                                {LngObject.select_data}
                                <ol style={{ listStyleType: "lower-alpha" }}>
                                    <li>{LngObject.configured_graph}</li>
                                    <li>
                                        {LngObject.custom_graph}
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            <li>{LngObject.image_collection_graph}</li>
                                            <li>{LngObject.band_to_graph}</li>
                                            <li>{LngObject.graph_reducer}</li>
                                        </ol>
                                    </li>
                                </ol>
                            </li>
                            <li>{LngObject.select_date_range}</li>
                            <li>{LngObject.click_create}</li>
                            <li>{LngObject.reposition}</li>
                        </ol>
                    </CollapsibleSectionBlock>
                    <CollapsibleSectionBlock title={LngObject.add_stats_widget}>
                        {this.expandableImageWrapper("/img/statistics_widget.gif")}
                        <ol>
                            <li>{LngObject.click_add_widget}</li>
                            <li>{LngObject.select_stats}</li>
                            <li>{LngObject.give_title}</li>
                            <li>{LngObject.click_create}</li>
                            <li>{LngObject.reposition}</li>
                        </ol>
                    </CollapsibleSectionBlock>
                    <CollapsibleSectionBlock title={LngObject.add_dual_image_collection}>
                        {this.expandableImageWrapper("/img/dual_image_collection_widget.gif")}
                        <ol>
                            <li>{LngObject.click_add_widget}</li>
                            <li>{LngObject.select_dual_image_collection}</li>
                            <li>{LngObject.choose_basemap}</li>
                            <li>
                                <span data-tag="select_data">{LngObject.select_data}</span>
                                <ol style={{ listStyleType: "lower-alpha" }}>
                                    <li>{LngObject.ic_data_info_preset}</li>
                                    <li data-tag="ic_data_info_configure">
                                        {LngObject.ic_data_info_configure}
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            <li>{"Landsat 5 - B1, B2, B3, B4, B5, B6, B7"}</li>
                                            <li>{"Landsat 7 - B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8"}</li>
                                            <li>{"Landsat 8 - B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11"}</li>
                                            <li>{"Sentinel 2 - B1, B2, B3, B4, B5, B6, B7, B8, B8a, B9, B10, B11, B12"}</li>
                                        </ol>
                                    </li>
                                    <li>{LngObject.image_asset}</li>
                                    <li>
                                        <span data-tag="image_collection_asset">{LngObject.image_collection_asset}</span>
                                        <ol style={{ listStyleType: "lower-alpha" }}>
                                            <li>{LngObject.give_title}</li>
                                            <li>{LngObject.enter_image_asset + "users/ValeriaContessa/Indonesia_2000"}</li>
                                            <li>
                                                {LngObject.enter_image_asset_params}
                                                {"{\"bands\":\"B4,B5,B3\",\"min\":\"10,0,10\",\"max\":\"120,90,70\"}"}
                                            </li>
                                            <li>{LngObject.skip_date}</li>
                                        </ol>
                                    </li>
                                    <li>
                                        <span data-tag="custom_widget_info">{LngObject.custom_widget_info}</span>
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            <li>{"Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"} \n 2018-01-01 to 2018-12-31"}</li>
                                            <li>{LngObject.custom_widget_warning}</li>
                                        </ol>
                                    </li>
                                </ol>
                            </li>
                            <li>{LngObject.select_date_range}</li>
                            <li>{LngObject.click_step2}</li>
                            <li>
                                <span data-tag="select_data2">{LngObject.select_data2}</span>
                                <ol style={{ listStyleType: "lower-alpha" }}>
                                    <li>{LngObject.ic_data_info_preset}</li>
                                    <li>
                                        {LngObject.ic_data_info_configure}
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            <li>{"Landsat 5 - B1, B2, B3, B4, B5, B6, B7"}</li>
                                            <li>{"Landsat 7 - B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8"}</li>
                                            <li>{"Landsat 8 - B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11"}</li>
                                            <li>{"Sentinel 2 - B1, B2, B3, B4, B5, B6, B7, B8, B8a, B9, B10, B11, B12"}</li>
                                        </ol>
                                    </li>
                                    <li>{LngObject.image_asset}</li>
                                    <li>
                                        {LngObject.image_collection_asset}
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            <li>{LngObject.enter_image_asset + "users/ValeriaContessa/Indonesia_2000"}</li>
                                            <li>
                                                <span data-tag="enter_image_asset_params"> {LngObject.enter_image_asset_params}</span>
                                                {"{\"bands\":\"B4,B5,B3\",\"min\":\"10,0,10\",\"max\":\"120,90,70\"}"}
                                            </li>
                                            <li>{LngObject.skip_date}</li>
                                        </ol>
                                    </li>
                                    <li>
                                        <span data-tag="image_collection_asset">{LngObject.image_collection_asset}</span>
                                        <ol style={{ listStyleType: "lower-roman" }}>
                                            <li>{"Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"} \n   2018-01-01 to 2018-12-31"}</li>
                                            <li>{LngObject.custom_widget_warning}</li>
                                        </ol>
                                    </li>
                                </ol>
                            </li>
                            <li>{LngObject.select_date_range + LngObject.for_data2}</li>
                            <li>{LngObject.click_create}</li>
                            <li>{LngObject.reposition}</li>
                        </ol>
                    </CollapsibleSectionBlock>
                    <CollapsibleSectionBlock title={LngObject.add_image_asset}>
                        {this.expandableImageWrapper("/img/image_asset_widget.gif")}
                        <ol>
                            <li>{LngObject.click_add_widget}</li>
                            <li>{LngObject.select_image_asset}</li>
                            <li>{LngObject.choose_basemap}</li>
                            <li>{LngObject.give_title}</li>
                            <li>
                                <span data-tag="enter_image_asset">{LngObject.enter_image_asset}</span> {"users/billyz313/carbon_monoxide"}
                            </li>
                            <li>
                                <span data-tag="enter_image_asset_params">{LngObject.enter_image_asset_params}</span>
                                {"{\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"}"}
                            </li>
                            <li>{LngObject.click_create}</li>
                            <li>{LngObject.reposition}</li>
                        </ol>
                    </CollapsibleSectionBlock>
                    <CollapsibleSectionBlock title={LngObject.add_image_collection_widget}>
                        {this.expandableImageWrapper("/img/image_collection_asset_widget.gif")}
                        <ol>
                            <li>{LngObject.click_add_widget}</li>
                            <li>{LngObject.select_image_collection}</li>
                            <li>{LngObject.choose_basemap}</li>
                            <li>{LngObject.give_title}</li>
                            <li>{LngObject.enter_image_collection_asset + "users/ValeriaContessa/Indonesia_2000"}</li>
                            <li>{LngObject.enter_image_asset_params + "{\"bands\":\"B4,B5,B3\",\"min\":\"10,0,10\",\"max\":\"120,90,70\"}"}</li>
                            <li>{LngObject.click_create}</li>
                            <li>{LngObject.reposition}</li>
                        </ol>
                    </CollapsibleSectionBlock>
                    <CollapsibleSectionBlock title={LngObject.to_move_resize}>
                        {this.expandableImageWrapper("/img/change_widget_layout.gif")}
                        <ol>
                            <li>{LngObject.drag_drop}</li>
                            <li>{LngObject.resize_by}</li>
                            <li>{LngObject.widgets_realtime}</li>
                            <li>{LngObject.view_rendered}</li>
                        </ol>
                    </CollapsibleSectionBlock>
                    <CollapsibleSectionBlock title={LngObject.gee_image_asset_creation}>
                        <iframe
                            style={{ width: "100%", height: "570px" }}
                            src="https://www.youtube.com/embed/l57IhmduVBQ"
                            frameBorder="0"
                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </CollapsibleSectionBlock>
                    <CollapsibleSectionBlock title={LngObject.gee_imageCollection_asset_creation}>
                        <iframe
                            style={{ width: "100%", height: "570px" }}
                            src="https://www.youtube.com/embed/7eIvltgDbXw"
                            frameBorder="0"
                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </CollapsibleSectionBlock>
                </div>
                <p>
                    {LngObject.pre_sepal_link}
                    <a
                        href="http://www.openforis.org/tools/sepal.html"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        OpenForis-SEPAL
                    </a>
                    {LngObject.post_sepal_link}
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

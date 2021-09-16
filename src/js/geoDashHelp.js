import React from "react";
import ReactDOM from "react-dom";
import {CollapsibleSectionBlock, ExpandableImage} from "./components/FormComponents";
import {NavigationBar, LogoBanner} from "./components/PageComponents";
import {getLanguage} from "./utils/generalUtils";

class GeoDashHelp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lngObject: {}
        };
    }

    componentDidMount() {
        fetch(`/locale/geodashhelp/${getLanguage(["en", "es"])}.json`)
            .then(res => res.json())
            .then(data => this.setState({lngObject: data}));
    }

    expandableImageWrapper = src => (
        <ExpandableImage
            previewStyles={{
                float:"right",
                width:"284px",
                marginBottom:"1rem",
                marginLeft:"1rem"
            }}
            src={src}
        />
    );

    render() {
        const {lngObject} = this.state;
        return (
            <section className="container" id="geo-dash-help">
                <div className="container-fluid" style={{overflowWrap: "break-word"}}>
                    <div className="col-xl-10 offset-xl-1 col-lg-10 offset-lg-1 justify-content-center">
                        <h1>{lngObject.title}</h1>
                        <CollapsibleSectionBlock title={lngObject.head_image_collection_widget}>
                            {this.expandableImageWrapper("/img/geodash/image_collection_widget.gif")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.select_image_collection}</li>
                                <li>{lngObject.choose_basemap}</li>
                                <li>
                                    {lngObject.select_data}
                                    <ol style={{listStyleType: "lower-alpha"}}>
                                        <li>{lngObject.ic_data_info_preset}</li>
                                        <li>
                                            {lngObject.ic_data_info_configure}
                                            <ol style={{listStyleType: "lower-roman"}}>
                                                <li>
                                                    Landsat 5 - B1, B2, B3, B4, B5, B6, B7 - Sample parameters: bands:
                                                    &apos;B4,B5,B3&apos; min: &apos;0.05,0.01,0.07&apos;, max: &apos;0.45,0.5,0.4&apos;, cloudLessThan: 90
                                                </li>
                                                <li>
                                                    Landsat 7 - B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8 - Sample parameters: bands:
                                                    &apos;B4,B5,B3&apos;, min: &apos;0.03,0.01,0.05&apos;, max: &apos;0.45,0.5,0.4&apos;, cloudLessThan: 90
                                                </li>
                                                <li>
                                                    Landsat 8 - B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11 - Sample parameters: bands:
                                                    &apos;B5,B6,B4&apos;, min: &apos;0.03,0.01,0.04&apos;, max: &apos;0.45,0.5,0.32&apos;, cloudLessThan: 90
                                                </li>
                                                <li>
                                                    Sentinel 2 - B1, B2, B3, B4, B5, B6, B7, B8, B8a, B9, B10, B11, B12 - Sample parameters: bands:
                                                    &apos;B8,B4,B3&apos;, min: &apos;900,450,800&apos;, max: &apos;5200,3000,2000&apos;, cloudLessThan: 10
                                                </li>
                                            </ol>
                                        </li>
                                        <li>
                                            {lngObject.custom_widget_info}
                                            <ol style={{listStyleType: "lower-roman"}}>
                                                <li>
                                                    {" Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO\n"
                                                        + "{\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"}\n"
                                                        + "2018-01-01 to 2018-12-31"}
                                                </li>
                                                <li>{lngObject.custom_widget_warning}</li>
                                            </ol>
                                        </li>
                                    </ol>
                                </li>
                                <li>{lngObject.select_date_range}</li>
                                <li>{lngObject.click_create}</li>
                                <li>{lngObject.reposition}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_time_series_graph}>
                            {this.expandableImageWrapper("/img/geodash/time_series_graph_widget.gif")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.select_time_series}</li>
                                <li>
                                    {lngObject.select_data}
                                    <ol style={{listStyleType: "lower-alpha"}}>
                                        <li>{lngObject.configured_graph}</li>
                                        <li>
                                            {lngObject.custom_graph}
                                            <ol style={{listStyleType: "lower-roman"}}>
                                                <li>{lngObject.image_collection_graph}</li>
                                                <li>{lngObject.band_to_graph}</li>
                                                <li>{lngObject.graph_reducer}</li>
                                            </ol>
                                        </li>
                                    </ol>
                                </li>
                                <li>{lngObject.select_date_range}</li>
                                <li>{lngObject.click_create}</li>
                                <li>{lngObject.reposition}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_stats_widget}>
                            {this.expandableImageWrapper("/img/geodash/statistics_widget.gif")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.select_stats}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.click_create}</li>
                                <li>{lngObject.reposition}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_dual_image_collection}>
                            {this.expandableImageWrapper("/img/geodash/dual_image_collection_widget.gif")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.select_dual_image_collection}</li>
                                <li>{lngObject.choose_basemap}</li>
                                <li>
                                    {lngObject.select_data}
                                    <ol style={{listStyleType: "lower-alpha"}}>
                                        <li>{lngObject.ic_data_info_preset}</li>
                                        <li>
                                            {lngObject.ic_data_info_configure}
                                            <ol style={{listStyleType: "lower-roman"}}>
                                                <li>Landsat 5 - B1, B2, B3, B4, B5, B6, B7</li>
                                                <li>Landsat 7 - B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8</li>
                                                <li>Landsat 8 - B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11</li>
                                                <li>Sentinel 2 - B1, B2, B3, B4, B5, B6, B7, B8, B8a, B9, B10, B11, B12</li>
                                            </ol>
                                        </li>
                                        <li>{lngObject.image_asset}</li>
                                        <li>
                                            {lngObject.image_collection_asset}
                                            <ol style={{listStyleType: "lower-alpha"}}>
                                                <li>{lngObject.give_title}</li>
                                                <li>{lngObject.enter_image_asset + "users/ValeriaContessa/Indonesia_2000"}</li>
                                                <li>
                                                    {lngObject.enter_image_asset_params}
                                                    {"{\"bands\":\"B4,B5,B3\",\"min\":\"10,0,10\",\"max\":\"120,90,70\"}"}
                                                </li>
                                                <li>{lngObject.skip_date}</li>
                                            </ol>
                                        </li>
                                        <li>
                                            {lngObject.custom_widget_info}
                                            <ol style={{listStyleType: "lower-roman"}}>
                                                <li>{"Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"} \n 2018-01-01 to 2018-12-31"}</li>
                                                <li>{lngObject.custom_widget_warning}</li>
                                            </ol>
                                        </li>
                                    </ol>
                                </li>
                                <li>{lngObject.select_date_range}</li>
                                <li>{lngObject.click_step2}</li>
                                <li>
                                    {lngObject.select_data2}
                                    <ol style={{listStyleType: "lower-alpha"}}>
                                        <li>{lngObject.ic_data_info_preset}</li>
                                        <li>
                                            {lngObject.ic_data_info_configure}
                                            <ol style={{listStyleType: "lower-roman"}}>
                                                <li>Landsat 5 - B1, B2, B3, B4, B5, B6, B7</li>
                                                <li>Landsat 7 - B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8</li>
                                                <li>Landsat 8 - B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11</li>
                                                <li>Sentinel 2 - B1, B2, B3, B4, B5, B6, B7, B8, B8a, B9, B10, B11, B12</li>
                                            </ol>
                                        </li>
                                        <li>{lngObject.image_asset}</li>
                                        <li>
                                            {lngObject.image_collection_asset}
                                            <ol style={{listStyleType: "lower-roman"}}>
                                                <li>{lngObject.enter_image_asset + "users/ValeriaContessa/Indonesia_2000"}</li>
                                                <li>
                                                    {lngObject.enter_image_asset_params}
                                                    {"{\"bands\":\"B4,B5,B3\",\"min\":\"10,0,10\",\"max\":\"120,90,70\"}"}
                                                </li>
                                                <li>{lngObject.skip_date}</li>
                                            </ol>
                                        </li>
                                        <li>
                                            {lngObject.custom_widget_info}
                                            <ol style={{listStyleType: "lower-roman"}}>
                                                <li>{"Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"} \n   2018-01-01 to 2018-12-31"}</li>
                                                <li>{lngObject.custom_widget_warning}</li>
                                            </ol>
                                        </li>
                                    </ol>
                                </li>
                                <li>{lngObject.select_date_range}{lngObject.for_data2}</li>
                                <li>{lngObject.click_create}</li>
                                <li>{lngObject.reposition}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_image_asset}>
                            {this.expandableImageWrapper("/img/geodash/image_asset_widget.gif")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.select_image_asset}</li>
                                <li>{lngObject.choose_basemap}</li>
                                <li>{lngObject.give_title}</li>
                                <li>
                                    {lngObject.enter_image_asset + " users/billyz313/carbon_monoxide"}
                                </li>
                                <li>
                                    {lngObject.enter_image_asset_params}
                                    {"{\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"}"}
                                </li>
                                <li>{lngObject.click_create}</li>
                                <li>{lngObject.reposition}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_image_collection_widget}>
                            {this.expandableImageWrapper("/img/geodash/image_collection_asset_widget.gif")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.select_image_collection_asset}</li>
                                <li>{lngObject.choose_basemap}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.enter_image_collection_asset + "users/ValeriaContessa/Indonesia_2000"}</li>
                                <li>{lngObject.enter_image_asset_params + "{\"bands\":\"B4,B5,B3\",\"min\":\"10,0,10\",\"max\":\"120,90,70\"}"}</li>
                                <li>{lngObject.click_create}</li>
                                <li>{lngObject.reposition}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_degradation_widget}>
                            {this.expandableImageWrapper("/img/geodash/create_degradation_widget.gif")}
                            <ol>
                                <li>{lngObject.select_degradation}</li>
                                <li>{lngObject.choose_basemap}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.select_band_to_graph}</li>
                                <li>{lngObject.select_date_range}{lngObject.for_data2}</li>
                                <li>{lngObject.click_create}</li>
                                <li>{lngObject.reposition}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.to_move_resize}>
                            {this.expandableImageWrapper("/img/geodash/change_widget_layout.gif")}
                            <ol>
                                <li>{lngObject.drag_drop}</li>
                                <li>{lngObject.resize_by}</li>
                                <li>{lngObject.widgets_realtime}</li>
                                <li>{lngObject.view_rendered}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.gee_image_asset_creation}>
                            <iframe
                                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                frameBorder="0"
                                src="https://www.youtube.com/embed/l57IhmduVBQ"
                                style={{width: "100%", height: "570px"}}
                                title="asset-create"
                            />
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.gee_imageCollection_asset_creation}>
                            <iframe
                                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                frameBorder="0"
                                src="https://www.youtube.com/embed/7eIvltgDbXw"
                                style={{width: "100%", height: "570px"}}
                                title="image-collection"
                            />
                        </CollapsibleSectionBlock>
                    </div>
                    <p>
                        {lngObject.pre_sepal_link}
                        <a
                            href="http://www.openforis.org/tools/sepal.html"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            OpenForis-SEPAL
                        </a>
                        {lngObject.post_sepal_link}
                    </p>
                </div>
                <LogoBanner/>
            </section>
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar
            userId={args.userId}
            userName={args.userName}
            version={args.version}
        >
            <GeoDashHelp/>
        </NavigationBar>,
        document.getElementById("app")
    );
}

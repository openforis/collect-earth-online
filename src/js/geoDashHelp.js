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
                        <h1 style={{paddingTop: "1rem"}}>{lngObject.title}</h1>
                        <CollapsibleSectionBlock title={lngObject.add_degradation_widget}>
                            {this.expandableImageWrapper("/img/geodash/create_degradation_widget.png")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.select_degradation}</li>
                                <li>{lngObject.choose_basemap}</li>
                                <li>{lngObject.choose_band}</li>
                                <li>{lngObject.click_create}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_dual_image_collection}>
                            {this.expandableImageWrapper("/img/geodash/create_dual_imagery_widget.png")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.select_dual_image_collection}</li>
                                <li>{lngObject.choose_basemap}</li>
                                <li>{lngObject.select_imagery_type}</li>
                                <li>{lngObject.select_remaining_imagery}</li>
                                <li>{lngObject.select_date_range}</li>
                                <li>{lngObject.click_create}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_image_asset}>
                            {this.expandableImageWrapper("/img/geodash/create_image_asset_widget.png")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.select_image_asset}</li>
                                <li>{lngObject.choose_basemap}</li>
                                <li>
                                    {lngObject.enter_image_asset + " (e.g. users/billyz313/carbon_monoxide)."}
                                </li>
                                <li>{lngObject.choose_band}</li>
                                <li>
                                    {lngObject.enter_image_asset_params + " (e.g. {\"bands\":\"CO_column_number_density,H2O_column_number_density,cloud_height\",\"min\":\"0\",\"max\":\"0.5\"})."}
                                </li>
                                <li>{lngObject.click_create}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_image_collection_asset_widget}>
                            {this.expandableImageWrapper("/img/geodash/create_image_collection_asset_widget.png")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.select_image_collection_asset}</li>
                                <li>{lngObject.choose_basemap}</li>
                                <li>
                                    {lngObject.enter_image_asset + " (e.g. users/billyz313/carbon_monoxide)."}
                                </li>
                                <li>{lngObject.choose_band}</li>
                                <li>
                                    {lngObject.enter_image_asset_params + " (e.g. {\"bands\":\"B4,B5,B3\",\"min\":\"10,0,10\",\"max\":\"120,90,70\"})."}
                                </li>
                                <li>{lngObject.select_date_range}</li>
                                <li>{lngObject.click_create}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_polygon_compare_widget}>
                            {this.expandableImageWrapper("/img/geodash/create_polygon_compare_widget.png")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.select_polygon_compare}</li>
                                <li>{lngObject.fill_remaining_fields}</li>
                                <li>{lngObject.click_create}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_preloaded_image_collections_widget}>
                            {this.expandableImageWrapper("/img/geodash/create_preloaded_image_collections_widget.png")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.select_preloaded_image_collections}</li>
                                <li>{lngObject.choose_basemap}</li>
                                <li>{lngObject.select_data_type_preloaded}</li>
                                <li>{lngObject.select_date_range}</li>
                                <li>{lngObject.click_create}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_stats_widget}>
                            {this.expandableImageWrapper("/img/geodash/create_statistics_widget.png")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.select_stats}</li>
                                <li>{lngObject.click_create}</li>
                            </ol>
                        </CollapsibleSectionBlock>
                        <CollapsibleSectionBlock title={lngObject.add_time_series_graph}>
                            {this.expandableImageWrapper("/img/geodash/create_time_series_graph_widget.png")}
                            <ol>
                                <li>{lngObject.click_add_widget}</li>
                                <li>{lngObject.give_title}</li>
                                <li>{lngObject.select_time_series}</li>
                                <li>{lngObject.select_data_type_time_series}</li>
                                <li>{lngObject.select_date_range}</li>
                                <li>{lngObject.click_create}</li>
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

<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<section id="about" class="container">
    <style>
        .previewImg{
            float:right;
            width:284px;
            cursor: pointer;
            z-index: 100;
            border:1px solid #808080;
        }
        .previewImg.fullpreview{
            position: fixed;
            top: 60px;
            bottom: 0;
            left: 0;
            right: 0;
            margin: auto;
            overflow: auto;
            min-height: calc(98% - 60px);
            max-width: 99%;
            max-height: calc(98% - 60px);
            width: auto;
            height: auto;
        }
        .previewbreak{
            display:none;
        }

        @media (max-width: 768px) {
            .previewImg{
                width:100%;
            }
            .previewImg.fullpreview {
                min-height: unset;
                max-width: unset;
                max-height: unset;
                width: 100vw;
                height: auto;
            }
                .previewbreak {
                    display: block;
                    clear: both;
                }

            }
</style>
    <script type="text/javascript" language="JavaScript">
        function toggleHelpImage(which)
        {
            if(document.body.style.overflow == "hidden"){
                document.body.style.overflow = "auto";
                which.className = which.className.replace(/\bfullpreview\b/g, "");
            }
            else{
                document.body.style.overflow = "hidden";

                var name, arr;
                name = "fullpreview";
                arr = which.className.split(" ");
                if (arr.indexOf(name) == -1) {
                    which.className += " " + name;
                }
            }
        }
    </script>
    <div class="col-xl-8 offset-xl-2 col-lg-10 justify-content-center">

        <script type="text/javascript" language="JavaScript">
            function Translate() {
                //initialization
                this.init =  function(attribute, lng){
                    this.attribute = attribute;
                    this.lng = lng;
                }
                //translate
                this.process = function(){
                    _self = this;
                    var xrhFile = new XMLHttpRequest();
                    //load content data
                    this.lng = this.lng == "es"? "es":"en";
                    xrhFile.open("GET", "../locale/geodashhelp_"+this.lng+".json", false);
                    xrhFile.onreadystatechange = function ()
                    {
                        if(xrhFile.readyState === 4)
                        {
                            if(xrhFile.status === 200 || xrhFile.status == 0)
                            {
                                var LngObject = JSON.parse(xrhFile.responseText);
                                console.log(LngObject["name1"]);
                                var allDom = document.getElementsByTagName("*");
                                for(var i =0; i < allDom.length; i++){
                                    var elem = allDom[i];
                                    var key = elem.getAttribute(_self.attribute);

                                    if(key != null) {
                                        console.log(key);
                                        elem.innerHTML = LngObject[key]  ;
                                    }
                                }

                            }
                        }
                    }
                    xrhFile.send();
                }
            }
            var tLanguage = "${browserLanguage}" == "es"?"es":"en";
            function runOnLoad() {
                var translate = new Translate();
                var currentLng = tLanguage;//'fr'
                var attributeName = 'data-tag';
                translate.init(attributeName, currentLng);
                translate.process();
            }
            // if(document.readyState === "complete") {
            //     runOnLoad();
            // } else {
            //     document.onreadystatechange = function() {
            //         if(document .readyState === "complete") {
            //             runOnLoad();
            //         }
            //     }
            // }
        </script>

    <h1 data-tag="title"></h1>

            <h2 data-tag="head_image_collection_widget"></h2>

                <img src="${root}/img/image_collection_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
                <br class="previewbreak" />
                <ol>
                    <li data-tag="click_add_widget">

                    </li>
                    <li data-tag="select_image_collection">
                    </li>
                    <li data-tag="choose_basemap">
                    </li>
                    <li>
                        <span data-tag="select_data"></span>
                        <ol style="list-style-type: lower-alpha">
                            <li data-tag="ic_data_info_preset">

                            </li>
                            <li data-tag="ic_data_info_configure">

                                <ol style="list-style-type: lower-roman">
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
                                <ol style="list-style-type: lower-roman">
                                    <li>
                                        Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"} 2018-01-01 to 2018-12-31
                                    </li>
                                    <li data-tag="custom_widget_warning">

                                    </li>
                                </ol>
                            </li>
                        </ol>
                    </li>
                    <li data-tag="select_date_range">

                    </li>
                    <li data-tag="click_create">

                    </li>
                    <li data-tag="reposition"></li>
                </ol>

        <h2>To add a Time Series Graph Widget:</h2>

        <img src="${root}/img/time_series_graph_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak" />
        <ol>
            <li data-tag="click_add_widget">

            </li>
            <li>
                Select Time Series Graph in the type drop down
            </li>
            <li>
                <span data-tag="select_data"></span>
                <ol style="list-style-type: lower-alpha">
                    <li>
                        NDVI, EVI, EVI 2, NDMI, and NDWI are preconfigured with the correct band.  If you select those you will just need to add a title for the widget (I recommend {Data} {Date range} for example NDVI 2001 or NDVI 2001 - 2002}) and the date range.
                    </li>
                    <li>
                        Custom widget - Any collection from Google Earth Engine can be added if you know the dataset.  You simply need to know the image name, the band you would like graphed, and how you would like the graph reduced, for example.
                        <ol style="list-style-type: lower-roman">
                            <li>
                                GEE Image Collection - COPERNICUS/S5P/OFFL/L3_CO
                            </li>
                            <li>
                                Band to graph - CO_column_number_density
                            </li>
                            <li>
                                Select the Reducer in the dropdown
                            </li>
                        </ol>
                    </li>
                </ol>
            </li>
            <li data-tag="select_date_range">

            </li>
            <li data-tag="click_create">

            </li>
            <li data-tag="reposition"></li>
        </ol>


        <h2>To add a Statistics Widget:</h2>

        <img src="${root}/img/statistics_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak" />
        <ol>
            <li data-tag="click_add_widget">

            </li>
            <li>
                Select Statistics in the type drop down
            </li>
            <li>
                Give widget a title
            </li>
            <li data-tag="click_create">

            </li>
            <li data-tag="reposition"></li>
        </ol>
        <br style="clear:both;" />



        <h2>To add a Dual Image Collection Widget:</h2>

        <img src="${root}/img/dual_image_collection_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak" />
        <ol>
            <li data-tag="click_add_widget">
            </li>
            <li>
                Select Dual Image Collection in the type drop down
            </li>
            <li data-tag="choose_basemap">

            </li>
            <li>
                <span data-tag="select_data"></span>
                <ol style="list-style-type: lower-alpha">
                    <li data-tag="ic_data_info_preset">

                    </li>
                    <li data-tag="ic_data_info_configure">

                        <ol style="list-style-type: lower-roman">
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
                        Image Asset (see Image Asset example below and skip the next step as you will not need to select a date range)
                    </li>
                    <li>
                        Image Collection Asset
                        <ol style="list-style-type: lower-roman">
                            <li>
                                Give widget a title
                            </li>
                            <li>
                                Enter the GEE Image Asset - Example: users/ValeriaContessa/Indonesia_2000
                            </li>
                            <li>
                                Enter Image Parameters for asset - Example: {"bands":"B4,B5,B3","min":"10,0,10","max":"120,90,70"}
                            </li>
                            <li>
                                Skip selecting date since this is a preprocessed asset
                            </li>
                        </ol>
                    </li>
                    <li>
                        <span data-tag="custom_widget_info"></span>
                        <ol style="list-style-type: lower-roman">
                            <li>
                                Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"} 2018-01-01 to 2018-12-31
                            </li>
                            <li  data-tag="custom_widget_warning">

                            </li>
                        </ol>
                    </li>
                </ol>
            </li>
            <li data-tag="select_date_range">

            </li>
            <li>
                Click Step 2
            </li>
            <li>
                Select Data 2:
                <ol style="list-style-type: lower-alpha">
                    <li>
                        NDVI, EVI, EVI 2, NDMI, and NDWI are preconfigured with the correct bands and image parameters.  If you select those you will just need to add a title for the widget (I recommend {Data} {Date range} for example NDVI 2001 or NDVI 2001 - 2002}) and the date range.  There is an option to overlay an additional date range for comparison.  If you would like to enable this feature tick the checkbox and select the second date range.
                    </li>
                    <li data-tag="ic_data_info_configure">

                        <ol style="list-style-type: lower-roman">
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
                        Image Asset (see Image Asset example below and skip the next step as you will not need to select a date range)
                    </li>
                    <li>
                        Image Collection Asset
                        <ol style="list-style-type: lower-roman">
                            <li>
                                Enter the GEE Image Asset - Example: users/ValeriaContessa/Indonesia_2000
                            </li>
                            <li>
                                Enter Image Parameters for asset - Example: {"bands":"B4,B5,B3","min":"10,0,10","max":"120,90,70"}
                            </li>
                            <li>
                                Skip selecting date since this is a preprocessed asset
                            </li>
                        </ol>
                    </li>
                    <li>
                        <span data-tag="custom_widget_info"></span>
                        <ol style="list-style-type: lower-roman">
                            <li>
                                Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"} 2018-01-01 to 2018-12-31
                            </li>
                            <li data-tag="custom_widget_warning">

                            </li>
                        </ol>
                    </li>
                </ol>
            </li>
            <li>
                <span data-tag="select_date_range"></span> for data 2
            </li>
            <li data-tag="click_create">

            </li>
            <li data-tag="reposition"></li>
        </ol>
        <br style="clear:both;" />

        <h2>To add a Image Asset Widget:</h2>

        <img src="${root}/img/image_asset_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak" />
        <ol>
            <li data-tag="click_add_widget">
            </li>
            <li>
                Select Image Asset in the type drop down
            </li>
            <li data-tag="choose_basemap">

            </li>
            <li>
                Give widget a title
            </li>
            <li>
                Enter the GEE Image Asset - Example: users/billyz313/carbon_monoxide
            </li>
            <li>
                Enter Image Parameters for asset - Example: {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"}
            </li>
            <li data-tag="click_create">

            </li>
            <li data-tag="reposition"></li>
        </ol>
        <br style="clear:both;" />

        <h2>To add a Image Collection Asset Widget:</h2>

        <img src="${root}/img/image_collection_asset_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak" />
        <ol>
            <li data-tag="click_add_widget">

            </li>
            <li>
                Select Image Collection Asset in the type drop down
            </li>
            <li data-tag="choose_basemap">

            </li>
            <li>
                Give widget a title
            </li>
            <li>
                Enter the GEE Image Collection Asset - Example: users/ValeriaContessa/Indonesia_2000
            </li>
            <li>
                Enter Image Parameters for asset - Example: {"bands":"B4,B5,B3","min":"10,0,10","max":"120,90,70"}
            </li>
            <li data-tag="click_create">

            </li>
            <li data-tag="reposition"></li>
        </ol>
        <br style="clear:both;" />

        <h2>To move and resize widgets</h2>
        <img src="${root}/img/change_widget_layout.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak" />
        <ol>
            <li>
                Drag and drop
            </li>
            <li>
                Resize by dragging from the bottom right corner
            </li>
            <li>
                Widgets are updated in realtime
            </li>
            <li>
                View rendered results in the Geo-Dash window
            </li>
        </ol>
        <br style="clear:both;" />


        <p>Please access <a href="http://www.openforis.org/tools/sepal.html" target="_blank">OpenForis-SEPAL</a> for more information about SEPAL.</p>
        <script type="text/javascript">
            runOnLoad();
        </script>
        <#include "logo-banner.ftl">
    </div>
</section>
<#include "end-content.ftl">
<#include "footer.ftl">
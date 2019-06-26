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
        </script>

        <h1 data-tag="title"></h1>

        <h2 data-tag="head_image_collection_widget"></h2>

        <img src="${root}/img/image_collection_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak"/>
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
                                Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO
                                {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"}
                                2018-01-01 to 2018-12-31
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

        <h2 data-tag="add_time_series_graph"></h2>

        <img src="${root}/img/time_series_graph_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak"/>
        <ol>
            <li data-tag="click_add_widget">

            </li>
            <li data-tag="select_time_series">

            </li>
            <li>
                <span data-tag="select_data"></span>
                <ol style="list-style-type: lower-alpha">
                    <li data-tag="configured_graph">

                    </li>
                    <li>
                        <span data-tag="custom_graph"></span>
                        <ol style="list-style-type: lower-roman">
                            <li data-tag="image_collection_graph">

                            </li>
                            <li data-tag="band_to_graph">

                            </li>
                            <li data-tag="graph_reducer">

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


        <h2 data-tag="add_stats_widget"></h2>

        <img src="${root}/img/statistics_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak"/>
        <ol>
            <li data-tag="click_add_widget">

            </li>
            <li data-tag="select_stats">

            </li>
            <li data-tag="give_title">

            </li>
            <li data-tag="click_create">

            </li>
            <li data-tag="reposition"></li>
        </ol>
        <br style="clear:both;"/>


        <h2 data-tag="add_dual_image_collection"></h2>

        <img src="${root}/img/dual_image_collection_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak"/>
        <ol>
            <li data-tag="click_add_widget">
            </li>
            <li data-tag="select_dual_image_collection">

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
                    <li data-tag="image_asset">

                    </li>
                    <li>
                        <span data-tag="image_collection_asset"></span>
                        <ol style="list-style-type: lower-roman">
                            <li data-tag="give_title">

                            </li>
                            <li>
                                <span data-tag="enter_image_asset"></span> users/ValeriaContessa/Indonesia_2000
                            </li>
                            <li>
                                <span data-tag="enter_image_asset_params"> </span>{"bands":"B4,B5,B3","min":"10,0,10","max":"120,90,70"}
                            </li>
                            <li data-tag="skip_date">

                            </li>
                        </ol>
                    </li>
                    <li>
                        <span data-tag="custom_widget_info"></span>
                        <ol style="list-style-type: lower-roman">
                            <li>
                                Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO
                                {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"}
                                2018-01-01 to 2018-12-31
                            </li>
                            <li data-tag="custom_widget_warning">

                            </li>
                        </ol>
                    </li>
                </ol>
            </li>
            <li data-tag="select_date_range">

            </li>
            <li data-tag="click_step2">

            </li>
            <li>
                <span data-tag="select_data2"></span>
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
                    <li data-tag="image_asset">

                    </li>
                    <li>
                        <span data-tag="image_collection_asset"></span>
                        <ol style="list-style-type: lower-roman">
                            <li>
                                <span data-tag="enter_image_asset"></span> users/ValeriaContessa/Indonesia_2000
                            </li>
                            <li>
                                <span data-tag="enter_image_asset_params"> </span>
                                {"bands":"B4,B5,B3","min":"10,0,10","max":"120,90,70"}
                            </li>
                            <li data-tag="skip_date">

                            </li>
                        </ol>
                    </li>
                    <li>
                        <span data-tag="custom_widget_info"></span>
                        <ol style="list-style-type: lower-roman">
                            <li>
                                Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO
                                {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"}
                                2018-01-01 to 2018-12-31
                            </li>
                            <li data-tag="custom_widget_warning">

                            </li>
                        </ol>
                    </li>
                </ol>
            </li>
            <li>
                <span data-tag="select_date_range"></span> <span data-tag="for_data2"></span>
            </li>
            <li data-tag="click_create">

            </li>
            <li data-tag="reposition"></li>
        </ol>
        <br style="clear:both;"/>

        <h2 data-tag="add_image_asset"></h2>

        <img src="${root}/img/image_asset_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak"/>
        <ol>
            <li data-tag="click_add_widget">
            </li>
            <li data-tag="select_image_asset">

            </li>
            <li data-tag="choose_basemap">

            </li>
            <li data-tag="give_title">

            </li>
            <li>
                <span data-tag="enter_image_asset"></span> users/billyz313/carbon_monoxide
            </li>
            <li>
                <span data-tag="enter_image_asset_params"></span>
                {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"}
            </li>
            <li data-tag="click_create">

            </li>
            <li data-tag="reposition"></li>
        </ol>
        <br style="clear:both;"/>

        <h2 data-tag="add_image_collection_widget"></h2>

        <img src="${root}/img/image_collection_asset_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak"/>
        <ol>
            <li data-tag="click_add_widget">

            </li>
            <li data-tag="select_image_collection">

            </li>
            <li data-tag="choose_basemap">

            </li>
            <li data-tag="give_title">

            </li>
            <li>
                <span data-tag="enter_image_collection_asset"></span> users/ValeriaContessa/Indonesia_2000
            </li>
            <li>
                <span dtat-tag="enter_image_asset_params"></span> {"bands":"B4,B5,B3","min":"10,0,10","max":"120,90,70"}
            </li>
            <li data-tag="click_create">

            </li>
            <li data-tag="reposition"></li>
        </ol>
        <br style="clear:both;"/>

        <h2 data-tag="to_move_resize"></h2>
        <img src="${root}/img/change_widget_layout.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak"/>
        <ol>
            <li data-tag="drag_drop">

            </li>
            <li data-tag="resize_by">

            </li>
            <li data-tag="widgets_realtime">

            </li>
            <li data-tag="view_rendered">

            </li>
        </ol>
        <br style="clear:both;"/>
        <br />
        <h2 data-tag="gee_image_asset_creation"></h2>
        <br class="previewbreak"/>
        <iframe width="800" height="570" src="https://www.youtube.com/embed/l57IhmduVBQ" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        <br style="clear:both;"/>

        <br />
        <h2 data-tag="gee_imageCollection_asset_creation"></h2>
        <br class="previewbreak"/>
        <iframe width="800" height="570" src="https://www.youtube.com/embed/7eIvltgDbXw" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        <br style="clear:both;"/>


        <p><span data-tag="pre_sepal_link"></span> <a href="http://www.openforis.org/tools/sepal.html"
                                                                   target="_blank">OpenForis-SEPAL</a> <span
                data-tag="post_sepal_link"></span></p>
        <script type="text/javascript">
            runOnLoad();
        </script>
        <#include "logo-banner.ftl">
    </div>
</section>
<#include "end-content.ftl">
<#include "footer.ftl">
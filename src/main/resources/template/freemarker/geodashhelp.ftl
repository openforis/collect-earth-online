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
            width:100vw;
            position:fixed;
            top:60px;
            left:0;
        }
        .previewbreak{
            display:none;
        }

        @media (max-width: 768px) {
            .previewImg{
                width:100%;
            }
            .previewImg.fullpreview{
                width:100vw;
                height:auto;
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
        <h1>Geo-Dash Help Center</h1>

            <h2>To add an Image Collection Widget:</h2>

                <img src="${root}/img/image_collection_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
                <br class="previewbreak" />
                <ol>
                    <li>
                        Click Add Widget
                    </li>
                    <li>
                        Select Image Collection in the type drop down
                    </li>
                    <li>
                        Choose Basemap source from dropdown
                    </li>
                    <li>
                        Select Data:
                        <ol style="list-style-type: lower-alpha">
                            <li>
                                NDVI, EVI, EVI 2, NDMI, and NDWI are preconfigured with the correct bands and image parameters.  If you select those you will just need to add a title for the widget (I recommend {Data} {Date range} for example NDVI 2001 or NDVI 2001 - 2002}) and the date range.  There is an option to overlay an additional date range for comparison.  If you would like to enable this feature tick the checkbox and select the second date range.
                            </li>
                            <li>
                                Landsat 5, Landsat 7, Landsat 8, and Sentinel 2 are partially configured leaving you the option to adjust the bands, min, max, and cloud score.  Available bands for each are:
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
                                Custom widget - Any collection from Google Earth Engine can be added if you know the dataset.  You simply need to know the image name and the image parameters you would like for example:
                                <ol style="list-style-type: lower-roman">
                                    <li>
                                        Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"} 2018-01-01 to 2018-12-31
                                    </li>
                                    <li>
                                        Notice the double quotes in the image parameters for both the property name and the value.  Also, notice there are no spaces.  The vision parameters are similar but slightly different than you would add directly in the Google Earth Engine code editor. For example, the bands parameter in the editor is an array of comma-separated strings, and here it is a single comma separated string
                                    </li>
                                </ol>
                            </li>
                        </ol>
                    </li>
                    <li>
                        Select date range
                    </li>
                    <li>
                        Click Create
                    </li>
                    <li>Reposition and resize to your liking</li>
                </ol>

        <h2>To add a Time Series Graph Widget:</h2>

        <img src="${root}/img/time_series_graph_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak" />
        <ol>
            <li>
                Click Add Widget
            </li>
            <li>
                Select Time Series Graph in the type drop down
            </li>
            <li>
                Select Data:
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
            <li>
                Select date range
            </li>
            <li>
                Click Create
            </li>
            <li>Reposition and resize to your liking</li>
        </ol>


        <h2>To add a Statistics Widget:</h2>

        <img src="${root}/img/statistics_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak" />
        <ol>
            <li>
                Click Add Widget
            </li>
            <li>
                Select Statistics in the type drop down
            </li>
            <li>
                Give widget a title
            </li>
            <li>
                Click Create
            </li>
            <li>Reposition and resize to your liking</li>
        </ol>
        <br style="clear:both;" />



        <h2>To add a Dual Image Collection Widget:</h2>

        <img src="${root}/img/dual_image_collection_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak" />
        <ol>
            <li>
                Click Add Widget
            </li>
            <li>
                Select Dual Image Collection in the type drop down
            </li>
            <li>
                Choose Basemap source from dropdown
            </li>
            <li>
                Select Data:
                <ol style="list-style-type: lower-alpha">
                    <li>
                        NDVI, EVI, EVI 2, NDMI, and NDWI are preconfigured with the correct bands and image parameters.  If you select those you will just need to add a title for the widget (I recommend {Data} {Date range} for example NDVI 2001 or NDVI 2001 - 2002}) and the date range.  There is an option to overlay an additional date range for comparison.  If you would like to enable this feature tick the checkbox and select the second date range.
                    </li>
                    <li>
                        Landsat 5, Landsat 7, Landsat 8, and Sentinel 2 are partially configured leaving you the option to adjust the bands, min, max, and cloud score.  Available bands for each are:
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
                        Custom widget - Any collection from Google Earth Engine can be added if you know the dataset.  You simply need to know the image name and the image parameters you would like for example:
                        <ol style="list-style-type: lower-roman">
                            <li>
                                Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"} 2018-01-01 to 2018-12-31
                            </li>
                            <li>
                                Notice the double quotes in the image parameters for both the property name and the value.  Also, notice there are no spaces.  The vision parameters are similar but slightly different than you would add directly in the Google Earth Engine code editor. For example, the bands parameter in the editor is an array of comma-separated strings, and here it is a single comma separated string
                            </li>
                        </ol>
                    </li>
                </ol>
            </li>
            <li>
                Select date range
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
                    <li>
                        Landsat 5, Landsat 7, Landsat 8, and Sentinel 2 are partially configured leaving you the option to adjust the bands, min, max, and cloud score.  Available bands for each are:
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
                        Custom widget - Any collection from Google Earth Engine can be added if you know the dataset.  You simply need to know the image name and the image parameters you would like for example:
                        <ol style="list-style-type: lower-roman">
                            <li>
                                Offline Carbon Monoxide - COPERNICUS/S5P/OFFL/L3_CO {"bands":"CO_column_number_density,H2O_column_number_density,cloud_height","min":"0","max":"0.5"} 2018-01-01 to 2018-12-31
                            </li>
                            <li>
                                Notice the double quotes in the image parameters for both the property name and the value.  Also, notice there are no spaces.  The vision parameters are similar but slightly different than you would add directly in the Google Earth Engine code editor. For example, the bands parameter in the editor is an array of comma-separated strings, and here it is a single comma separated string
                            </li>
                        </ol>
                    </li>
                </ol>
            </li>
            <li>
                Select date range for data 2
            </li>
            <li>
                Click Create
            </li>
            <li>Reposition and resize to your liking</li>
        </ol>
        <br style="clear:both;" />

        <h2>To add a Image Asset Widget:</h2>

        <img src="${root}/img/image_asset_widget.gif" class="previewImg" onclick="toggleHelpImage(this);"/>
        <br class="previewbreak" />
        <ol>
            <li>
                Click Add Widget
            </li>
            <li>
                Select Image Asset in the type drop down
            </li>
            <li>
                Choose Basemap source from dropdown
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
            <li>
                Click Create
            </li>
            <li>Reposition and resize to your liking</li>
        </ol>
        <br style="clear:both;" />

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
        <#include "logo-banner.ftl">
    </div>
</section>
<#include "end-content.ftl">
<#include "footer.ftl">
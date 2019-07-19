<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->


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

        .Collapsible__trigger {
            display: block;
            font-weight: 400;
            text-decoration: none;
            color: #333333;
            position: relative;
            border: 1px solid white;
            padding: 10px;
            background: #00ac9d;
            color: white;
            cursor:pointer;
        }
        .Collapsible__trigger:after {
            font-family: 'FontAwesome';
            content: '\f107';
            position: absolute;
            right: 10px;
            top: 10px;
            display: block;
            transition: transform 300ms; }
        .Collapsible__trigger.is-open:after {
            transform: rotateZ(180deg); }
        .Collapsible__trigger.is-disabled {
            opacity: 0.5;
            background-color: grey; }

        .CustomTriggerCSS {
            background-color: lightcoral;
            transition: background-color 200ms ease; }

        .CustomTriggerCSS--open {
            background-color: darkslateblue; }

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

        <script type="text/javascript">
            window.onload = function () {
                geo_dash_help.renderGeodashHelpPage({
                    documentRoot:                "${root}",
                    browserLanguage:             "${browserLanguage}"
                });
            };
        </script>

        <br style="clear:both">
        <div class="container-fluid">
            <div id="dashHolder"></div>
        </div>


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
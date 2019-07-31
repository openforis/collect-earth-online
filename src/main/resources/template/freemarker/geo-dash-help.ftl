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
        <script type="text/javascript">
            window.onload = function () {
                geo_dash_help.renderGeodashHelpPage({
                    documentRoot:                "${root}",
                    browserLanguage:             "${browserLanguage}"
                });
            };
        </script>
        <div id="dashHolder"></div>
        <#include "logo-banner.ftl">
    </div>
</section>
<#include "end-content.ftl">
<#include "footer.ftl">
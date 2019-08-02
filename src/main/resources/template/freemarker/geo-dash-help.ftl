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
            margin-bottom:1rem;
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
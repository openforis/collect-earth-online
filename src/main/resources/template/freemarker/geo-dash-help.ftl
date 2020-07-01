<#include "header.ftl">
<#include "start-content.ftl">

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<section id="geo-dash-help" class="container">
    <div id="dashHolder"></div>
    <script type="text/javascript">
        window.onload = function () {
            geo_dash_help.renderGeodashHelpPage({
                userName:           "${username}",
                userId:             "${userid}",
                browserLanguage:    "${browserLanguage}"
            });
        };
    </script>
</section>
<#include "logo-banner.ftl">
<#include "end-content.ftl">
<#include "footer.ftl">
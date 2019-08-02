<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<section id="about" class="container">
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
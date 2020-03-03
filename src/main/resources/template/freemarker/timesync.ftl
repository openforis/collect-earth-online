<#include "header.ftl">
<#--<#include "timesync-navbar.ftl">-->
<#include "start-content.ftl">
<div id="timesync"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    //set value for ts_scripts.js
    window.userID = ${userid};
    window.tsDashMessage = new URLSearchParams(window.location.search).keys().next().value;
    console.log(new URLSearchParams(window.location.search).keys().next().value);

    window.onload = function () {
        timesync.renderTimeSyncPage({
            documentRoot: "${root}",
            userId:       "${userid}"
        });
    };
</script>

<#include "timesync-script.ftl">
<#include "end-content.ftl">
<#include "footer.ftl">

<#--<#include "ts_main.ftl">-->

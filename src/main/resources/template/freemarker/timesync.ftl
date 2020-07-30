<#include "header.ftl">
<#include "start-content.ftl">
<div id="timesync"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        timesync.renderTimeSyncPage({
            userId:       "${userid}"
        });
    };
</script>

<#include "end-content.ftl">
<#include "footer.ftl">

<#include "header.ftl">
<#include "start-content.ftl">
<div id="timesync"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
    window.onload = function () {
        timesync.renderTimeSyncPage({
            documentRoot: "${root}",
            userId:       "${userid}"
        });
    };
</script>

<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.6/d3.min.js" charset="utf-8"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.imagesloaded/3.2.0/imagesloaded.pkgd.min.js"></script>
<script type="text/javascript" src="${root}/js/jquery.mousewheel.min.js"></script>
<script type="text/javascript" src="${root}/js/ts_specIndexStretch.js"></script>
<script type="text/javascript" src="${root}/js/lodash.min.js"></script>
<script type="text/javascript" src="${root}/js/ts_tooltips.js"></script>
<#include "end-content.ftl">
<#include "footer.ftl">

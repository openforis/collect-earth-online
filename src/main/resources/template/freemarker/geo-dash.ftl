<#include "header.ftl">
<#include "geodash-navbar.ftl">
<#include "start-content.ftl">
<script>
    let theURL="${root}" + "/geo-dash";
    var pid = this.getParameterByName("pid");
    function getParameterByName (name, url) {
        "use strict";
        if (!url) {
            url = window.location.href;
        }
        url = decodeURIComponent(url);
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        var results = regex.exec(url);
        if (!results) {
            return null;
        }
        if (!results[2]) {
            return "";
        }
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
</script>
<script type="text/babel" src="${root}/js/geodashreact.js"></script>
<br style="clear:both;">
    <div class="container-fluid">
        <div id="dashHolder"></div>
    </div>

<#include "end-content.ftl">
<#include "footer.ftl">

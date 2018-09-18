<#include "header.ftl">
<#include "geodash-navbar.ftl">
<#include "start-content.ftl">
<link rel="stylesheet" type="text/css" href="https://rawgit.com/STRML/react-grid-layout/master/css/styles.css"/>
<link rel="stylesheet" type="text/css" href="https://rawgit.com/STRML/react-grid-layout/master/examples/example-styles.css"/>
<link rel="stylesheet" type="text/css" href="https://rawgit.com/STRML/react-resizable/master/css/styles.css"/>
<script type="text/javascript" src="https://cdn.jsdelivr.net/lodash/4.5.1/lodash.min.js"></script>
<script src="${root}/js/react-addons-pure-render-mixin.min.js"></script>
<script type="text/javascript" src="https://rawgit.com/STRML/react-grid-layout/master/dist/react-grid-layout.min.js"></script>
<script type="text/babel" src="${root}/js/geo-dash-widget-editor.js"></script>


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
<br style="clear:both;">
 <h3>React-Widget-Layout-Editor </h3>
  <div id="democontent"></div>


<#include "end-content.ftl">
<#include "footer.ftl">
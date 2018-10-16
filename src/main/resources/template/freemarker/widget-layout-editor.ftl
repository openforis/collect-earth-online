<#include "header.ftl">
<#include "geodash-navbar.ftl">
<#include "start-content.ftl">
<!-- FIXME: <link> tags belong in the <head> section - these should probably be bundled with webpack -->
<link rel="stylesheet" type="text/css" href="https://rawgit.com/STRML/react-grid-layout/master/css/styles.css"/>
<link rel="stylesheet" type="text/css" href="https://rawgit.com/STRML/react-grid-layout/master/examples/example-styles.css"/>
<link rel="stylesheet" type="text/css" href="https://rawgit.com/STRML/react-resizable/master/css/styles.css"/>
<br style="clear:both">
<h3>React-Widget-Layout-Editor</h3>
<div id="content"></div>
<script type="text/javascript">
 let theRoot="${root}";
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
 var institutionID = this.getParameterByName("institutionID") != null? this.getParameterByName("institutionID"): '16';
</script>
<script type="text/javascript" src="${root}/js/vendors~account~collection~geodashreact~home~institution~project~timesync~widgetlayouteditor.bundle.js"></script>
<script type="text/javascript" src="${root}/js/vendors~widgetlayouteditor.bundle.js"></script>
<script type="text/javascript" src="${root}/js/widgetlayouteditor.bundle.js"></script>
<script type="text/javascript">
 window.onload = function () {
     widgetlayouteditor.renderWidgetEditorPage();
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">

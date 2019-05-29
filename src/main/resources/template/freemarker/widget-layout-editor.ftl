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
<script type="text/javascript" src="${root}/js/vendors~widget_layout_editor.bundle.js"></script>
<script type="text/javascript" src="${root}/js/widget_layout_editor.bundle.js"></script>
<script type="text/javascript" src="${root}/js/jquery-ui.min.js"></script>
<script type="text/javascript">
 window.onload = function () {
     widget_layout_editor.renderWidgetEditorPage("${root}");
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">

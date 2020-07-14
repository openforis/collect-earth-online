<#include "header.ftl">
<#include "start-content.ftl">
<!-- FIXME: <link> tags belong in the <head> section - these should probably be bundled with webpack -->
<link rel="stylesheet" type="text/css" href="https://rawgit.com/STRML/react-grid-layout/master/css/styles.css"/>
<link rel="stylesheet" type="text/css" href="https://rawgit.com/STRML/react-grid-layout/master/examples/example-styles.css"/>
<link rel="stylesheet" type="text/css" href="https://rawgit.com/STRML/react-resizable/master/css/styles.css"/>
<br style="clear:both">
<div id="widget-layour-editor"></div>

<!-- Auto Inserted Bundles -->

<!-- End Auto Inserted Bundles -->

<script type="text/javascript">
 window.onload = function () {
     widget_layout_editor.renderWidgetEditorPage({userName: "${username}"});
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">

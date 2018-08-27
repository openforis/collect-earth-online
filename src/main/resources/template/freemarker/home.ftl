<#include "header.ftl">
<#include "navbar.ftl">
<#include "announcements.ftl">
<#include "start-content.ftl">
<div id="home"></div>
<script type="text/babel" src="${root}/js/Main.js"></script>
<script type="text/javascript">
 renderHome("${root}", "${userid}");
</script>
<#include "end-content.ftl">
<#include "footer.ftl">

<#include "header.ftl">
<#include "branding-banner.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#include "flash-messages.ftl">

<div id="institution">
    <div id="institution-details">
        <h1>${institution_name!"No institution selected"}</h1>
        <img src=${institution_logo!""}>
        <p>${institution_description!""}</p>
    </div>
    <#include "project-list.ftl">
    <#include "user-list.ftl">
</div>

<#include "end-content.ftl">
<#include "footer.ftl">

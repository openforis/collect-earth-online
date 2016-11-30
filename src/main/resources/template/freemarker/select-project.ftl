<#include "header.ftl">
<div id="select-project-form">
    <h1>Select a Project</h1>
    <#list projects>
        <ul>
            <#items as project>
            <li><a href="/dashboard?project=${project.id}">${project.name}</a></li>
            </#items>
        </ul>
    </#list>
</div>
<#include "footer.ftl">

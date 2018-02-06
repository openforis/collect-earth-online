<#if content_size == "small">
    <section id="content" class="container-fluid">
<#elseif content_size == "large">
    <section id="content" class="container-fluid">
<#else>
    <section id="content" class="container-fluid">
</#if>
<#list flash_messages>
    <div class="alert">
        <#items as flash_message>
            <p>${flash_message}</p>
        </#items>
    </div>
</#list>

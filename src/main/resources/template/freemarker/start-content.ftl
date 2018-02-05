<#if content_size == "small">
    <section id="content">
<#elseif content_size == "large">
    <section id="content" >
<#else>
    <section id="content">
</#if>
<#list flash_messages>
    <div class="alert">
        <#items as flash_message>
            <p>${flash_message}</p>
        </#items>
    </div>
</#list>

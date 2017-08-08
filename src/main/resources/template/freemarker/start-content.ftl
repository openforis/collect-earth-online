<#if content_size == "small">
    <section id="content" style="background-image:${background_image};height:calc(100vh - 2.5rem - 55px - 2px)">
<#elseif content_size == "large">
    <section id="content" style="background-image:${background_image};height:calc(100vh - 2.5rem - 2px)">
<#else>
    <section id="content" style="background-image:${background_image};height:calc(100vh - 2px)">
</#if>
<#list flash_messages>
    <div class="alert">
        <#items as flash_message>
            <p>${flash_message}</p>
        </#items>
    </div>
</#list>

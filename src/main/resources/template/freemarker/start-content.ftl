<#if content_size == "small">
    <section id="content" style="background-image:${background_image};height:calc(100vh - 2.5rem - 80px - 55px - 2px)">
<#elseif content_size == "large">
    <section id="content" style="background-image:${background_image};height:calc(100vh - 2.5rem - 80px - 2px)">
<#else>
    <section id="content" style="background-image:${background_image};height:calc(100vh - 2px)">
</#if>

<section id="content" class="container-fluid">
<#list flash_messages>
    <div class="alert">
        <#items as flash_message>
            <p>${flash_message}</p>
        </#items>
    </div>
</#list>

<section id="content">
    <#list flash_messages>
        <div class="alert">
            <#items as flash_message>
                <p>${flash_message}</p>
            </#items>
        </div>
    </#list>

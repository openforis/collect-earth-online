<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
        <script type="text/javascript">
            window.onload =function(){
                renderPage("account", {
                        documentRoot: '${root}',
                        userId: '${userid}',
                        accountId: '${account_id}',
                        username: '${username}'
                    });
            }
        </script>
    <div class="row justify-content-center">
        <style>
         section#content {
             overflow-y: auto;
             overflow-x: hidden;
         }
        </style>
		<div id="account" class="col-xl-6 col-lg-8 border bg-lightgray mb-5">
        </div>	        
        
    </div>
<#include "end-content.ftl">
<#include "footer.ftl">

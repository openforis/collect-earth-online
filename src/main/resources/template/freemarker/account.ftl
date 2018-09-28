<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
  <script type="text/javascript" src="${root}/js/account.js"></script>
        <script type="text/javascript">
            $(function() {initialize();});
            function initialize() {
                if (typeof(renderAccount) == "undefined")
                    setTimeout(initialize, 250);
                else
                    renderAccount('${root}', '${userid}', '${account_id}', '${username}');
            }
        </script>
    <div class="row justify-content-center">
        <style>
         section#content {
             overflow-y: auto;
             overflow-x: hidden;
         }
        </style>
		<div id="account-page" class="col-xl-6 col-lg-8 border bg-lightgray mb-5">
        </div>	        
        
    </div>
<#include "end-content.ftl">
<#include "footer.ftl">

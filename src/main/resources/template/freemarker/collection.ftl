<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<script type="text/babel" src="${root}/js/Main1.js"></script>
<#if username == "">
    <#assign username = "guest">
</#if>
<script type="text/javascript">
    $(function() {initialize();});
    function initialize() {
        if(typeof(renderCollection)=="undefined")
            setTimeout(initialize,250);
        else
            renderCollection("${root}", "${username}","${project_id}");
    }
</script>
<div id="collection"></div>
<div class="modal fade" id="confirmation-quit" tabindex="-1" role="dialog"
     aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Confirmation</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                Are you sure you want to stop collecting data?
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Close</button>
                <button type="button" class="btn bg-lightgreen btn-sm" id="quit-button"
                        onclick="window.location='${root}/home'">OK</button>
            </div>
        </div>
    </div>
</div>
<!-- End Quit Confirmation Popup -->
<#include "end-content.ftl">
<#include "footer.ftl">

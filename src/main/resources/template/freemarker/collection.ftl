<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#if username == "">
    <#assign username = "guest">
</#if>
<div id="collection" class="row"></div>
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
<script type="text/javascript" src="${root}/js/vendors~account~collection~geodashreact~home~institution~project~widgetlayouteditor.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection~geodashreact~home~project.bundle.js"></script>
<script type="text/javascript" src="${root}/js/collection.bundle.js"></script>
<script type="text/javascript">
 window.onload = function () {
     collection.renderCollectionPage({
         documentRoot: "${root}",
         userName:     "${username}",
         projectId:    "${project_id}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">

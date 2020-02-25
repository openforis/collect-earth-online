<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div class="container absolute-center">
    <section class="row justify-content-center">
        <div class="col-lg-4 col-md-6 col-sm-10 pb-3" id="mailing-list-form">
            <p class="header">Mailing List</p>
            <form action="${root}/mailing-list" method="post">
                <input class="form-control mb-1" autocomplete="off" id="subject" name="subjecy"
                       placeholder="Subject" value="" type="text">
                <input class="form-control mb-1" autocomplete="off" id="body" name="body"
                       placeholder="Body" value="" type="text">
                <input class="btn btn-sm btn-block btn-outline-lightgreen" class="button" value="Submit" type="submit">
            </form>
        </div>
    </section>
</div>

<script type="text/javascript">
alert(999);
</script>
<#include "end-content.ftl">
<#include "footer.ftl">

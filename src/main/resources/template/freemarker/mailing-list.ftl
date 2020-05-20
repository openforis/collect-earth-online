<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<section id="content" class="container-fluid">
    <div class="row justify-content-center">
        <div class="col-xl-6 col-lg-8 border bg-lightgray mb-5">
            <div class="bg-darkgreen mb-3 no-container-margin">
                <h1>Mailing List!</h1>
            </div>
            <div class="row mb-3">
                <div class="col">
                    <form action="${root}/mailing-list" method="post">
                        <div class="form-group">
                            <label for="subject">Subject</label>
                            <input autocomplete="off" id="subject" name="subject" placeholder="Subject" type="text" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="body">Body</label>
                            <textarea name="body" id="editor"></textarea>
                        </div>
                        <input class="btn btn-outline-lightgreen btn-block" type="submit" value="Send to All CEO Users" id="submit-mailing-list">
                    </form>
                </div>
            </div>
        </div>
    </div>
</section>

<script type="text/javascript">

    ClassicEditor.create(document.querySelector("#editor")).catch(error => {
        console.error(error);
    });

    $(function() {
       $("#submit-mailing-list").click(function(event){
          if (!confirm("Are you sure you want to send to this mailing list?")) {
             event.preventDefault();
          }
       });
    });

</script>

<#include "end-content.ftl">
<#include "footer.ftl">

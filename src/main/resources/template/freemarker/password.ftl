<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<div class=" container absolute-center">
	<section class="row justify-content-center">
		<div class="col-lg-4 col-md-6 col-sm-10 pb-3" id="password-form">
		    <p class="header">Enter your login email</p>
		    <form action="${root}/password" method="post">
		        <fieldset class="form-group">
		            <input class="form-control" autocomplete="off" id="email" name="email" placeholder="Email" value="" type="email">
		        </fieldset>
		        <input class="btn btn-sm btn-block btn-outline-lightgreen" value="Request Password Reset Key" type="submit">
		    </form>
	</section>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">

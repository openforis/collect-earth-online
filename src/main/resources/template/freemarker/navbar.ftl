<style>

.topnav {
  overflow: hidden;
  padding:0px;
  line-height: 14px;
}
.mobileLogin{
  display:none!important;
  }
.topnav li {
  float: left;
  display: block;
  color: #f2f2f2;
  text-align: center;
  padding: 14px 16px;
  text-decoration: none;
  font-size: 17px;
}

.topnav a:hover {

  color: black;
}

.topnav .icon {
  display: none;
}

@media screen and (max-width: 600px) {
  .topnav li:not(:first-child) {display: none;}
  .topnav .icon {
    float: right;
    display: block!important;
  }
}

@media screen and (max-width: 600px) {
  .topnav.responsive {
  position: relative;
      z-index: 200;
      background-color: #3a3a3a;
          left: 0px;

  }
  .topnav.responsive .icon {
    position: absolute;
    right: 0;
    top: 0;
  }
  .topnav.responsive li {
    float: none;
    display: block;
    text-align: left;
  }
  .mobileLogin{
  display:block;
  }
  .mobileLogin.responsive{
    display:block!important;
    }
  #login-info{
  display:none;
  }

}
</style>
<nav>

    <ul class="topnav" id="myTopnav">
        <#list ["Home", "About", "Support"] as url>
            <#if navlink == url>
                <li><a class="active-link" href="${root}/${url?lower_case}">${url}</a></li>
            <#else>
                <li><a href="${root}/${url?lower_case}">${url}</a></li>
            </#if>
        </#list>
        <#if username??>
            <#if navlink == "Account">
                <li><a class="active-link" href="${root}/account/${userid}">Account</a></li>
            <#else>
                <li><a href="${root}/account/${userid}">Account</a></li>
            </#if>
        </#if>
        <li class="mobileLogin" id="mobileLogin">

                <#if username??>
                    <#if navlink == "Logout">
                       <p> ${username} </p></br><a class="active-link" href="${root}/logout">Logout</a>
                    <#else>
                      <p>  ${username} </p></br><a href="${root}/logout">Logout</a>
                    </#if>
                <#else>
                    <#if navlink == "Login" || navlink == "Register">
                        <a class="active-link" href="${root}/login">Login/Register</a>
                    <#else>
                        <a href="${root}/login">Login/Register</a>
                    </#if>
                </#if>

        </li>
        <li class="icon"> <a href="javascript:void(0);" style="font-size:15px;" class="icon" onclick="menuControls()">&#9776;</a></li>
    </ul>
    <div id="login-info">
        <#if username??>
            <#if navlink == "Logout">
                 ${username} <a class="active-link" href="${root}/logout">Logout</a>
            <#else>
                 ${username} <a href="${root}/logout">Logout</a>
            </#if>
        <#else>
            <#if navlink == "Login" || navlink == "Register">
                <a class="active-link" href="${root}/login">Login/Register</a>
            <#else>
                <a href="${root}/login">Login/Register</a>
            </#if>
        </#if>
    </div>
</nav>
<script>
function menuControls() {
    var x = document.getElementById("myTopnav");
    if (x.className === "topnav") {
        x.className += " responsive";
    } else {
        x.className = "topnav";
    }
    var ml = document.getElementById("mobileLogin");
    if (ml.className === "mobileLogin") {
            ml.className += " responsive";
        } else {
            ml.className = "mobileLogin";
        }
}
</script>
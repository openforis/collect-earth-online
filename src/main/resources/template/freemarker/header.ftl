<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="Collect Earth Online is an Image Analysis Crowdsourcing Platform by Spatial Informatics Group">
        <meta name="keywords" content="collect earth online image analysis crowdsourcing platform SIG spatial informatics group">
        <title>Collect Earth Online</title>
        <link href="favicon.ico" rel="shortcut icon">
        <link href="css/cssreset-min.css" rel="stylesheet" type="text/css">
        <link href="https://fonts.googleapis.com/css?family=Open+Sans:100,400,700" rel="stylesheet" type="text/css">
        <link href="https://fonts.googleapis.com/css?family=Oswald:normal" rel="stylesheet" type="text/css">
        <link href="css/openlayers_3.13.0.css" rel="stylesheet" type="text/css">
        <link href="css/stylesheet.css" rel="stylesheet" type="text/css">
        <!--[if lt IE 9]>
          <script type="text/javascript" src="js/html5shiv.js"></script>
        <![endif]-->
        <script type="text/javascript" src="js/angular.min.js"></script>
        <script type="text/javascript" src="js/openlayers_3.13.0.js"></script>
        <script type="text/javascript" src="js/map_utils.js"></script>
        <script type="text/javascript" src="js/utils.js"></script>
        <script type="text/javascript" src="js/ceo_sample_data.js"></script>
        <#if navlink == "Geo-Dash">
        <!----------------------------------------------------------------->
        <!-- BEGIN: Billy's GEODASH libraries -->
        <!----------------------------------------------------------------->
        <link href="css/bootstrap.min.css" rel="stylesheet">
        <link href="css/ie10-viewport-bug-workaround.css" rel="stylesheet">
        <link href="css/geo-dash.css" rel="stylesheet">
        <link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
        <script src="js/ie-emulation-modes-warning.js"></script>
        <!-- Respond.js for IE8 support of HTML5 elements and media queries -->
        <!--[if lt IE 9]>
          <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
        <![endif]-->
        <script src="js/jquery-3.1.1.min.js"></script>
        <!-- Include all compiled plugins (below), or include individual files as needed -->
        <script src="js/bootstrap.min.js"></script>

        <script src="https://code.highcharts.com/highcharts.js"></script>
        <script src="https://cdn.rawgit.com/nnattawat/flip/master/dist/jquery.flip.min.js"></script>
        <!--------------------------------------------------------------->
        <!-- END: Billy's GEODASH libraries, FIXME: Simplify this list -->
        <!--------------------------------------------------------------->
        </#if>
    </head>
    <body>
        <#if nav_visibility == "visible">
        <header>
        <#else>
        <header style="height:55px">
        </#if>
            <div id="logos">
                <img id="usaid" src="img/usaid.png">
                <img id="nasa" src="img/nasa.png">
                <img id="adpc" src="img/ADPC.jpg">
                <img id="servir" src="img/servir.png">
            </div>
            <#if nav_visibility == "visible">
            <nav>
                <ul>
                    <#if role == "admin">
                        <#list ["Home", "About", "Account", "Dashboard", "Admin"] as url>
                            <#if navlink == url>
                                <li><a class="active-link" href="${url?lower_case}">${url}</a></li>
                            <#else>
                                <li><a href="${url?lower_case}">${url}</a></li>
                            </#if>
                        </#list>
                    <#elseif role == "user">
                        <#list ["Home", "About", "Account", "Dashboard"] as url>
                            <#if navlink == url>
                                <li><a class="active-link" href="${url?lower_case}">${url}</a></li>
                            <#else>
                                <li><a href="${url?lower_case}">${url}</a></li>
                            </#if>
                        </#list>
                    <#else>
                        <#list ["Home", "About"] as url>
                            <#if navlink == url>
                                <li><a class="active-link" href="${url?lower_case}">${url}</a></li>
                            <#else>
                                <li><a href="${url?lower_case}">${url}</a></li>
                            </#if>
                        </#list>
                    </#if>
                </ul>
            </nav>
            <div id="login-info">
                <p>
                    <#if username??>
                        <#if navlink == "Logout">
                            Logged in as ${username} <a class="active-link" href="logout">Logout</a>
                        <#else>
                            Logged in as ${username} <a href="logout">Logout</a>
                        </#if>
                    <#else>
                        <#if navlink == "Login">
                            <a class="active-link" href="login">Login</a>
                        <#else>
                            <a href="login">Login</a>
                        </#if>
                    </#if>
                </p>
            </div>
            </#if>
        </header>
        <#if nav_visibility == "visible">
        <section id="content">
        <#else>
        <section id="content" style="top:55px;height:calc(100vh - 55px)">
        </#if>
            <#list flash_messages>
                <div class="alert">
                    <#items as flash_message>
                        <p>${flash_message}</p>
                    </#items>
                </div>
            </#list>
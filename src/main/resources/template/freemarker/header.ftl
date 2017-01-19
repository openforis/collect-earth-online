<!DOCTYPE html>
<html lang="en" ng-app="collectEarth">
    <head>
        <title>Mapcha</title>
        <meta charset="utf-8">
        <meta content="Mapcha is an Image Analysis Crowdsourcing Platform by Spatial Informatics Group" name="description">
        <meta content="mapcha image analysis crowdsourcing platform asia mekong cambodia thailand laos vietnam myanmar SIG spatial informatics group" name="keywords">
        <meta content="width=device-width, initial-scale=1.0" name="viewport">
        <link href="favicon.ico" rel="shortcut icon">
        <link href="css/cssreset-min.css" rel="stylesheet" type="text/css">
        <link href="https://fonts.googleapis.com/css?family=Open+Sans:100,400,700" rel="stylesheet" type="text/css">
        <link href="https://fonts.googleapis.com/css?family=Oswald:normal" rel="stylesheet" type="text/css">
        <link href="css/openlayers_3.13.0.css" rel="stylesheet" type="text/css">
        <link href="css/stylesheet.css" rel="stylesheet" type="text/css">
        <!--[if lt IE 9]>
          <script type="text/javascript" src="/js/html5shiv.js"></script>
        <![endif]-->
        <script type="text/javascript" src="/js/angular.min.js"></script>
<!--	<script src="https://openlayers.org/en/v3.13.0/build/ol.js"></script> -->
	<script type="text/javascript" src="/js/open-layers.js"></script>
	<script type="text/javascript" src="/js/map_utils.js"></script>
	<script type="text/javascript" src="/js/ceo_sample_data.js"></script>
       <!-- <script type="text/javascript" src="/js/angular-route.min.js"></script> -->
	<script type="text/javascript" src="/js/collect-earth.js"></script>
    </head>
    <body ng-controller="ctlBody">
        <header>
            <div id="logos">
                <img id="usaid" src="img/usaid.png">
                <img id="nasa" src="img/nasa.png">
                <img id="adpc" src="img/ADPC.jpg">
                <img id="servir" src="img/servir.png">
            </div>
            <nav>
                <ul>
                    <#if role == "admin">
                        <li><a class="active-link" href="">Home</a></li>
                        <li><a href="about">About</a></li>
                        <li><a href="account">Account</a></li>
                        <li><a href="dashboard">Dashboard</a></li>
                        <li><a href="admin">Admin</a></li>
                    <#elseif role == "user">
                        <li><a class="active-link" href="/">Home</a></li>
                        <li><a href="about">About</a></li>
                        <li><a href="account">Account</a></li>
                        <li><a href="dashboard">Dashboard</a></li>
                    <#else>
                        <li><a class="active-link" href="/">Home</a></li>
                        <li><a href="about">About</a></li>
                    </#if>
                </ul>
            </nav>
            <div id="login-info">
                <p>
                    <#if username??>
                        Logged in as ${username} <a href="/logout">Logout</a>
                    <#else>
                        <a href="login">Login</a>
                    </#if>
                </p>
            </div>
        </header>
        <section id="content">
            <#list flash_messages>
                <div class="alert">
                    <#items as flash_message>
                        <p>${flash_message}</p>
                    </#items>
                </div>
            </#list>

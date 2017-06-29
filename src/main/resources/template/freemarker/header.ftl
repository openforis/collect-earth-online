<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="Collect Earth Online is an Image Analysis Crowdsourcing Platform by Spatial Informatics Group">
        <meta name="keywords" content="collect earth online image analysis crowdsourcing platform SIG spatial informatics group">
        <title>Collect Earth Online</title>
        <link rel="shortcut icon" href="${root}/favicon.ico">
        <link rel="stylesheet" type="text/css" href="${root}/css/cssreset-min.css">
        <link rel="stylesheet" type="text/css" href="${root}/css/google-fonts-open-sans.css">
        <link rel="stylesheet" type="text/css" href="${root}/css/google-fonts-oswald.css">
        <link rel="stylesheet" type="text/css" href="${root}/css/openlayers-3.13.0.css">
        <link rel="stylesheet" type="text/css" href="${root}/css/stylesheet.css">
        <!--[if lt IE 9]>
          <script type="text/javascript" src="${root}/js/html5shiv.js"></script>
        <![endif]-->
        <script type="text/javascript" src="${root}/js/angular.min.js"></script>
        <script type="text/javascript" src="${root}/js/openlayers-3.13.0.js"></script>
        <script type="text/javascript" src="${root}/js/map-utils.js"></script>
        <script type="text/javascript" src="${root}/js/utils.js"></script>
        <script type="text/javascript" src="${root}/js/institution-list.js"></script>
        <script type="text/javascript" src="${root}/js/project-list.js"></script>
        <script type="text/javascript" src="${root}/js/user-list.js"></script>
        <script type="text/javascript" src="${root}/js/institution.js"></script>
        <script type="text/javascript" src="${root}/js/project.js"></script>
        <script type="text/javascript" src="${root}/js/dashboard.js"></script>
        <script type="text/javascript" src="${root}/js/geo-dash.js"></script>
        <script type="text/javascript" src="${root}/js/geo-dash-admin.js"></script>
        <script type="text/javascript" src="${root}/js/ceo.js"></script>
        <#if navlink == "Geo-Dash">
        <!----------------------------------------------------------------->
        <!-- BEGIN: Billy's GEODASH libraries -->
        <!----------------------------------------------------------------->
        <link rel="stylesheet" type="text/css" href="${root}/css/bootstrap.min.css">
        <link rel="stylesheet" type="text/css" href="${root}/css/ie10-viewport-bug-workaround.css">
        <link rel="stylesheet" type="text/css" href="${root}/css/jquery-ui.css">
        <link rel="stylesheet" type="text/css" href="${root}/css/datepicker.css">
        <link rel="stylesheet" type="text/css" href="${root}/css/geo-dash.css">
        <link rel="stylesheet" type="text/css" href="${root}/css/geo-dash.css">
        <script type="text/javascript" src="${root}/js/ie-emulation-modes-warning.js"></script>
        <!-- Respond.js for IE8 support of HTML5 elements and media queries -->
        <!--[if lt IE 9]>
          <script type="text/javascript" src="${root}/js/respond.min.js"></script>
        <![endif]-->
        <script type="text/javascript" src="${root}/js/jquery-3.1.1.min.js"></script>
        <!-- Include all compiled plugins (below), or include individual files as needed -->
        <script type="text/javascript" src="${root}/js/bootstrap.min.js"></script>
        <script type="text/javascript" src="${root}/js/jquery-ui.min.js"></script>
        <script type="text/javascript" src="${root}/js/highcharts.js"></script>
        <script type="text/javascript" src="${root}/js/jquery.flip.min.js"></script>
        <!--------------------------------------------------------------->
        <!-- END: Billy's GEODASH libraries, FIXME: Simplify this list -->
        <!--------------------------------------------------------------->
        </#if>
    </head>
    <body ng-app="ceo">

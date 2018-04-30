angular.module("cardTest", []).controller("CardTestController", ["$http", "$sce", function CardTestController($http, $sce) {
    this.root = "";
    this.projectId = "";
    this.plotType = "";
    this.recordId = "";
    this.sampleIds = null;
    this.surveyForm = "";
    this.collectForm = null;

    this.initialize = function (documentRoot) {
        this.root = documentRoot;
    };

    this.callRemote = function (url, errorMessage, successCallback) {
        $http.get(url).then(angular.bind(this, successCallback),
                            function errorCallback (response) {
                                console.log(response);
                                alert(errorMessage);
                            });
    };

    this.loadPlotSurvey = function () {
        if (this.projectId == "") {
            alert("You must first enter a Project ID!");
        } else {
            this.callRemote("/collect/survey/" + this.projectId + "/ceoballooncontent.html?rootentitypath=/plot",
                            "Error loading the plot survey from Collect. See console for details.",
                            function successCallback (response) {
                                this.surveyForm = $sce.trustAsHtml(response.data);
                                this.plotType = "/plot";
                                this.recordId = 5;   // FIXME: set this from this.currentPlot.collectRecordId after running loadRandomPlot() or loadPlotById()
                                this.sampleIds = null;
                            });
        }
    };

    this.loadSubplotSurvey = function () {
        if (this.projectId == "") {
            alert("You must first enter a Project ID!");
        } else {
            this.callRemote("/collect/survey/" + this.projectId + "/ceoballooncontent.html?rootentitypath=/plot/subplot",
                            "Error loading the subplot survey from Collect. See console for details.",
                            function successCallback (response) {
                                this.surveyForm = $sce.trustAsHtml(response.data);
                                this.plotType = "/plot/subplot";
                                this.recordId = 5;         // FIXME: set this from this.currentPlot.collectRecordId after running loadRandomPlot() or loadPlotById()
                                this.sampleIds = ["1"]; // FIXME: set this from the currently selected samples
                            });
        }
    };

    this.callCollectForms = function () {
        if (this.projectId == "") {
            alert("You must first enter a Project ID!");
        } else {
            this.collectForm = new CollectForms(angular.element("#collect-survey"),
                                                this.projectId,
                                                this.recordId,
                                                this.plotType,
                                                this.sampleIds);
        }
    };

}]);

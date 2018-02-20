angular.module("cardTest", []).controller("CardTestController", ["$http", function CardTestController($http) {
    this.root = "";
    this.surveyForm = "";
    this.projectId = "";
    this.recordId = 554;
    this.sampleIds = ["1", "2"];

    this.initialize = function (documentRoot) {
        this.root = documentRoot;
    };

    // Or add ?rootentitypath=/plot/subplot to the URL to request subplot info
    this.loadCollectCardsByProjectId = function () {
        if (this.projectId == "") {
            alert("You must first enter a Project ID!");
        } else {
            $http.get("/collect/survey/" + this.projectId + "/ceoballooncontent.html?rootentitypath=/plot/subplot")
                .then(angular.bind(this, function successCallback(response) {
                    this.showSurvey(response.data);
                    console.log(response.data);
                    alert("Project cards loaded from Collect. See console output.");
                }), function errorCallback(response) {
                    console.log(response);
                    alert("Error loading the project cards from Collect. See console for details.");
                });
        }
    };

    this.showSurvey = function (surveyHtml) {
        angular.element(document.getElementById("collect-survey")).append(surveyHtml);
        this.surveyForm = new CollectForms(document.getElementById("collect-survey"),
                                           this.projectId,
                                           this.recordId,
                                           "plot/subplot",
                                           this.sampleIds);
    };

}]);

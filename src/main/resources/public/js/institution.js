angular.module("institution", []).controller("InstitutionController", ["$http", function InstitutionController($http) {
    this.root = "";
    this.userId = "";
    this.pageMode = "view";
    this.details = {
        id: "-1",
        name: "",
        logo: "",
        url: "",
        description: "",
        admins: []
    };
    this.isAdmin = false;
    this.projectList = [];
    this.userList = [];
    this.userListComplete = [];
    this.newUserEmail = "";

    this.getInstitutionDetails = function (institutionId) {
        $http.get(this.root + "/get-institution-details/" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.details = response.data;
                if (this.userId != "") {
                    this.isAdmin = this.details.admins.includes(parseInt(this.userId));
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the institution details. See console for details.");
            });
    };

    this.getProjectList = function (userId, institutionId) {
        $http.get(this.root + "/get-all-projects?userId=" + userId + "&institutionId=" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.projectList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    this.getUserList = function (institutionId) {
        $http.get(this.root + "/get-all-users?institutionId=" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.userList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the user list. See console for details.");
            });
    };

    this.getUserListComplete = function () {
        $http.get(this.root + "/get-all-users")
            .then(angular.bind(this, function successCallback(response) {
                this.userListComplete = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the complete user list. See console for details.");
            });
    };

    this.initialize = function (documentRoot, userId, institutionId) {
        // Make the current documentRoot, userId, and institution id globally available
        this.root = documentRoot;
        this.userId = userId;
        this.details.id = institutionId;

        // If in Create Institution mode, show the institution editing view. Otherwise, load and show the institution details
        if (this.details.id == "0") {
            this.pageMode = "edit";
        } else {
            this.getInstitutionDetails(this.details.id);

            // Load the projectList
            this.getProjectList(this.userId, this.details.id);

            // Load the userList
            this.getUserList(this.details.id);

            // Load the complete userList
            this.getUserListComplete();
        }
    };

    this.updateInstitution = function () {
        var formData = new FormData();
        formData.append("userid", this.userId);
        formData.append("institution-name", this.details.name);
        formData.append("institution-logo", document.getElementById("institution-logo").files[0]);
        formData.append("institution-url", this.details.url);
        formData.append("institution-description", this.details.description);
        $http.post(this.root + "/update-institution/" + this.details.id,
                   formData,
                   {transformRequest: angular.identity,
                    headers: {"Content-Type": undefined}})
            .then(angular.bind(this, function successCallback(response) {
                this.details.id = response.data.id;
                this.isAdmin = true;
                if (response.data.logo != "") {
                    this.details.logo = response.data.logo;
                }
                this.getUserList(this.details.id);
                this.getUserListComplete();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error updating institution details. See console for details.");
            });
    };

    this.togglePageMode = function () {
        if (this.pageMode == "view") {
            this.pageMode = "edit";
        } else {
            this.updateInstitution();
            this.pageMode = "view";
        }
    };

    this.deleteInstitution = function () {
        if (confirm("Do you REALLY want to delete this institution?!")) {
            $http.post(this.root + "/archive-institution/" + this.details.id)
                .then(angular.bind(this, function successCallback(response) {
                    alert("Institution " + this.details.name + " has been deleted.");
                    window.location = this.root + "/home";
                }), function errorCallback(response) {
                    console.log(response);
                    alert("Error deleting institution. See console for details.");
                });
        }
    };

    this.createProject = function () {
        if (this.details.id == 0) {
            alert("Please finish creating the institution before adding projects to it.");
        } else if (this.details.id == -1) {
            alert("Projects cannot be created without first selecting an institution.");
        } else {
            window.location = this.root + "/project/0?institution=" + this.details.id;
        }
    };

    this.updateUserInstitutionRole = function (userId, email, role) {
        $http.post(this.root + "/update-user-institution-role",
                   {userId: userId, institutionId: this.details.id, role: role})
            .then(angular.bind(this, function successCallback(response) {
                alert("User " + email + " has been given role '" + role + "'.");
                if (userId == this.userId && role != "admin") {
                    this.pageMode = "view";
                    this.isAdmin = false;
                }
                this.getUserList(this.details.id);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error updating user institution role. See console for details.");
            });
    };

    this.findUserByEmail = function (userList, email) {
        return userList.find(
            function (user) {
                return user.email == email;
            }
        );
    };

    this.addUser = function () {
        if (this.newUserEmail == "") {
            alert("Please enter an existing user's email address.");
        } else if (this.findUserByEmail(this.userList, this.newUserEmail)) {
            alert(this.newUserEmail + " is already a member of this institution.");
        } else {
            var newUser = this.findUserByEmail(this.userListComplete, this.newUserEmail);
            if (newUser) {
                this.updateUserInstitutionRole(newUser.id, newUser.email, "member");
                this.newUserEmail = "";
            } else {
                alert(this.newUserEmail + " is not an existing user's email address.");
            }
        }
    };

    this.isInstitutionMember = function (userId) {
        return userId == 1
            || this.userList.some(
                function (user) {
                    return user.id == userId;
                }
            );
    };

    this.requestMembership = function () {
        $http.post(this.root + "/request-institution-membership",
                   {institutionId: this.details.id, userId: parseInt(this.userId)})
            .then(angular.bind(this, function successCallback(response) {
                alert("Membership requested for user " + this.userId + ".");
                utils.disable_element("request-membership-button");
            }), function errorCallback(response) {
                console.log(response);
                alert("Error requesting institution membership. See console for details.");
            });
    };

}]);

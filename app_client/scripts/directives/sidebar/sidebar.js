'use strict';

/**
 * @ngdoc directive
 * @name hpcMonitoringApp.service: sidebar
 * @description
 * # Director for left sidebar
 */

angular.module('hpcMonitoringApp')
    .directive('sidebar', ['$location', function () {
        return {
            template: '<ng-include src="getTemplateUrl()" />',
            restrict: 'E',
            scope: {},
            controller: ['$scope', 'socket', 'authentication', function ($scope, socket, authentication) {
                var user = authentication.currentUser();
                if (user.usertype == 1)
                    $scope.usertype = 'admin';
                else
                    $scope.usertype = 'user';

                $scope.getTemplateUrl = function () {
                    return "scripts/directives/sidebar/sidebar." + $scope.usertype + ".html";
                };

                $scope.selectedMenu = 'dashboard';
                $scope.collapseVar = 0;
                $scope.multiCollapseVar = 0;
                socket.on('server:time', function (data) {
                    $scope.serverTime = moment(data).format("ddd MMM Do YYYY, h:mm:ss a");
                });
                $scope.check = function (x) {

                    if (x == $scope.collapseVar)
                        $scope.collapseVar = 0;
                    else
                        $scope.collapseVar = x;
                };

                $scope.multiCheck = function (y) {

                    if (y == $scope.multiCollapseVar)
                        $scope.multiCollapseVar = 0;
                    else
                        $scope.multiCollapseVar = y;
                };
            }]
        }
    }]);

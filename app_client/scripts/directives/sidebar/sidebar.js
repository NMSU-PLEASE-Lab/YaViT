'use strict';

/**
 * @ngdoc directive
 * @name hpcMonitoringApp.service: sidebar
 * @description
 * # Director for left sidebar
 */

angular.module('hpcMonitoringApp')
    .directive('sidebar', ['$location',  () => {
        return {
            template: '<ng-include src="getTemplateUrl()" />',
            restrict: 'E',
            scope: {},
            controller: ['$scope', 'socket', 'authentication',  ($scope, socket, authentication) => {
                let user = authentication.currentUser();
                if (user.usertype == 1)
                    $scope.usertype = 'admin';
                else
                    $scope.usertype = 'user';

                $scope.getTemplateUrl =  () => {
                    return "scripts/directives/sidebar/sidebar." + $scope.usertype + ".html";
                };

                $scope.selectedMenu = 'dashboard';
                $scope.collapselet = 0;
                $scope.multiCollapselet = 0;
                socket.on('server:time',  (data) => {
                    $scope.serverTime = moment(data).format("ddd MMM Do YYYY, h:mm:ss a");
                });
                $scope.check =  (x) => {

                    if (x == $scope.collapselet)
                        $scope.collapselet = 0;
                    else
                        $scope.collapselet = x;
                };

                $scope.multiCheck =  (y) => {

                    if (y == $scope.multiCollapselet)
                        $scope.multiCollapselet = 0;
                    else
                        $scope.multiCollapselet = y;
                };
            }]
        }
    }]);

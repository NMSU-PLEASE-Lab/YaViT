'use strict';

/**
 * @ngdoc function
 * @name hpcMonitoringApp.controller:adminCtrl
 * @description
 * # adminCtrl
 * Controller of the hpcMonitoringApp
 */
angular.module('hpcMonitoringApp')
    .controller('adminCtrl',
        ['$scope', '$location', 'authentication','$http',
            function ($scope, $location, authentication,$http) {
                $scope.model = {};
                $scope.model.nodes = [];
                $scope.jobsCount = 0;
                $scope.model.currentNode = 0;
                $scope.user = authentication.currentUser();
                if ($scope.user.usertype !== 1)
                    $location.path("/login");

                $http.get('/api/allNodes').then(function (response) {
                    $scope.model.nodes = response.data;
                }).catch(function (err) {
                    console.log(err);
                });

                $http.get('/api/getJobsCount').then(function (response) {
                    $scope.jobsCount = response.data;
                }).catch(function (err) {
                    console.log(err);
                });


            }]);



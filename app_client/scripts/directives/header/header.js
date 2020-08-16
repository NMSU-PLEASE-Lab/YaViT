'use strict';

/**
 * @ngdoc directive
 * @name hpcMonitoringApp.directive:header
 * @description
 * # directive for header
 */
angular
    .module('hpcMonitoringApp')
    .directive('header', () => {
        return {
            templateUrl: 'scripts/directives/header/header.html',
            restrict: 'E',
            replace: true,
            scope: {
            },
            controller:['$scope','authentication','$state', ($scope,authentication,$state) => {
            }]
        }
    });



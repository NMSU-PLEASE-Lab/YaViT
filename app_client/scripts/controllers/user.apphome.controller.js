'use strict';

/**
 * @ngdoc function
 * @name hpcMonitoringApp.controller:userAppHomeCtrl
 * @description
 * # userAppHomeCtrl
 * Controller of the hpcMonitoringApp
 */
angular.module('hpcMonitoringApp')
    .controller('userAppHomeCtrl',
        ['$scope', '$location', 'authentication', '$http', 'DTOptionsBuilder', 'DTColumnBuilder', '$compile', '$state', '$rootScope','$timeout',
            function ($scope, $location, authentication, $http, DTOptionsBuilder, DTColumnBuilder, $compile, $state, $rootScope,$timeout) {

                $scope.user = authentication.currentUser();
                if ($scope.user.usertype !== 2)
                    $location.path("/login");

                $scope.applicationCount = 0;
                $scope.activeApplicationCount = 0;
                $scope.activeApplications = 0;

                $scope.dtApplicationInstance = {};
                $scope.dtApplicationColumns = [
                    DTColumnBuilder.newColumn('_id').notVisible(),
                    DTColumnBuilder.newColumn('ApplicationName').renderWith(function (data, type, full) {
                        return '<a href="" class="btn btn-link" ng-click="onJobRunClicked(\'' + data + '\')">' + data + '</a>';
                    }).withTitle('Application Name'),
                    DTColumnBuilder.newColumn('NumberOfJobs').withTitle('Number Of Jobs')
                ];
                $scope.onJobRunClicked = function (name) {
                    $state.go('user.jobhome', {app_name: name});

                };
                $scope.dtApplicationOptions = DTOptionsBuilder.newOptions().withOption('bInfo', false).withOption("pageLength", 8).withOption("bLengthChange", false)
                    .withOption('columnDefs', [{
                        "targets": 1,
                        "orderable": false
                    }, {
                        "targets": 2,
                        "orderable": false
                    }])
                    .withOption('language', {searchPlaceholder: "Application Name"})
                    .withOption('ajax', {
                        url: '/api/getApplications',
                        data: {
                            username: $scope.user.username,
                            searchColumn: ["ApplicationName"]
                        },
                        type: 'POST'
                    })
                    .withDataProp('data')
                    .withOption('processing', true)
                    .withOption('serverSide', true)
                    .withPaginationType('full_numbers')
                    .withOption('createdRow',
                        function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                            $compile(nRow)($scope);
                        });

                getApplicationsCount();
                getActiveApplications();
                getAverageEfficiencyOfApplications();
                getAverageRunTimeOfApplications();
                refreshAllData();
                function getAverageEfficiencyOfApplications() {
                    $http.get('/api/getAverageEfficiencyOfApplications' + '?username=' + $scope.user.username).then(function (response) {
                        drawAvgSuccessRateChart(response.data);
                    }).catch(function (err) {
                        console.log(err);
                    });
                }

                function getAverageRunTimeOfApplications() {
                    $http.get('/api/getAverageRunTimeOfApplications' + '?username=' + $scope.user.username).then(function (response) {
                        drawAvgRunTimeChart(response.data);
                    }).catch(function (err) {
                        console.log(err);
                    });
                }


                function getApplicationsCount() {
                    $http.get('/api/getApplicationsCount' + '?username=' + $scope.user.username).then(function (response) {
                        $scope.applicationCount = response.data;
                    }).catch(function (err) {
                        console.log(err);
                    });
                }

                function getActiveApplications() {
                    $http.get('/api/getActiveApplications' + '?username=' + $scope.user.username).then(function (response) {
                        $scope.activeApplications = response.data;
                        $scope.activeApplicationCount = response.data.length;
                    }).catch(function (err) {
                        console.log(err);
                    });
                }

                function drawAvgSuccessRateChart(data) {
                    if (typeof $("#avg-success-rate-chart").highcharts() !== 'undefined') {
                        var chart = $("#avg-success-rate-chart").highcharts();
                        chart.xAxis[0].setExtremes(0, data.length > 12 ? 12 : data.length - 1);
                        chart.get("success_rate").setData(data);
                        return;
                    }
                    Highcharts.chart('avg-success-rate-chart', {
                        chart: {
                            type: 'bar',
                            animation: false

                        },
                        title: {
                            text: ''
                        },
                        exporting: {enabled: false},
                        credits: {enabled: false},
                        xAxis: {
                            type: 'category',
                            min: 0,
                            max: data.length > 12 ? 12 : data.length - 1,
                            scrollbar: {
                                enabled: true
                            },
                            tickLength: 0
                        },
                        yAxis: {
                            min: 0,
                            max: 100,
                            title: {
                                text: 'Success Rate'
                            }
                        },
                        legend: {
                            enabled: false
                        },
                        plotOptions: {
                            series: {
                                animation: false
                            }
                        },
                        tooltip: {
                            pointFormat: 'Success Rate: <b>{point.y:.1f} %</b>'
                        },
                        series: [{
                            name: 'success_rate',
                            id: 'success_rate',
                            data: data,
                            color: "#6274da"
                        }]
                    });
                }

                function drawAvgRunTimeChart(data) {
                    if (typeof $("#avg-run-time-chart").highcharts() !== 'undefined') {
                        var chart = $("#avg-run-time-chart").highcharts();
                        chart.xAxis[0].setExtremes(0, data.length > 12 ? 12 : data.length - 1);
                        chart.get("RunTime").setData(data);
                        return;
                    }
                    Highcharts.chart('avg-run-time-chart', {
                        chart: {
                            type: 'bar',
                            animation: false


                        },
                        title: {
                            text: ''
                        },
                        exporting: {enabled: false},
                        credits: {enabled: false},
                        xAxis: {
                            type: 'category',
                            min: 0,
                            max: data.length > 12 ? 12 : data.length - 1,
                            scrollbar: {
                                enabled: true
                            },
                            tickLength: 0
                        },
                        yAxis: {
                            min: 0,
                            title: {
                                text: 'RunTime (Minutes)'
                            }
                        },
                        legend: {
                            enabled: false
                        },
                        plotOptions: {
                            series: {
                                animation: false
                            }
                        },
                        tooltip: {
                            pointFormat: 'Avg RunTime: <b>{point.y:.5f}</b> minutes'
                        },
                        series: [{
                            name: 'RunTime',
                            id: 'RunTime',
                            data: data,
                            color: '#029402'
                        }]
                    });
                }

                function refreshAllData() {
                    $scope.timeout = $timeout(function(){
                        getApplicationsCount();
                        getActiveApplications();
                        getAverageEfficiencyOfApplications();
                        getAverageRunTimeOfApplications();

                    }, 10000);

                }
                $scope.$on("$destroy",function(){
                    if (angular.isDefined($scope.timeout)) {
                        $timeout.cancel($scope.timeout);
                    }
                });

            }]);



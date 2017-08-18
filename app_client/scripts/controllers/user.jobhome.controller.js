'use strict';

/**
 * @ngdoc function
 * @name hpcMonitoringApp.controller:userHomeCtrl
 * @description
 * Controller dashboard page of the user
 */
angular.module('hpcMonitoringApp')
    .controller('userHomeCtrl',
        ['$scope', '$location', 'authentication', '$http', 'DTOptionsBuilder', 'DTColumnBuilder', '$compile', '$state', '$rootScope', '$timeout', '$stateParams',
            function ($scope, $location, authentication, $http, DTOptionsBuilder, DTColumnBuilder, $compile, $state, $rootScope, $timeout, $stateParams) {

                $scope.user = authentication.currentUser();
                if ($scope.user.usertype !== 2)
                    $location.path("/login");

                /* Variables initialization */
                $scope.model = {};
                $scope.model.nodes = [];
                $scope.jobsCount = 0;
                $scope.model.currentNode = 0;
                $scope.activeJobs = [];
                $scope.recentJobs = [];
                $scope.runningJobsCount = 0;
                $scope.applicationName = '';
                $scope.configJobQualityData = [];
                $scope.pageTitle = 'Jobs Summary <small>( All )';
                if (typeof $stateParams.app_name !== 'undefined' && $stateParams.app_name !== '') {
                    $scope.applicationName = $stateParams.app_name;
                    $scope.pageTitle = 'Jobs Summary' + " <small>( " + $stateParams.app_name + " )</small>";
                }


                $scope.onJobRunClicked = function (id, name) {
                    $state.go('user.jobdetail', {'jobId': id, 'jobName': name});
                };
                $scope.onJobFailClicked = function (status) {
                    status = parseInt(status);
                    var failMsg = "Reason not found.";
                    if (isNaN(status))
                        return;
                    if (status < 0 && status > -15)
                        failMsg = $rootScope.jobExitStatus[status];
                    else if (status > 0 && status <= 127) {
                        status = "0-127";
                        failMsg = $rootScope.jobExitStatus[status];

                    }
                    else if (status > 127) {
                        var signal = status % 128;
                        status = ">127";
                        failMsg = $rootScope.jobExitStatus[status];
                        failMsg = failMsg.replace('[signal]', signal);
                    }
                    $scope.okModalHeader = "Failed Reason";
                    $scope.okModalBody = failMsg;
                    $('#ok-modal').modal('show');

                };


                /* Var and methods for angular datatable for current and current jobs */
                $scope.dtCurrentJobsInstance = {};
                $scope.dtRecentJobsInstance = {};
                $scope.dtCurrentJobsOptions = DTOptionsBuilder.newOptions().withOption('paging', false)
                    .withOption('searching', false).withOption('bInfo', false).withOption('scrollY', '200px')
                    .withOption('order', [[0, "desc"]])
                    .withOption('language', {searchPlaceholder: "UserName"})
                    .withOption('ajax', function (data, callback, settings) {
                        $http({
                            method: 'GET',
                            url: '/api/getActiveJobs' + '?owner=' + $scope.user.username + "&app_name=" + $scope.applicationName
                        }).then(function (response) {
                            $scope.activeJobs = response.data;
                            var counts = _.countBy(response.data, function (item) {
                                return typeof item.start_time !== 'undefined' && item.start_time !== '' ? 'Running' : 'Queued';
                            });
                            $scope.runningJobsCount = counts.Running || 0;
                            $scope.queuedJobsCount = counts.Queued || 0;
                            callback(response.data)
                        }).catch(function (err) {
                            console.log(err);
                        });
                    }).withOption('createdRow',
                        function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {


                            $compile(nRow)($scope);
                        });
                $scope.dtRecentJobsOptions = DTOptionsBuilder.newOptions().withOption('paging', false)
                    .withOption('searching', false).withOption('bInfo', false).withOption('scrollY', '200px').withOption('scrollCollapse', true)
                    .withOption('order', [[0, "desc"]])
                    .withOption('columnDefs', [{
                        "targets": 3,
                        "orderable": false
                    }])
                    .withOption('language', {searchPlaceholder: "UserName"})
                    .withOption('ajax', function (data, callback, settings) {
                        $http({
                            method: 'GET',
                            url: '/api/getRecentJobs' + '?owner=' + $scope.user.username + "&app_name=" + $scope.applicationName
                        }).then(function (response) {
                            $scope.recentJobs = response.data;
                            callback(response.data)
                        }).catch(function (err) {
                            console.log(err);
                        });
                    }).withOption('createdRow',
                        function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                            $compile(nRow)($scope);
                        });

                $scope.dtCurrentJobsColumns = [
                    DTColumnBuilder.newColumn('_id').renderWith(function (data, type, full) {
                        return '<a href="" class="btn btn-link" ng-click="onJobRunClicked(' + data + ',\'' + full.name + '\')">' + data + '</a>';
                    }).withTitle('Job Number'),
                    DTColumnBuilder.newColumn('name').withTitle('Name'),
                    DTColumnBuilder.newColumn(null).withTitle('Status').renderWith(function (data, type, full) {
                        if (typeof full.start_time === 'undefined' || full.start_time === '' || full.start_time === 0)
                            return "<span class='label label-warning'>Queued</span>";
                        else {
                            if (full.percentCompleted === -1)
                                return "<span class='label label-primary'>Running</span>";
                            else {
                                full.percentCompleted = full.percentCompleted <1? full.percentCompleted : parseInt(full.percentCompleted);
                                full.percentCompleted = full.percentCompleted >= 100 ? 99 : full.percentCompleted;
                                return '<div class="progress" style="border: 1px solid #969696;">' +
                                    '<div class="progress-bar" role="progressbar" style="width:'+full.percentCompleted+'%;"></div>' +
                                    '<div style="position: absolute;right:40px;">' +
                                    '<small>'+full.percentCompleted+'%</small>' +
                                    '</div>' +
                                    '</div>';

                            }
                        }
                    })
                ];

                $scope.dtRecentJobsColumns = [
                    DTColumnBuilder.newColumn('_id').renderWith(function (data, type, full) {
                        return '<a href="" class="btn btn-link" ng-click="onJobRunClicked(' + data + ',\'' + full.name + '\')">' + data + '</a>';
                    }).withTitle('Job Number'),
                    DTColumnBuilder.newColumn('name').withTitle('Job Name'),
                    DTColumnBuilder.newColumn('start_time').renderWith(function (data, type, full) {
                        if (typeof data !== 'undefined' && data !== '')
                            return moment.unix(data).format("YYYY-MM-DD hh:mm:ss");
                        else
                            return '';
                    }).withTitle('Start Time'),
                    DTColumnBuilder.newColumn('duration').withTitle('Duration'),
                    DTColumnBuilder.newColumn('exit_status').withTitle('Exit Status').renderWith(function (data, type, full) {
                        if (typeof data == 'undefined' || data == '')
                            return '';
                        if (!(data == "" || data == "0" || data == 0))
                            return '<a href="" ng-click="onJobFailClicked(' + data + ')"><span class="label label-danger">Failure</span></a>';
                        else
                            return '<span class="label label-success">Success</span>';
                    })
                ];

                $scope.unixToJsTime = function ($unixTime) {
                    return moment.unix($unixTime).format("YYYY-MM-DD hh:mm:ss");
                };
                /* Count of Jobs */
                getJobsCount();
                getRunQualityByConfiguration();
                refreshAllData();
                /*Refresh data every fixed interval */

                function getJobsCount() {
                    $http.get('/api/getJobsCount' + '?owner=' + $scope.user.username + "&app_name=" + $scope.applicationName).then(function (response) {
                        $scope.jobsCount = response.data;
                    }).catch(function (err) {
                        console.log(err);
                    });

                }

                function getRunQualityByConfiguration() {
                    if ($scope.applicationName !== '') {
                        $http.get('/api/getRunQualityAndRuntimeByConfiguration' + '?owner=' + $scope.user.username + "&app_name=" + $scope.applicationName).then(function (response) {
                            $scope.configJobQualityData = response.data.Configuration;
                            drawRunQualityChart(response.data.Quality);
                            drawRunTimeChart(response.data.Runtime);
                        }).catch(function (err) {
                            console.log(err);
                        });
                    }
                }


                function drawRunTimeChart(data) {
                    var categories = [];
                    for (var i = 1; i <= data.length; i++)
                        categories.push("C" + i);
                    var chart = $("#application-run-quality-runtime").highcharts();
                    if (typeof chart !== 'undefined') {
                        chart.xAxis[0].setCategories(categories);
                        chart.get("Runtime").setData(data);
                        return;
                    }
                    Highcharts.chart('application-run-quality-runtime', {
                        chart: {
                            type: 'column'
                        },
                        credits: {
                            enabled: false
                        },
                        title: {
                            text: ''
                        },
                        legend: {
                            enabled: false
                        },
                        xAxis: {
                            categories: categories,
                            min: 0,
                            max: 4,
                            scrollbar: {
                                enabled: true
                            }
                        },
                        yAxis: {
                            min: 0,
                            title: {
                                text: 'Runtime (Minutes)'
                            }
                        },
                        tooltip: {
                            pointFormat: '<b>{point.y} minutes</b><br/>',
                            shared: true
                        },
                        plotOptions: {
                            series: {}
                        },
                        series: [{
                            id: 'Runtime',
                            color: "#8235a6",
                            data: data
                        }]
                    });
                }

                function drawRunQualityChart(data) {
                    var categories = [];
                    for (var i = 1; i <= data.Failed.length; i++)
                        categories.push("C" + i);
                    var chart = $("#application-run-quality-numberOfRuns").highcharts();
                    if (typeof chart !== 'undefined') {
                        chart.xAxis[0].setCategories(categories);
                        chart.get("Failed").setData(data.Failed);
                        chart.get("Critical").setData(data.Critical);
                        chart.get("Abnormal").setData(data.Abnormal);
                        chart.get("Healthy").setData(data.Healthy);
                        chart.get("NoQuality").setData(data.NoQuality);
                        return;
                    }
                    Highcharts.chart('application-run-quality-numberOfRuns', {
                        chart: {
                            type: 'column'
                        },
                        credits: {
                            enabled: false
                        },
                        title: {
                            text: ''
                        },
                        legend: {
                            align: 'right',
                            verticalAlign: 'top',
                            layout: 'vertical'
                        },
                        xAxis: {
                            categories: categories,
                            min: 0,
                            max: 4,
                            scrollbar: {
                                enabled: true
                            }
                        },
                        yAxis: {
                            min: 0,
                            title: {
                                text: 'Number of Runs'
                            }
                        },
                        tooltip: {
                            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
                            shared: true
                        },
                        plotOptions: {
                            series: {}
                        },
                        series: [
                            {
                                id: 'Healthy',
                                name: 'Healthy',
                                color: "#00a65a",
                                data: data.Healthy
                            },
                            {
                                id: 'Abnormal',
                                name: 'Abnormal',
                                color: "#f39c12",
                                data: data.Abnormal
                            },
                            {
                                id: 'Critical',
                                name: 'Critical',
                                color: "#dd4b39",
                                data: data.Critical
                            },
                            {
                                id: 'Failed',
                                name: 'Failed',
                                color: "#4e2040",
                                data: data.Failed
                            }, {
                                id: 'NoQuality',
                                name: 'NoQuality',
                                color: "#afb0ff",
                                data: data.NoQuality
                            }]
                    });
                }

                function refreshAllData() {
                    $scope.timeout = $timeout(function () {
                        $scope.dtCurrentJobsInstance.reloadData();
                        $timeout(function () {
                            $scope.dtRecentJobsInstance.reloadData();
                            $timeout(function () {
                                getJobsCount();
                                getRunQualityByConfiguration();
                                refreshAllData();

                            }, 2000);

                        }, 2000);

                    }, 10000);

                }

                /*Destroy timeout function on scope destroy*/
                $scope.$on("$destroy", function () {
                    if (angular.isDefined($scope.timeout)) {
                        $timeout.cancel($scope.timeout);
                    }
                });


            }]);



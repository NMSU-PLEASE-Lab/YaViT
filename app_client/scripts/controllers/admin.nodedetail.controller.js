'use strict';
/**
 * @ngdoc function
 * @name hpcMonitoringApp.controller:adminNodeDetailCtrl
 * @description
 * # adminNodeDetailCtrl
 * Controller of the hpcMonitoringApp
 */
angular.module('hpcMonitoringApp')
    .controller('adminNodeDetailCtrl',
        ['$scope', '$location', 'authentication', '$http', 'socket', '$q',
            function ($scope, $location, authentication, $http, socket, $q) {

                $scope.user = authentication.currentUser();
                if ($scope.user.usertype !== 1)
                    $location.path("/login");

                Highcharts.setOptions({global: {useUTC: false}});
                socket.on('server:time', function (data) {
                    $scope.serverTime = data;
                });

                //variables initialization
                $scope.currentNode = {};
                $scope.myNodeList = [];
                $scope.metricsSchema = [];
                $scope.selectedMetrics = [];
                $scope.selectedMetricsCursors = [];
                $scope.currentNode.selected = {};
                $scope.allCharts = [];

                $scope.model = {};
                $scope.model.currentNode = 0;


                $scope.selectedMetricsOptions = [];
                $scope.metricsSelectorOptions = [];
                $scope.metricsSelectorOptionsOutput = [];
                $scope.metricsValueModel = [];

                $scope.nodesSelectorOptions = [];
                $scope.nodesSelectorOptionsOutput = [];

                $scope.selectedMetricsValueOptions = [];
                $scope.selectedMetricsValueOptionsOutput = [];


                //initial API Calls
                $http.get('/api/allNodes').then(function (response1) {
                    $scope.myNodeList = response1.data;
                    $http.get('/api/getMetricsSchema').then(function (response2) {
                        $scope.metricsSchema = response2.data;
                        $scope.selectedMetrics = [];
                        $scope.selectedMetricsOptions = ['meminfo'];

                        for (var i = 0; i < $scope.metricsSchema.length; i++) {
                            //TODO: ticked default define from configuration
                            $scope.metricsSelectorOptions.push(
                                {
                                    name: $scope.metricsSchema[i].name,
                                    ticked: $scope.metricsSchema[i].name == 'meminfo'
                                });

                        }

                        //TODO: defaults from configuration
                        for (i = 0; i < $scope.myNodeList.length; i++) {

                            $scope.selectedMetricsCursors[$scope.myNodeList[i]._id] = {};
                            $scope.nodesSelectorOptions.push({
                                name: $scope.myNodeList[i].Name,
                                value: $scope.myNodeList[i]._id,
                                ticked: $scope.myNodeList[i]._id == 1
                            });

                            $scope.selectedMetricsValueOptions[$scope.myNodeList[i].Name] = {};
                            $scope.selectedMetricsValueOptionsOutput[$scope.myNodeList[i].Name] = {};

                            for (var j = 0; j < $scope.metricsSchema.length; j++) {
                                var keys = Object.keys($scope.metricsSchema[j].structure);
                                $scope.selectedMetricsValueOptions[$scope.myNodeList[i].Name][$scope.metricsSchema[j].name] = [];
                                $scope.selectedMetricsValueOptionsOutput[$scope.myNodeList[i].Name][$scope.metricsSchema[j].name] = [];
                                for (var k = 0; k < keys.length; k++)
                                    if (!(keys[k] in $scope.metricsSchema[j].non_metric_fields))
                                        $scope.selectedMetricsValueOptions[$scope.myNodeList[i].Name][$scope.metricsSchema[j].name].push({
                                            name: keys[k],
                                            ticked: false
                                        });
                            }

                        }
                        // setTimeout(function () {
                        //     $scope.timeSelected(1)
                        // }, 1000);

                    }).catch(function (err) {
                        console.log(err);
                    });

                }).catch(function (err) {
                    console.log(err);
                });


                $scope.metricsOptionsChanged = function (data) {
                    if (data.ticked == true && $scope.metricsSelectorOptionsOutput.length > 3) {
                        for (var i = 0; i < $scope.metricsSelectorOptions.length; i++) {
                            if ($scope.metricsSelectorOptions[i].name == data.name) {
                                $scope.metricsSelectorOptions[i].ticked = false;
                                return;
                            }
                        }

                    }
                    if (data.ticked == false) {
                        for (var i = 0; i < $scope.myNodeList.length; i++) {
                            try {
                                $('#' + data.name + '-chart-container-' + $scope.myNodeList[i]._id).highcharts().destroy();
                            }
                            catch (err) {

                            }

                        }
                    }
                    if ($scope.nodesSelectorOptionsOutput.length > 0 && $scope.metricsSelectorOptionsOutput.length > 0)
                        GetDataAndDrawChart();

                };


                //scope functions
                $scope.nodesOptionsChanged = function (data) {
                    if (data.ticked == true && $scope.nodesSelectorOptionsOutput.length > 4) {
                        for (var i = 0; i < $scope.nodesSelectorOptions.length; i++) {
                            if ($scope.nodesSelectorOptions[i].value == data.value) {
                                $scope.nodesSelectorOptions[i].ticked = false;
                                return;
                            }
                        }

                    }
                    if (data.ticked == false) {
                        for (var i = 0; i < $scope.metricsSchema.length; i++) {
                            try {
                                $('#' + $scope.metricsSchema[i].name + '-chart-container-node-' + data.name).highcharts().destroy();
                            }
                            catch (err) {
                            }
                        }
                    }

                    if ($scope.nodesSelectorOptionsOutput.length > 0 && $scope.metricsSelectorOptionsOutput.length > 0)
                        GetDataAndDrawChart();
                };

                $scope.metricsValueOptionsChanged = function (metricName, node, data) {

                    if (data.ticked == true && $scope.selectedMetricsValueOptionsOutput[node.name][metricName].length > 6) {
                        for (var i = 0; i < $scope.selectedMetricsValueOptions[node.name][metricName].length; i++) {
                            if ($scope.selectedMetricsValueOptions[node.name][metricName][i].name == data.name) {
                                $scope.selectedMetricsValueOptions[node.name][metricName][i].ticked = false;
                                return;
                            }
                        }

                    }
                    var chartId = metricName + "-chart-container-node-" + node.value;
                    if (typeof $("#" + chartId).highcharts() !== 'undefined') {
                        typeof $("#" + chartId).highcharts().destroy();
                    }
                    GetDataAndDrawChart({"metricName": metricName, "nodeId": node.value});

                };

                function GetDataAndDrawChart(singleChartData) {
                    var getObj = {};

                    var urlCalls = [];

                    for (var i = 0; i < $scope.nodesSelectorOptionsOutput.length; i++) {
                        if (typeof singleChartData !== 'undefined' && $scope.nodesSelectorOptionsOutput[i].value != singleChartData.nodeId) continue;
                        getObj.nodeId = $scope.nodesSelectorOptionsOutput[i].value;
                        for (var j = 0; j < $scope.metricsSelectorOptionsOutput.length; j++) {
                            if (typeof singleChartData !== 'undefined' && $scope.metricsSelectorOptionsOutput[j].name != singleChartData.metricName) continue;
                            getObj.type = $scope.metricsSelectorOptionsOutput[j].name;
                            var chartContainerId = getObj.type + '-chart-container-node-' + $scope.nodesSelectorOptionsOutput[i].value;
                            var metricValues = _.pluck($scope.selectedMetricsValueOptionsOutput[$scope.nodesSelectorOptionsOutput[i].name][$scope.metricsSelectorOptionsOutput[j].name], 'name');
                            for (var k = 0; k < metricValues.length; k++) {
                                getObj.metricValue = metricValues[k];
                                getObj.dateFrom = (_.find($scope.metricsSchema, function (item) {
                                    return item.name == $scope.metricsSelectorOptionsOutput[j].name;
                                })).MinTime;
                                getObj.dateTo = moment().valueOf();
                                urlCalls.push($http({
                                    method: 'GET',
                                    url: '/api/getMetricsData',
                                    params: {
                                        filters: JSON.stringify(getObj)
                                    }
                                }).then((function (getObjJson, chartContainerId, noOfMetricValues) {
                                        return function (response) {
                                            var getObj = JSON.parse(getObjJson);
                                            $scope.selectedMetricsCursors[getObj.nodeId][getObj.type] = response.data.cursor;
                                            DrawMetricsChart(chartContainerId, response.data.data, getObj.type, getObj.nodeId, getObj.metricValue, metricValues.length);
                                        }
                                    })(JSON.stringify(getObj), chartContainerId)
                                ).catch(function (err) {
                                    console.log(err);
                                }));
                            }
                        }
                    }
                    $q.all(urlCalls);

                }


                function DrawMetricsChart(containerId, data, chartType, nodeId, metricValue, noOfMetricValues) {
                    // Add a null value for the end date
                    data = [].concat(data, [[moment().valueOf(), null, null, null, null]]);
                    var seriesHeight = 100 / noOfMetricValues;
                    var series = {};
                    var tooltip = {};
                    series = {
                        id: metricValue + "-series",
                        name: metricValue,
                        data: data,
                        yAxis: metricValue
                    };
                    tooltip = {
                        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
                        split: true
                    };

                    if (typeof $("#" + containerId).highcharts() !== 'undefined') {
                        var chart = $("#" + containerId).highcharts();
                        var top = (seriesHeight * chart.options.yAxis.length) + 15;
                        seriesHeight = seriesHeight - 8;
                        if (typeof chart.get(metricValue + "-series") === 'undefined') {
                            chart.addAxis({
                                opposite: false,
                                id: metricValue,
                                title: {
                                    text: ''
                                },
                                top: top + "%",
                                height: seriesHeight + '%',
                                offset: 0,
                                lineWidth: 1
                            });
                            chart.addSeries({
                                id: metricValue + "-series",
                                name: metricValue,
                                data: data,
                                yAxis: metricValue

                            });
                        }
                        else {
                            //chart.get(metricValue + "-series").setData(data, true);
                        }
                        return;

                    }

                    var chart = Highcharts.StockChart(containerId, {
                        credits: {
                            enabled: false
                        },
                        rangeSelector: {
                            buttons: [
                                {
                                    type: 'hour',
                                    count: 1,
                                    text: '1h'
                                },
                                {
                                    type: 'day',
                                    count: 1,
                                    text: '1d'
                                },
                                {
                                    type: 'week',
                                    count: 1,
                                    text: '7d'
                                },
                                {
                                    type: 'month',
                                    count: 1,
                                    text: '1m'
                                },
                                {
                                    type: 'month',
                                    count: 6,
                                    text: '6m'
                                },
                                {
                                    type: 'all',
                                    text: 'All'
                                }],
                            enabled: true,
                            inputEnabled: true,
                            inputBoxWidth: 150,
                            inputDateFormat: "%Y-%m-%d %H:%M",
                            inputEditDateFormat: "%Y-%m-%d %H:%M",
                            inputDateParser: function (value) {
                                return moment(value, "YYYY-MM-DD HH:mm").valueOf();
                            }

                        },

                        navigator: {
                            enabled: true,
                            adaptToUpdatedData: false,
                            height: 80,
                            xAxis: {
                                labels: {
                                    format: '{value:%b %d, %H:%M}'
                                }
                            },
                            series: {

                            }
                        },
                        scrollbar: {
                            liveRedraw: false
                        },
                        yAxis: {
                            id: metricValue,
                            title: {
                                text: ''
                            },
                            height: seriesHeight + '%',
                            lineWidth: 1,
                            opposite: false
                        },

                        xAxis: {
                            type: 'datetime',
                            ordinal: false,
                            events: {
                                afterSetExtremes: function (e) {
                                    var chart = $("#" + containerId).highcharts();
                                    for (var k = 0; k < chart.series.length; k++) {
                                        if (chart.series[k].name.toLowerCase().startsWith("navigator"))
                                            continue;
                                        $http({
                                            method: 'GET',
                                            url: '/api/getMetricsData',
                                            params: {
                                                filters: {
                                                    "dateFrom": e.min,
                                                    "dateTo": e.max,
                                                    "nodeId": nodeId,
                                                    "type": chartType,
                                                    "metricValue": chart.series[k].name
                                                }
                                            }
                                        }).then((function (metricValue) {
                                                return function (response) {
                                                    chart.get(JSON.parse(metricValue) + "-series").setData(response.data.data);

                                                }
                                            })(JSON.stringify(chart.series[k].name))
                                        ).catch(function (err) {
                                            console.log(err);
                                        })
                                    }
                                }
                            },
                            minRange: 1000 // 1second
                        },
                        legend: {
                            enabled: true,
                            layout: 'vertical',
                            align: 'right',
                            verticalAlign: 'middle'
                        },
                        plotOptions: {
                            series: {
                                animation: false,
                                showInNavigator: true

                            },
                            scatter: {
                                marker: {
                                    radius: 3
                                }

                            }
                        },
                        tooltip: tooltip,

                        series: [series]
                    });

                }

            }]);



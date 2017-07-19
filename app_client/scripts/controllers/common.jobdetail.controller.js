'use strict';
/**
 * @ngdoc function
 * @name hpcMonitoringApp.controller:commonJobDetailCtrl
 * @description
 * # commonJobDetailCtrl
 * Controller of the hpcMonitoringApp
 */
angular.module('hpcMonitoringApp')

    .controller('commonJobDetailCtrl',
        ['$scope', '$location', 'authentication', '$http', '$stateParams', '$q', '$httpParamSerializer',
            function ($scope, $location, authentication, $http, $stateParams, $q, $httpParamSerializer) {

                //variables initialization
                $scope.currentJob = {};
                $scope.jobsList = [];
                $scope.currentJobName = {};
                $scope.nextJobNameId = {};
                $scope.currentJobDetail = {};

                // $scope.selectedMetrics = [];
                $scope.metricsSelectorOptions = [];
                $scope.metricsSelectorOptionsOutput = [];
                $scope.metricsValueModel = [];

                $scope.nodesSelectorOptions = [];
                $scope.nodesSelectorOptionsOutput = [];

                $scope.selectedMetricsValueOptions = [];
                $scope.selectedMetricsValueOptionsOutput = [];
                $scope.selectedMetricsCursors = [];


                var user = authentication.currentUser();
                Highcharts.setOptions({global: {useUTC: false}});

                /*Initial API Calls*/
                var getParam = "";
                getParam += "?nextId=0";
                getParam += user.usertype == 2 ? "&owner=" + user.username : "";
                $http.get('/api/getJobsName' + getParam).then(function (response) {
                    $scope.nextJobNameId = response.data.nextId;
                    $scope.jobNames = response.data.data;
                    if ($scope.jobNames.length > 0) {
                        if ($stateParams.jobName !== '') {
                            $scope.currentJobName.selected = $stateParams.jobName;
                            $scope.jobNameChanged(true);
                        }
                    }
                    else
                        $scope.currentJobName.selected = "";
                }).catch(function (err) {
                    console.log(err);
                });
                $scope.jobNameChanged = function (firstLoad) {
                    $scope.jobsList = [];
                    $scope.currentJob = {};
                    var queryParamsUrl = '';
                    queryParamsUrl += '?name=' + $scope.currentJobName.selected;
                    queryParamsUrl += user.usertype == 2 ? "?owner" + user.username : "";

                    $http.get('/api/getJobRunsByName' + queryParamsUrl).then(function (response) {
                        $scope.jobsList = response.data;
                        if ($scope.jobsList.length > 0) {
                            if ($stateParams.jobId !== '' || typeof firstLoad !== 'undefined') {
                                $scope.currentJob.selected = _.find($scope.jobsList, function (item) {
                                    return item._id == $stateParams.jobId
                                });
                                $scope.jobsChanged()
                            }
                        }
                        else
                            $scope.currentJob.selected = {};
                    }).catch(function (err) {
                        console.log(err);
                    });
                };

                $scope.jobsChanged = function () {
                    $scope.selectedMetricsValueOptions = [];
                    $scope.selectedMetricsValueOptionsOutput = [];

                    $scope.nodesSelectorOptions = [];
                    $scope.nodesSelectorOptionsOutput = [];

                    var queryParamsUrl = '';
                    queryParamsUrl += '?jobId=' + $scope.currentJob.selected._id;
                    $http.get('/api/getEventsData' + queryParamsUrl).then(function (response) {
                        DrawEventsChart(response.data);
                    }).catch(function (err) {

                    });

                    $http.get('/api/getJobById' + queryParamsUrl).then(function (response) {
                        $scope.currentJobDetail = response.data;
                        $scope.currentJobDetail.queue_time_formatted = moment.unix($scope.currentJobDetail.queue_time).format("YYYY-MM-DD hh:mm:ss");
                        $scope.currentJobDetail.start_time_formatted = moment.unix($scope.currentJobDetail.start_time).format("YYYY-MM-DD hh:mm:ss");
                        $scope.currentJobDetail.end_time_formatted = moment.unix($scope.currentJobDetail.end_time).format("YYYY-MM-DD hh:mm:ss");

                        $scope.nodesSelectorOptions = [];
                        for (var i = 0; i < $scope.currentJobDetail.nodes.length; i++) {

                            $scope.selectedMetricsCursors[$scope.currentJobDetail.nodes[i]._id] = {};
                            $scope.nodesSelectorOptions.push({
                                name: $scope.currentJobDetail.nodes[i].Name,
                                value: $scope.currentJobDetail.nodes[i]._id,
                                ticked: false
                            });

                            $scope.selectedMetricsValueOptions[$scope.currentJobDetail.nodes[i].Name] = {};
                            $scope.selectedMetricsValueOptionsOutput[$scope.currentJobDetail.nodes[i].Name] = {};

                            for (var j = 0; j < $scope.metricsSchema.length; j++) {
                                var keys = Object.keys($scope.metricsSchema[j].structure);
                                $scope.selectedMetricsValueOptions[$scope.currentJobDetail.nodes[i].Name][$scope.metricsSchema[j].name] = [];
                                $scope.selectedMetricsValueOptionsOutput[$scope.currentJobDetail.nodes[i].Name][$scope.metricsSchema[j].name] = [];
                                //TODO: Make this dynamic from some configuration
                                var notInclude = ['_id', 'Timestamp', 'NodeId', 'job_id'];
                                for (var k = 0; k < keys.length; k++)
                                    if (notInclude.indexOf(keys[k]) == -1)
                                        $scope.selectedMetricsValueOptions[$scope.currentJobDetail.nodes[i].Name][$scope.metricsSchema[j].name].push({
                                            name: keys[k],
                                            ticked: k == 5
                                        });
                            }

                        }

                    }).catch(function (err) {
                        console.log(err);
                    });

                };
                $http.get('/api/getMetricsSchema').then(function (response) {
                    $scope.metricsSchema = response.data;

                    for (var i = 0; i < $scope.metricsSchema.length; i++) {
                        //TODO: defined with is default from user and make ticked to true
                        $scope.metricsSelectorOptions.push({name: $scope.metricsSchema[i].name, ticked: false});
                    }
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
                        for (var i = 0; i < $scope.currentJobDetail.nodes.length; i++) {
                            try {
                                $('#' + data.name + '-chart-container-node-' + $scope.$scope.currentJobDetail.nodes[i].Name).highcharts().destroy();
                            }
                            catch (err) {
                            }
                        }
                    }
                    if ($scope.nodesSelectorOptionsOutput.length > 0 && $scope.metricsSelectorOptionsOutput.length > 0)
                        GetDataAndDrawChart();

                };

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

                $scope.metricValueChanged = function (metricName, cursorType, node) {

                    GetDataAndDrawChart({
                        "metricName": metricName,
                        "cursorType": cursorType,
                        "nodeId": node.value,
                        "nodeName": node.name
                    });

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
                    GetDataAndDrawChart(undefined, {"metricName": metricName, "nodeId": node.value});

                };

                $scope.unixToJsTime = function ($unixTime) {
                    return "Submitted Date: " + moment.unix($unixTime).format("YYYY-MM-DD hh:mm:ss");
                };
                $scope.manyNodeAndMetricsAlert = function () {
                    $("<div title='Information'>Selecting many nodes and many metrics can cause the page to become non responsive.</div>").dialog({
                        modal: true,
                        buttons: {
                            Ok: function () {
                                $(this).dialog("close");
                            }
                        }
                    });
                };

                $scope.manyMetricsValuesAlert = function () {
                    $("<div title='Information'>Selecting many options can cause the chart to become non responsive.</div>").dialog({
                        modal: true,
                        buttons: {
                            Ok: function () {
                                $(this).dialog("close");
                            }
                        }
                    });
                };


                function GetDataAndDrawChart(cursorData, singleChartData) {
                    var getObj = {};
                    getObj.dateFrom = $scope.currentJobDetail.start_time;
                    getObj.dateTo = $scope.currentJobDetail.end_time;
                    getObj.count = 1000;
                    var urlCalls = [];
                    if (typeof cursorData !== 'undefined') {
                        getObj.nodeId = cursorData.nodeId;
                        getObj.type = cursorData.metricName;

                        if (cursorData.cursorType == 'first')
                            getObj.cursor = $scope.selectedMetricsCursors[getObj.nodeId][getObj.type].first_cursor;
                        else if (cursorData.cursorType == 'last')
                            getObj.cursor = -($scope.selectedMetricsCursors[getObj.nodeId][getObj.type].last_cursor);
                        else if (cursorData.cursorType == 'prev')
                            getObj.cursor = -$scope.selectedMetricsCursors[getObj.nodeId][getObj.type].prev_cursor;
                        else if (cursorData.cursorType == 'next')
                            getObj.cursor = $scope.selectedMetricsCursors[getObj.nodeId][getObj.type].next_cursor;
                        var chartContainerId = getObj.type + '-chart-container-node-' + getObj.nodeId;
                        var metricValues = _.pluck($scope.selectedMetricsValueOptionsOutput[cursorData.nodeName][getObj.type], 'name');
                        for (var k = 0; k < metricValues.length; k++) {
                            getObj.metricValue = metricValues[k];
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
                        $q.all(urlCalls);
                    } else {
                        for (var i = 0; i < $scope.nodesSelectorOptionsOutput.length; i++) {
                            if (typeof singleChartData !== 'undefined' && $scope.nodesSelectorOptionsOutput[i].value != singleChartData.nodeId) continue;
                            getObj.nodeId = $scope.nodesSelectorOptionsOutput[i].value;
                            for (var j = 0; j < $scope.metricsSelectorOptionsOutput.length; j++) {
                                if (typeof singleChartData !== 'undefined' && $scope.metricsSelectorOptionsOutput[j].name != singleChartData.metricName) continue;
                                getObj.type = $scope.metricsSelectorOptionsOutput[j].name;
                                var chartContainerId = getObj.type + '-chart-container-node-' + $scope.nodesSelectorOptionsOutput[i].value;
                                var metricValues = _.pluck($scope.selectedMetricsValueOptionsOutput[$scope.nodesSelectorOptionsOutput[i].name][$scope.metricsSelectorOptionsOutput[j].name], 'name');
                                for (var k = 0; k < metricValues.length; k++) {

                                    if (typeof ($("#" + chartContainerId).highcharts()) !== 'undefined')
                                        continue;
                                    getObj.metricValue = metricValues[k];
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

                }


                function DrawMetricsChart(containerId, data, chartType, nodeName, metricValue, noOfMetricValues) {
                    var seriesHeight = 100 / noOfMetricValues;
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
                            chart.get(metricValue + "-series").setData(data);
                        }
                        return;

                    }

                    var chart = Highcharts.StockChart(containerId, {
                        credits: {
                            enabled: false
                        },
                        rangeSelector: {
                            enabled: false
                        },
                        scrollbar: {
                            enabled: false
                        },
                        navigator: {
                            enabled: true,
                            xAxis: {
                                labels: {
                                    format: '{value:%b %d, %H:%M}'
                                }
                            }
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
                            labels: {
                                format: '{value:%H:%M}'
                            },
                            ordinal: false
                        },
                        legend: {
                            enabled: true,
                            layout: 'vertical',
                            align: 'right',
                            verticalAlign: 'middle'
                        },
                        plotOptions: {
                            series: {
                                animation: false
                            }
                        },
                        tooltip: {
                            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
                            valueDecimals: 0,
                            split: true
                        },

                        series: [{
                            id: metricValue + "-series",
                            name: metricValue,
                            data: data,
                            yAxis: metricValue
                        }]
                    });

                }

                function DrawEventsChart(tasks) {
                    var series = [];
                    console.log(tasks);

                    $.each(tasks.reverse(), function (i, task) {
                        var item = {
                            name: task.name,
                            data: []
                        };
                        $.each(task.intervals, function (j, interval) {
                            item.data.push({
                                x: new Date(interval.from),
                                y: i,
                                label: interval.label,
                                from: new Date(interval.from),
                                to: new Date(interval.to)
                            }, {
                                x: new Date(interval.to),
                                y: i,
                                from: new Date(interval.from),
                                to: new Date(interval.to)
                            });


                        });

                        series.push(item);
                    });
                    console.log(series);

                    var chart1 = new Highcharts.Chart({
                        chart: {
                            renderTo: 'event-chart'
                        },

                        title: {
                            text: ''
                        },

                        xAxis: {
                            type: 'datetime',
                            labels: {
                                rotation: -45
                            }
                        },

                        yAxis: {

                            categories: _.pluck(tasks, 'name'),
                            tickInterval: 1,
                            tickPixelInterval: 200,
                            labels: {
                                style: {
                                    color: '#525151',
                                    font: '12px Helvetica',
                                    fontWeight: 'bold'
                                }

                            },
                            startOnTick: false,
                            endOnTick: false,
                            title: {
                                text: 'Elements'
                            },
                            minPadding: 0.2,
                            maxPadding: 0.2,
                            fontSize: '15px'

                        },

                        legend: {
                            enabled: false
                        },
                        tooltip: {
                            formatter: function () {
                                var thisObj = this;
                                var vals = [];
                                var html = '<b>' + tasks[this.y].name + '</b><br/>' +
                                    Highcharts.dateFormat('%H:%M:%S.%L', this.point.options.from) +
                                    ' <b> - </b>' + Highcharts.dateFormat(' %H:%M:%S.%L', this.point.options.to);

                                return html;
                            }
                        },

                        plotOptions: {
                            line: {
                                animation: false,
                                lineWidth: 10,
                                marker: {
                                    enabled: false
                                },
                                dataLabels: {
                                    enabled: false
                                }
                            }
                        },

                        series: series

                    });
                    console.log(chart1);
                }


                /*region ui-select infinity methods*/
                var loadingItem = 'loading',
                    hasNextChunk = true,
                    queryString = '';
                $scope.collections = [];
                function addLoadingStateItem() {
                    $scope.collections.push(loadingItem);
                }

                function removeLoadingStateItem() {
                    var index = $scope.collections.indexOf(loadingItem);
                    if (index < 0) {
                        return;
                    }

                    $scope.collections.splice(index, 1);
                }


                $scope.isItemMatch = function ($select) {
                };

                $scope.requestMoreItems = function () {
                    if ($scope.isRequestMoreItems || !hasNextChunk) {
                        return $q.reject();
                    }
                    console.log("hello");
                    addLoadingStateItem();
                    $scope.isRequestMoreItems = true;
                    getParam = "";
                    getParam += "?nextId="+$scope.nextJobNameId;
                    getParam += user.usertype == 2 ? "&owner=" + user.username : "";
                    return ($http.get('/api/getJobsName' + getParam).then(function (response) {
                        $scope.jobNames = response.data.data;
                        $scope.nextJobNameId = response.data.nextId;
                        if($scope.nextJobNameId==-1)
                            hasNextChunk = false;
                        return response.data.data;
                    }).catch(function (err) {
                        return $q.reject(err);
                    }).finally(function () {
                        removeLoadingStateItem();
                        $scope.isRequestMoreItems = false;
                    }));
                    // return getInfinityScrollChunk(nextChunkId)
                    //     .then(function (newItems) {
                    //         nextChunkId = newItems.nextId;
                    //         $scope.items = $scope.items.concat($scope.newItems.items);
                    //         return newItems;
                    //     }, function (err) {
                    //         return $q.reject(err);
                    //     })
                    //     .finally(function () {
                    //         removeLoadingStateItem();
                    //         $scope.isRequestMoreItems = false;
                    //     });
                };

                $scope.refreshList = function (query) {
                    queryString = query;
                };
                $scope.onOpenClose = function(isOpen){
                  console.log("OPenClose:"+isOpen)
                };

                /*endregion*/

            }]);


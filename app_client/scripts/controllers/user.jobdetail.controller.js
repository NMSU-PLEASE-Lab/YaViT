'use strict';
/**
 * @ngdoc function
 * @name hpcMonitoringApp.controller:userJobDetailCtrl
 * @description
 * Controller for handling job detail page in user side
 */

angular.module('hpcMonitoringApp')

    .controller('userJobDetailCtrl',
        ['$scope', '$location', 'authentication', '$http', '$stateParams', '$q', '$httpParamSerializer',
            function ($scope, $location, authentication, $http, $stateParams, $q, $httpParamSerializer) {

                var user = authentication.currentUser();
                if (user.usertype == 1)
                    $location.path("/admin/home");
                Highcharts.setOptions({global: {useUTC: false}});

                /*variables initialization*/
                $scope.currentJob = {};
                $scope.jobsList = [];
                $scope.currentJobName = {};
                $scope.jobNameList = [];
                $scope.currentJobDetail = {};

                $scope.metricsSelectorOptions = [];
                $scope.metricsSelectorOptionsOutput = [];
                $scope.metricsValueModel = [];

                $scope.nodesSelectorOptions = [];
                $scope.nodesSelectorOptionsOutput = [];

                $scope.selectedMetricsValueOptions = [];
                $scope.selectedMetricsValueOptionsOutput = [];

                $scope.selectedProcessIds = [];
                $scope.selectedProcessIdsOutput = [];
                $scope.selectedMetricsCursors = [];
                $scope.processIds = {};
                $scope.selectedChartType = [];

                $scope.currentJobId = 0;
                if (typeof $stateParams.jobId !== 'undefined' && $stateParams.jobId !== '') {
                    $scope.currentJobId = $stateParams.jobId;
                }


                $scope.showEventChart = false;
                $scope.eventsMetadata = [];
                $scope.eventCursor = [];

                /*Get metrics schema on controller initialization */
                $http.get('/api/getMetricsSchema').then(function (response) {
                    $scope.metricsSchema = response.data;
                    $http.get('/api/getJobMetricsSchema?jobId=' + $scope.currentJobId).then(function (resp) {
                        $scope.metricsSchema = $scope.metricsSchema.concat(resp.data);
                        $http.get('/api/getProcessIds?type=spapi&jobId=' + $scope.currentJobId).then(function (resp) {
                            $scope.processIds = resp.data;
                            $http.get('/api/getEventsMetadata?jobId=' + $scope.currentJobId).then(function (response) {
                                $scope.eventsMetadata = response.data;
                                if (response.data.length > 0)
                                    $scope.showEventChart = true;
                                getJobAndEventData();
                            }).catch(function (err) {
                                console.log(err);
                            });
                        });


                    });


                }).catch(function (err) {
                    console.log(err);
                });


                function getJobAndEventData() {
                    $scope.selectedMetricsValueOptions = [];
                    $scope.selectedMetricsValueOptionsOutput = [];

                    $scope.selectedProcessIds = [];
                    $scope.selectedProcessIdsOutput = [];

                    $scope.selectedChartType = [];

                    $scope.nodesSelectorOptions = [];
                    $scope.nodesSelectorOptionsOutput = [];

                    var queryParamsUrl = '';
                    queryParamsUrl += '?jobId=' + $scope.currentJobId;

                    $http.get('/api/getJobById' + queryParamsUrl).then(function (response) {
                        $scope.currentJobDetail = response.data;
                        console.log($scope.currentJobDetail);
                        $scope.currentJobDetail.queue_time_formatted = moment.unix($scope.currentJobDetail.queue_time).format("YYYY-MM-DD hh:mm:ss");
                        $scope.currentJobDetail.start_time_formatted = moment.unix($scope.currentJobDetail.start_time).format("YYYY-MM-DD hh:mm:ss");
                        if (typeof $scope.currentJobDetail.end_time === 'undefined') {
                            $scope.currentJobDetail.end_time = '';
                            $scope.currentJobDetail.end_time_formatted = moment.unix($scope.currentJobDetail.end_time).format("YYYY-MM-DD hh:mm:ss");

                        }
                        else
                            $scope.currentJobDetail.end_time_formatted = moment.unix($scope.currentJobDetail.end_time).format("YYYY-MM-DD hh:mm:ss");
                        if (typeof $scope.currentJobDetail.metrices === "undefined" || $scope.currentJobDetail.metrices.length === 0)
                            for (var i = 0; i < $scope.metricsSchema.length; i++) {
                                $scope.metricsSelectorOptions.push({name: $scope.metricsSchema[i].name, ticked: false});
                            }
                        else
                            for (var i = 0; i < $scope.currentJobDetail.metrices.length; i++) {
                                $scope.metricsSelectorOptions.push({
                                    name: $scope.currentJobDetail.metrices[i],
                                    ticked: false
                                });
                            }

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

                            $scope.selectedProcessIds[$scope.currentJobDetail.nodes[i].Name] = [];
                            $scope.selectedProcessIdsOutput[$scope.currentJobDetail.nodes[i].Name] = [];
                            var thisNode = _.find($scope.processIds,function (obj) {
                                return obj._id === $scope.currentJobDetail.nodes[i]._id;
                            });
                            for (var l = 0; l < thisNode.ProcessIds.length; l++){
                                if(thisNode.ProcessIds[l]===0)
                                    continue;
                                $scope.selectedProcessIds[$scope.currentJobDetail.nodes[i].Name].push({
                                    name: thisNode.ProcessIds[l],
                                    ticked: false
                                });
                            }

                            $scope.selectedChartType[$scope.currentJobDetail.nodes[i]._id] = {};

                            for (var j = 0; j < $scope.metricsSchema.length; j++) {
                                var keys = Object.keys($scope.metricsSchema[j].structure);
                                $scope.selectedMetricsValueOptions[$scope.currentJobDetail.nodes[i].Name][$scope.metricsSchema[j].name] = [];
                                $scope.selectedMetricsValueOptionsOutput[$scope.currentJobDetail.nodes[i].Name][$scope.metricsSchema[j].name] = [];

                                $scope.selectedChartType[$scope.currentJobDetail.nodes[i]._id][$scope.metricsSchema[j].name] = "Line";
                                for (var k = 0; k < keys.length; k++)
                                    if (!(keys[k] in $scope.metricsSchema[j].non_metric_fields))
                                        $scope.selectedMetricsValueOptions[$scope.currentJobDetail.nodes[i].Name][$scope.metricsSchema[j].name].push({
                                            name: keys[k],
                                            ticked: false
                                        });
                            }

                        }

                        InitializeDateTimeSlider();

                    }).catch(function (err) {
                        console.log(err);
                    });


                    //for eventCharts
                    if ($scope.eventsMetadata.length === 0)
                        return;
                    var eventModes = ["DUAL"];
                    eventModes.forEach(function (mode) {
                        var getObj = {};
                        getObj.jobId = $scope.currentJobId;
                        getObj.eventMode = mode;
                        getObj.count = 1000;
                        getObj.metadata = {};
                        getObj.metadata.first_cursor = _.find($scope.eventsMetadata, function (item) {
                            return item._id == mode;
                        }).first_cursor;
                        getObj.metadata.last_cursor = _.find($scope.eventsMetadata, function (item) {
                            return item._id == mode;
                        }).last_cursor;
                        var param = JSON.stringify(getObj);

                        $http({
                            method: 'GET',
                            url: '/api/getEventsData',
                            params: {
                                filters: param
                            }
                        }).then((function (eventMode) {
                                return function (response) {
                                    DrawEventsChart(response.data.data, eventMode.toLowerCase());
                                }
                            })(angular.copy(mode))
                        ).catch(function (err) {
                            console.log(err);
                        });
                    });
                }

                function InitializeDateTimeSlider() {

                    $scope.dateTimeSlider = {
                        minValue: $scope.currentJobDetail.start_time,
                        maxValue: $scope.currentJobDetail.end_time,
                        options: {
                            floor: $scope.currentJobDetail.start_time,
                            ceil: $scope.currentJobDetail.end_time,
                            translate: function (value) {
                                return moment.unix(value).format("YYYY-MM-DD HH:mm:ss");
                            },
                            onEnd: function () {
                                $scope.nodesSelectorOptionsOutput.forEach(function (x) {
                                    $scope.metricsSelectorOptionsOutput.forEach(function (y) {
                                        var containerId = y.name + "-chart-container-node-" + x.value;
                                        if (typeof $("#" + containerId).highcharts() !== 'undefined') {
                                            console.log();
                                            var chart = $("#" + containerId).highcharts();
                                            chart.xAxis[0].setExtremes($scope.dateTimeSlider.minValue * 1000,
                                                $scope.dateTimeSlider.maxValue * 1000);
                                        }
                                    });
                                });

                            }
                        }
                    };
                }

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


                $scope.chartTypeChange = function (metricName, node) {
                    var chartId = metricName + "-chart-container-node-" + node.value;
                    if (typeof $("#" + chartId).highcharts() !== 'undefined') {
                        typeof $("#" + chartId).highcharts().destroy();
                    }
                    GetDataAndDrawChart(undefined, {"metricName": metricName, "nodeId": node.value});
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

                /*Definitions for events charts: Dual, Heartbeat, Singular etc*/
                $scope.dualEventsChart = {};
                $scope.dualEventsChart.type = "BarChart";

                function GetDataAndDrawChart(singleChartData) {
                    var getObj = {};
                    getObj.dateFrom = $scope.currentJobDetail.start_time * 1000;
                    getObj.dateTo = $scope.currentJobDetail.end_time != 0 ? $scope.currentJobDetail.end_time * 1000 : moment().valueOf();
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

                                if (typeof ($("#" + chartContainerId).highcharts()) !== 'undefined')
                                    continue;
                                getObj.metricValue = metricValues[k];
                                var url = "";
                                if (getObj.type === 'spapi') {

                                    getObj.processId = $scope.selectedProcessIdsOutput[$scope.nodesSelectorOptionsOutput[i].name][0].name;
                                    console.log(getObj.processId);
                                    getObj.jobId = $scope.currentJobId;
                                    url = '/api/getJobMetricsData';
                                }
                                else
                                    url = '/api/getMetricsData';


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
                                            DrawMetricsChart(chartContainerId, response.data.data, getObj.type, getObj.nodeId, getObj.metricValue, metricValues.length, $scope);
                                        }
                                    })(JSON.stringify(getObj), chartContainerId)
                                ).catch(function (err) {
                                    console.log(err);
                                }));


                            }
                        }
                    }
                    $q.all(urlCalls).then(function () {

                    });
                    // }

                }


                function DrawMetricsChart(containerId, data, chartType, nodeId, metricValue, noOfMetricValues, $scope) {
                    // Add a null value for the end date
                    data = [].concat(data, [[$scope.currentJobDetail.end_time != 0 ? $scope.currentJobDetail.end_time * 1000 : moment().valueOf(), null, null, null, null]]);

                    var seriesHeight = 100 / noOfMetricValues;
                    var series = {};
                    var tooltip = {};
                    if ($scope.selectedChartType[nodeId][chartType] == "Line") {
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
                    }
                    else if ($scope.selectedChartType[nodeId][chartType] == "Scatter") {
                        series = {
                            type: 'scatter',
                            // color: 'rgba(150, 83, 83, .5)',
                            id: metricValue + "-series",
                            name: metricValue,
                            data: data,
                            yAxis: metricValue

                        };
                        tooltip = {
                            formatter: function () {
                                return '<b>' + this.series.name + '</b>:' + this.y + '<br/>' +
                                    moment(this.x).format("dddd, MMM DD, HH:mm:ss.SSS");
                            }
                        };
                    }

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
                            chart.addSeries(series);
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
                            buttons: [
                                {
                                    type: 'minute',
                                    count: 5,
                                    text: '5m'
                                }, {
                                    type: 'hour',
                                    count: 1,
                                    text: '1h'
                                }, {
                                    type: 'day',
                                    count: 1,
                                    text: '1d'
                                }, {
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
                            height: 50,
                            xAxis: {
                                labels: {
                                    format: '{value:%b %d, %H:%M}'
                                }
                            },
                            series: {}
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
                            labels: {
                                format: '{value:%H:%M}'
                            },
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

                function DrawEventsChart(eventdata, mode) {

                    var eventChartDash = new google.visualization.Dashboard(
                        document.getElementById('event-dashboard-' + mode));

                    var eventChartControl = new google.visualization.ControlWrapper({
                        'controlType': 'ChartRangeFilter',
                        'containerId': 'event-control-' + mode,
                        'options': {
                            // Filter by the date axis.
                            'filterColumnIndex': 3,
                            'ui': {
                                'minRangeSize': 1,
                                'chartType': 'LineChart',
                                'chartOptions': {
                                    'width': '80%',
                                    'height': 50,
                                    'chartArea': {
                                        width: '60%',
                                        height: '90%'
                                    },
                                    'hAxis': {
                                        'baselineColor': 'none'
                                    }
                                },
                                'chartView': {
                                    'columns': [3, 4]
                                }
                            }
                        }

                    });


                    var eventChart = new google.visualization.ChartWrapper({
                        'chartType': 'Timeline',
                        'containerId': 'event-chart-' + mode,
                        'options': {
                            'width': '50%',
                            'height': 350,
                            'chartArea': {
                                width: '60%',
                                height: 350
                            },
                            hAxis: {
                                format: 'HH:mm:ss'
                            }
                        },
                        'view': {
                            'columns': [0, 1, 2, 3, 4]
                        }


                    });

                    var eventChartData = new google.visualization.DataTable();
                    eventChartData.addColumn({
                        type: 'string',
                        id: 'JobName'
                    });
                    eventChartData.addColumn({
                        type: 'string',
                        id: 'Rank'
                    });
                    eventChartData.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});

                    eventChartData.addColumn({
                        type: 'date',
                        id: 'Start'
                    });
                    eventChartData.addColumn({
                        type: 'date',
                        id: 'End'
                    });
                    var rowData = [];
                    var tooltipString = "<div style='padding: 5px;font-size: 14px;min-width:200px;'><strong>@eventName</strong><br/>" +
                        "Rank: @rank <br/>" +
                        "Node: @node <br/>" +
                        "Begin: @begin <br/>" +
                        "End: @end <br/>" +
                        "Duration: @duration <br/>" +
                        "</div>";
                    for (var i = 0; i < eventdata.length; i++) {

                        if (typeof eventdata[i].eventTime !== 'undefined') {
                            var row = [];
                            row[0] = eventdata[i].eventName;
                            row[1] = eventdata[i].rank + '';
                            row[2] = tooltipString
                                .replace("@eventName", eventdata[i].eventName)
                                .replace("@rank", eventdata[i].rank)
                                .replace("@node", eventdata[i].NodeId)
                                .replace("@begin", moment(eventdata[i].eventTime.begin).format('MMM DD, HH:mm:ss.SSS'));


                            row[3] = new Date(eventdata[i].eventTime.begin);
                            if (eventdata[i].eventTime.end == -1) {
                                row[4] = new Date(eventdata[i].eventTime.begin + 1);
                                row[2] = row[2].replace("@end", "").replace("@duration", "");
                            }
                            else {
                                row[4] = new Date(eventdata[i].eventTime.end);
                                row[2] = row[2].replace("@end", moment(eventdata[i].eventTime.end).format('MMM DD, HH:mm:ss.SSS'))
                                    .replace("@duration", ((eventdata[i].eventTime.end - eventdata[i].eventTime.begin) / 1000) + " s");
                            }
                            rowData.push(row);
                        }

                    }
                    var options = {
                        tooltip: {isHtml: true}
                    };
                    google.visualization.events.addListener(eventChartDash, 'error', function (error) {
                        google.visualization.errors.removeError(error.id);
                    });

                    google.visualization.events.addListener(eventChartControl, 'error', function (error) {
                        google.visualization.errors.removeError(error.id);
                    });
                    google.visualization.events.addListener(eventChart, 'error', function (error) {
                        google.visualization.errors.removeError(error.id);
                    });
                    eventChartData.addRows(rowData);
                    eventChartDash.bind(eventChartControl, eventChart);
                    eventChartDash.draw(eventChartData, options);

                }


            }]);


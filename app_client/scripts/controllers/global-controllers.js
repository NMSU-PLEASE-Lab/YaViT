var googleChartLoaded = 0;
google.charts.load('current', {'packages':['timeline','controls']});
google.charts.setOnLoadCallback(function () {
    googleChartLoaded = 1;
});


angular.module('hpcMonitoringApp')
    /* This filter is required from angular ui-select
    *  https://angular-ui.github.io/ui-select/
     */
    .filter('propsFilter', function () {
        return function (items, props) {
            var out = [];

            if (angular.isArray(items)) {
                var keys = Object.keys(props);

                items.forEach(function (item) {
                    var itemMatches = false;

                    for (var i = 0; i < keys.length; i++) {
                        var prop = keys[i];
                        var text = props[prop].toLowerCase();
                        if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
                            itemMatches = true;
                            break;
                        }
                    }

                    if (itemMatches) {
                        out.push(item);
                    }
                });
            } else {
                // Let the output be the input untouched
                out = items;
            }

            return out;
        };
    });
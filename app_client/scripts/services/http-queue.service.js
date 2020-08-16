/**
 * HTTP queue for handling methods/events in order
 */
( () => {
    angular
    .module('hpcMonitoringApp')
    .factory('httpQueueService', ['$q', '$http',  ($q, $http) => {
        let queue = [];
        let execNext =  () => {
            let task = queue[0];
            $http(task.c).then( (data) => {
                queue.shift();
                task.d.resolve(data);
                if (queue.length > 0) execNext();
            }).catch((err) =>{
                console.log(err);
                if (queue.length > 0) execNext();
            });
        };
        return  (config) => {
            let d = $q.defer();
            queue.push({c: config, d: d});
            if (queue.length === 1) execNext();
            return d.promise;
        };
    }]);
})();
/**
 * Socket service for handling socket message passing from server
 */
angular.module('hpcMonitoringApp')
    .factory('socket',['$rootScope', ($rootScope) => {
    let socket = io.connect();
    return {
        on: (eventName, callback) => {
            socket.on(eventName, () => {
                let args = arguments;
                $rootScope.$apply( () => {
                    callback.apply(socket, args);
                });
            });
        },
        emit: (eventName, data, callback) => {
            socket.emit(eventName, data, () => {
                let args = arguments;
                $rootScope.$apply(() => {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
}]);
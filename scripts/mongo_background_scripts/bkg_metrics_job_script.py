import time
import multiprocessing as mp

import pymongo
from datetime import datetime
from pymongo import MongoClient
import logging

import sys

LOG_FILENAME = 'error_log.out'
logging.basicConfig(stream=sys.stderr,
                    level=logging.DEBUG,
                    )
mongoDbUrl = 'mongodb://localhost:27017/'


# get unix milliseconds from python datetime
def unix_time_millis(dt):
    return int(float(dt.strftime("%s.%f")) * 1000)


# for metric collection calculate and insert minutely,hourly and daily averages
def processCollection(name, structure):
    while True:
        childClient = None
        try:
            childClient = MongoClient(mongoDbUrl)
            db = childClient.hpc_monitoring
            mainCollection = db[name]
            minutelyCollection = db[name + '.minutely']
            hourlyCollection = db[name + '.hourly']
            dailyCollection = db[name + '.daily']
            minutelyCollection.create_index([('NodeId', pymongo.ASCENDING), ('Timestamp', pymongo.ASCENDING)],
                                            unique=True)
            hourlyCollection.create_index([('NodeId', pymongo.ASCENDING), ('Timestamp', pymongo.ASCENDING)],
                                          unique=True)
            dailyCollection.create_index([('NodeId', pymongo.ASCENDING), ('Timestamp', pymongo.ASCENDING)], unique=True)

            ''' Check if data exists already'''
            minutelyLastTimestamp = 0
            hourlyLastTimestamp = 0
            dailyLastTimestamp = 0
            for doc in minutelyCollection.find({}, {"Timestamp": 1}).sort('_id', -1).limit(1):
                minutelyLastTimestamp = doc['Timestamp']
            for doc in hourlyCollection.find({}, {"Timestamp": 1}).sort('_id', -1).limit(1):
                hourlyLastTimestamp = doc['Timestamp']
            for doc in hourlyCollection.find({}, {"Timestamp": 1}).sort('_id', -1).limit(1):
                dailyLastTimestamp = doc['Timestamp']

            minutelySum = {}
            minutelyCount = {}

            hourlySum = {}
            hourlyCount = {}

            dailySum = {}
            dailyCount = {}

            currentMinute = 0  # 0 means start of new minute
            currentHour = 0  # 0 means start of new hour
            currentDay = 0  # 0 means start of new day

            # filter query
            filter = {}
            if dailyLastTimestamp != 0:
                filter = {"Timestamp": {'$gte': dailyLastTimestamp}}
            elif hourlyLastTimestamp != 0:
                filter = {"Timestamp": {'$gte': hourlyLastTimestamp}}
            elif minutelyLastTimestamp != 0:
                filter = {"Timestamp": {'$gte': minutelyLastTimestamp}}

            # bulk update for decreasing network roundtrips and increasing throughput
            # bulkUpdateMinutelyCollection = minutelyCollection.initialize_ordered_bulk_op()

            # counter = 0
            # if record already exists modify filter query to fetch newer records only
            for document in mainCollection.find(filter).sort('Timestamp', 1):
                runningDate = datetime.fromtimestamp(document['Timestamp'] / 1000.0)

                '''Minute Record Processing'''
                if document['Timestamp'] >= minutelyLastTimestamp:
                    # process record for minutely average
                    # initialize all fields count and sum to 0 if not initialised
                    if document['NodeId'] not in minutelySum:
                        minutelySum[document['NodeId']] = {}
                        minutelyCount[document['NodeId']] = 0
                        for field in structure:
                            minutelySum[document['NodeId']][field] = 0
                    runningMinute = datetime(runningDate.year, runningDate.month, runningDate.day,
                                                      runningDate.hour,
                                                      runningDate.minute)
                    if currentMinute == 0:
                        currentMinute = runningMinute

                    # insert averageData to minutely collection
                    if runningMinute != currentMinute:
                        for node in minutelySum:
                            if minutelyCount[node] <> 0:
                                minuteDoc = {}
                                minuteDoc['NodeId'] = node
                                minuteDoc['Timestamp'] = unix_time_millis(currentMinute)
                                for field in minutelySum[node]:
                                    if structure[field] == 'double':
                                        minuteDoc[field] = minutelySum[node][field] / minutelyCount[node]
                                    else:
                                        minuteDoc[field] = int(minutelySum[node][field] / minutelyCount[node])
                                try:
                                    # counter += 1
                                    minutelyCollection.insert_one(minuteDoc)
                                    # if counter % 100 == 0:
                                    #     bulkUpdateMinutelyCollection.execute()
                                    #     bulkUpdateMinutelyCollection = minutelyCollection.initialize_ordered_bulk_op()
                                except BaseException as e:
                                    pass

                        minutelySum = {}
                        minutelyCount = {}
                        minutelySum[document['NodeId']] = {}
                        minutelyCount[document['NodeId']] = 0
                        for field in structure:
                            minutelySum[document['NodeId']][field] = 0
                        currentMinute = runningMinute

                    # in either case update minutelyCount and minutely sum
                    minutelyCount[document['NodeId']] += 1
                    for field in structure:
                        if field in document:
                            minutelySum[document['NodeId']][field] += document[field]

                '''Hour Record Processing'''
                if document['Timestamp'] >= hourlyLastTimestamp:
                    # process record for hourly average
                    # initialize all fields count and sum to 0 if not initialised
                    if document['NodeId'] not in hourlySum:
                        hourlySum[document['NodeId']] = {}
                        hourlyCount[document['NodeId']] = 0
                        for field in structure:
                            hourlySum[document['NodeId']][field] = 0
                    runningHour = datetime(runningDate.year, runningDate.month, runningDate.day,
                                                    runningDate.hour)
                    if currentHour == 0:
                        currentHour = runningHour

                    # insert averageData to hourly collection
                    if runningHour != currentHour:
                        for node in hourlySum:
                            if hourlyCount[node] != 0:
                                hourDoc = {}
                                hourDoc['NodeId'] = node
                                hourDoc['Timestamp'] = unix_time_millis(currentHour)
                                for field in hourlySum[node]:
                                    if structure[field] == 'double':
                                        hourDoc[field] = hourlySum[node][field] / hourlyCount[node]
                                    else:
                                        hourDoc[field] = int(hourlySum[node][field] / hourlyCount[node])
                                try:
                                    hourlyCollection.insert_one(hourDoc)
                                except:
                                    pass

                        hourlySum = {}
                        hourlyCount = {}
                        hourlySum[document['NodeId']] = {}
                        hourlyCount[document['NodeId']] = 0
                        for field in structure:
                            hourlySum[document['NodeId']][field] = 0
                        currentHour = runningHour

                    # in either case update hourlyCount and hourly sum
                    hourlyCount[document['NodeId']] += 1
                    for field in structure:
                        if field in document:
                            hourlySum[document['NodeId']][field] += document[field]

                '''Daily Record Processing
                 If condition not needed for daily because it is already filtered'''
                # process record for daily average
                # initialize all fields count and sum to 0 if not initialised
                if document['NodeId'] not in dailySum:
                    dailySum[document['NodeId']] = {}
                    dailyCount[document['NodeId']] = 0
                    for field in structure:
                        dailySum[document['NodeId']][field] = 0
                runningDay = datetime(runningDate.year, runningDate.month, runningDate.day)
                if currentDay == 0:
                    currentDay = runningDay

                # insert averageData to daily collection
                if runningDay != currentDay:
                    for node in dailySum:
                        if dailyCount[node] != 0:
                            dayDoc = {}
                            dayDoc['NodeId'] = node
                            dayDoc['Timestamp'] = unix_time_millis(currentDay)
                            for field in dailySum[node]:
                                if structure[field] == 'double':
                                    dayDoc[field] = dailySum[node][field] / dailyCount[node]
                                else:
                                    dayDoc[field] = int(dailySum[node][field] / dailyCount[node])
                            try:
                                dailyCollection.insert_one(dayDoc)
                            except:
                                pass

                    dailySum = {}
                    dailyCount = {}
                    dailySum[document['NodeId']] = {}
                    dailyCount[document['NodeId']] = 0
                    for field in structure:
                        dailySum[document['NodeId']][field] = 0
                    currentDay = runningDay

                # in either case update dailyCount and daily sum
                dailyCount[document['NodeId']] += 1
                for field in structure:
                    if field in document:
                        dailySum[document['NodeId']][field] += document[field]
            # if counter % 100 != 0:
            #     bulkUpdateMinutelyCollection.execute()

        except BaseException as e:
            logging.error(datetime.now().strftime('%Y-%m-%d %H:%M:%S') + " : " + str(e))
        finally:
            childClient.close()
            time.sleep(90)


def jobMetricsChecker():
    while True:
        client = None
        try:
            client = MongoClient(mongoDbUrl)
            db = client.hpc_monitoring
            metricesNames = []
            schemaCollection = db.schema

            # get all metrics name from schema
            metricSchemas = schemaCollection.find({'type': 'metrics'})
            for metric in metricSchemas:
                metricesNames.append(metric['name'])

            jobCollection = db.job

            # bulk update for faster update operation
            # bulkUpdateJob = jobCollection.initialize_ordered_bulk_op()

            counter = 0
            for document in jobCollection.find({'or':[{"metrices":{'$exists':False}},{"end_time":{'$exists':False}}]}).sort('_id', 1):
                existingMetrics = []

                # process job if starting is greater than 0
                if document['start_time'] > 0:
                    # for each metric check if metrics data exists for current job
                    start_time_milli = document['start_time']*1000
                    end_time_milli = document['end_time']*1000 if document['end_time']<>0 else 3165539199849 #millisecods for year 2070
                    for metric in metricesNames:
                        if db[metric].find_one({'Timestamp': {'$gte': start_time_milli,'$lte':end_time_milli}}):
                            existingMetrics.append(metric)

                # update job by adding/updating metrices field
                jobCollection.update_one({'_id': document['_id']},{'$set': {'metrices': existingMetrics}},upsert=False)

                # counter += 1
                # if counter % 100 == 0:
                #     bulkUpdateJob.execute()
                #     bulkUpdateJob = jobCollection.initialize_ordered_bulk_op()
            # if counter % 100 != 0:
            #     bulkUpdateJob.execute()
        except BaseException as e:
            logging.error(datetime.now().strftime('%Y-%m-%d %H:%M:%S') + " : " + str(e))
        finally:
            client.close()
            time.sleep(90)


# for metric collection calculate and insert minutely,hourly and daily averages
if __name__ == '__main__':
    # Separately process each metrics using process
    metricProcesses = {}
    jobProcess = None

    while True:

        # connect to mongodb and get metricnames from schema collection
        parentClient = MongoClient(mongoDbUrl)
        schema = {}
        try:
            hpcDB = parentClient.hpc_monitoring
            schemaCollection = hpcDB.schema
            metricSchemas = schemaCollection.find({'type': 'metrics'})
            for metric in metricSchemas:
                structure = metric['structure']
                for key in metric['non_metric_fields']:
                    structure.pop(key, None)
                schema[metric['name']] = structure
            # Close mongo client
            parentClient.close()

            # Create processes for metric collection
            for metric in schema:
                # if the process doesnot exist for metrics or it is killed
                if metric not in metricProcesses or (not (metricProcesses[metric].is_alive())):
                    metricProcesses[metric] = mp.Process(target=processCollection, args=(metric, schema[metric]))
                    metricProcesses[metric].start()

            # Create process to check what metrics exist for all jobs
            if jobProcess is None or (not (jobProcess.is_alive())):
                jobProcess = mp.Process(target=jobMetricsChecker())
                jobProcess.start()

        except BaseException  as e:
            logging.error(datetime.now().strftime('%Y-%m-%d %H:%M:%S')+" : "+str(e))

        finally:
            parentClient.close()
            time.sleep(60 * 10)  # sleep 10 minutes

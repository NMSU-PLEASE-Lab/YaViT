import time
import multiprocessing as mp

import pymongo
from datetime import datetime, timedelta
from pymongo import MongoClient
import logging

import sys

logging.basicConfig(stream=sys.stderr,
                    level=logging.DEBUG,
                    )
MONGO_DB_URL = 'mongodb://localhost:27017/'
DATABASE_NAME = 'hpc_monitoring'
EPOCH_BEGIN_DATETIME = datetime.fromtimestamp(0)


# get unix milliseconds from python datetime
def unix_time_millis(dt):
    return int(float(dt.strftime("%s.%f")) * 1000)


# 1. for metric collection calculate and insert minutely,hourly and daily averages
def processCollection(name, structure):
    while True:
        childClient = None
        try:
            childClient = MongoClient(MONGO_DB_URL)
            db = childClient[DATABASE_NAME]
            mainCollection = db[name]
            minutelyCollection = db[name + '.minutely']
            hourlyCollection = db[name + '.hourly']
            dailyCollection = db[name + '.daily']
            # Make sure these indexes exist for faster quering purposes
            minutelyCollection.create_index([('NodeId', pymongo.ASCENDING), ('Timestamp', pymongo.ASCENDING)],
                                            background=True,
                                            unique=True)
            minutelyCollection.create_index([('Timestamp', pymongo.ASCENDING)])

            hourlyCollection.create_index([('NodeId', pymongo.ASCENDING), ('Timestamp', pymongo.ASCENDING)],
                                          background=True,
                                          unique=True)
            hourlyCollection.create_index([('Timestamp', pymongo.ASCENDING)])

            dailyCollection.create_index([('NodeId', pymongo.ASCENDING), ('Timestamp', pymongo.ASCENDING)],
                                         background=True,
                                         unique=True)
            dailyCollection.create_index([('Timestamp', pymongo.ASCENDING)], background=True)
            mainCollection.create_index([('Timestamp', pymongo.ASCENDING)], background=True)

            ''' Check if data exists already'''
            minutelyLastTimestamp = 0
            hourlyLastTimestamp = 0
            dailyLastTimestamp = 0

            '''Variable to check whether to Process Daily or hourly records in current loop'''
            processMinutely = False
            processHourly = False

            # The daily and hourly averages should be calculated only at beginning of next day
            # or begnning of next hour so define variables which store dayValue and hourValue of
            # last minuteTimestamp
            minutelyLastTimestampDayValue = 0
            minutelyLastTimestampHourValue = 0
            for doc in minutelyCollection.find({}, {"Timestamp": 1}).sort('Timestamp', -1).limit(1):
                minutelyLastTimestamp = doc['Timestamp']
                dateTemp = datetime.fromtimestamp(minutelyLastTimestamp / 1000.0)
                minutelyLastTimestampDayValue = datetime(dateTemp.year, dateTemp.month, dateTemp.day)
                minutelyLastTimestampHourValue = datetime(dateTemp.year, dateTemp.month, dateTemp.day,
                                                          dateTemp.hour)
            for doc in hourlyCollection.find({}, {"Timestamp": 1}).sort('Timestamp', -1).limit(1):
                hourlyLastTimestamp = doc['Timestamp']
            for doc in dailyCollection.find({}, {"Timestamp": 1}).sort('Timestamp', -1).limit(1):
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
            if minutelyLastTimestamp <> 0 and hourlyLastTimestamp <> 0 and dailyLastTimestamp <> 0:
                currentDateTimeTemp = datetime.now()
                todayDate = datetime(currentDateTimeTemp.year, currentDateTimeTemp.month, currentDateTimeTemp.day)
                if todayDate == minutelyLastTimestampDayValue or todayDate == (
                            minutelyLastTimestampDayValue + timedelta(days=1)):
                    if minutelyLastTimestampDayValue > datetime.fromtimestamp(
                                    dailyLastTimestamp / 1000.0):
                        filter = {"Timestamp": {'$gte': dailyLastTimestamp}}
                    elif minutelyLastTimestampHourValue > datetime.fromtimestamp(
                                    hourlyLastTimestamp / 1000.0):
                        filter = {"Timestamp": {'$gte': hourlyLastTimestamp}}
                        processHourly = True
                    else:
                        filter = {"Timestamp": {'$gte': minutelyLastTimestamp}}
                        processMinutely = True
                else:
                    filter = {"Timestamp": {'$gte': dailyLastTimestamp}}

            # if record already exists modify filter query to fetch newer records only
            for document in mainCollection.find(filter).sort('Timestamp', 1):
                runningDate = datetime.fromtimestamp(document['Timestamp'] / 1000.0)

                '''Minute Record Processing'''
                if document['Timestamp'] > minutelyLastTimestamp:
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
                                    minutelyCollection.insert_one(minuteDoc)
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
                if not (processMinutely) and document['Timestamp'] > hourlyLastTimestamp:
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
                                        floatAvg = hourlySum[node][field] / hourlyCount[node]
                                        hourDoc[field] = int(floatAvg)
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

                '''Daily Record Processing'''
                # process record for daily average
                # initialize all fields count and sum to 0 if not initialised
                if not (processMinutely) and not (processHourly):
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


# 2. Check what metrics exist for all jobs and add a field 'metrices' to the job collection
def jobMetricsChecker():
    while True:
        client = None
        try:
            client = MongoClient(MONGO_DB_URL)
            db = client[DATABASE_NAME]
            metricesNames = []
            schemaCollection = db.schema

            # get all metrics name from schema
            metricSchemas = schemaCollection.find({'type': 'metrics'})
            for metric in metricSchemas:
                metricesNames.append(metric['name'])

            jobCollection = db.job

            for document in jobCollection.find(
                    {'or': [{"metrices": {'$exists': False}}, {"end_time": {'$exists': False}}]}).sort('_id', 1):
                existingMetrics = []

                # process job if starting is greater than 0
                if document['start_time'] > 0:
                    # for each metric check if metrics data exists for current job
                    start_time_milli = document['start_time'] * 1000
                    end_time_milli = document['end_time'] * 1000 if document[
                                                                        'end_time'] <> 0 else 3165539199849  # millisecods for year 2070
                    for metric in metricesNames:
                        if db[metric].find_one({'Timestamp': {'$gte': start_time_milli, '$lte': end_time_milli}}):
                            existingMetrics.append(metric)

                # update job by adding/updating metrices field
                jobCollection.update_one({'_id': document['_id']}, {'$set': {'metrices': existingMetrics}},
                                         upsert=False)

        except BaseException as e:
            logging.error(datetime.now().strftime('%Y-%m-%d %H:%M:%S') + " : " + str(e))
        finally:
            client.close()
            time.sleep(90)


# 3. Clear old data
def deleteOldData():
    while True:
        client = None
        try:
            client = MongoClient(MONGO_DB_URL)
            db = client[DATABASE_NAME]
            schemaCollection = db.schema

            # get all metrics name from schema
            metricSchemas = schemaCollection.find({'type': 'metrics'})
            for metric in metricSchemas:
                metricMainCollection = db[metric['name']]
                metricMinutelyCollection = db[metric['name'] + '.minutely']
                metricHourlyCollection = db[metric['name'] + '.hourly']

                # Get timestamp for 90 days ago (for main collection)
                timeBefore90 = unix_time_millis(datetime.now() - timedelta(days=90))

                # delete documents older than 90 days for main collection
                metricMainCollection.delete_many({"Timestamp": {'$lte': timeBefore90}})

                # Get timestamp for 180 days ago (for minutely collection)
                timeBefore180 = unix_time_millis(datetime.now() - timedelta(days=180))

                # delete documents older than 180 days for minutely collection
                metricMinutelyCollection.delete_many({"Timestamp": {'$lte': timeBefore180}})

                # Get timestamp for 365 days ago (for hourly collection)
                timeBefore365 = unix_time_millis(datetime.now() - timedelta(days=365))

                # delete documents older than 365 days for hourly collection
                metricHourlyCollection.delete_many({"Timestamp": {'$lte': timeBefore365}})

        except BaseException as e:
            logging.error(datetime.now().strftime('%Y-%m-%d %H:%M:%S') + " : " + str(e))
        finally:
            client.close()
            time.sleep(300 * 60)  # sleep 5 hour


# 4.1 Create Overview for SPAPI
def processSpapiOverview(schemaName):
    while True:
        childClient = None
        try:
            childClient = MongoClient(MONGO_DB_URL)
            db = childClient[DATABASE_NAME]
            dynamicSchemaCollection = hpcDB.dynamic_schema
            db[schemaName].create_index([('Jobid', pymongo.ASCENDING)], background=True)

            allJobMetrics = dynamicSchemaCollection.find(
                {'$and': [{'name': schemaName}, {'processedOverview': {'$exists': False}}]}).sort(
                '_id', 1)

            for jobMetric in allJobMetrics:
                if 'processedOverview' in jobMetric:
                    continue
                job = db.job.find_one({'_id': jobMetric['Jobid']})
                if not (job and 'end_time' in job and job['end_time'] <> 0):
                    break

                metricFields = jobMetric['structure']
                for metric in metricFields:
                    aggregateResult = db[schemaName].aggregate([
                        {
                            '$match': {'Jobid': jobMetric['Jobid']}
                        },
                        {
                            '$group': {
                                '_id': {'Jobid': '$Jobid', 'NodeId': '$NodeId', 'ProcessId': '$ProcessId'},
                                'avg': {'$avg': '$' + metric},
                                'min': {'$first': '$' + metric},
                                'max': {'$last': '$' + metric}
                            }
                        },

                        {
                            '$project': {
                                '_id': '$_id',
                                '' + metric: {'avg': '$avg', 'min': '$min', 'max': '$max'}
                            }
                        }

                    ])
                    for record in aggregateResult:
                        db[schemaName + '.overview'].update_one({
                            '_id': record['_id']
                        }, {
                            '$set': {
                                metric + '': record[metric]
                            }
                        }, upsert=True)

                '''update dynamic_schema'''
                try:
                    dynamicSchemaCollection.update_one({"$and": [{"name": schemaName}, {"Jobid": jobMetric['Jobid']}]},
                                                       {'$set': {'processedOverview': True}})
                except BaseException as e:
                    pass


        except BaseException as e:
            logging.error(datetime.now().strftime('%Y-%m-%d %H:%M:%S') + " : " + str(e))
        finally:
            childClient.close()
            time.sleep(90)


# 4.2 Averages For SPAPI
def processSpapiCollection(schemaName):
    while True:
        childClient = None
        try:
            childClient = MongoClient(MONGO_DB_URL)
            db = childClient[DATABASE_NAME]
            mainCollection = db[schemaName]
            minutelyCollection = db[schemaName + '.minutely']
            hourlyCollection = db[schemaName + '.hourly']
            # Make sure these indexes exist for faster quering purposes
            minutelyCollection.create_index(
                [('Jobid', pymongo.ASCENDING), ('NodeId', pymongo.ASCENDING), ('ProcessId', pymongo.ASCENDING),
                 ('Timestamp', pymongo.ASCENDING)],
                background=True,
                unique=True)
            minutelyCollection.create_index([('Timestamp', pymongo.ASCENDING)])

            hourlyCollection.create_index(
                [('Jobid', pymongo.ASCENDING), ('NodeId', pymongo.ASCENDING), ('ProcessId', pymongo.ASCENDING),
                 ('Timestamp', pymongo.ASCENDING)],
                background=True,
                unique=True)
            hourlyCollection.create_index([('Timestamp', pymongo.ASCENDING)])

            mainCollection.create_index([('Jobid', pymongo.ASCENDING)], background=True)
            mainCollection.create_index([('Timestamp', pymongo.ASCENDING)], background=True)

            dynamicSchemaCollection = hpcDB.dynamic_schema

            allJobMetrics = dynamicSchemaCollection.find(
                {'$and': [{'name': schemaName}, {'processedMax': {'$exists': False}}]}).sort(
                '_id', 1)

            for jobMetric in allJobMetrics:
                if 'processedMax' in jobMetric:
                    continue
                metricFields = jobMetric['structure']
                for metric in metricFields:
                    aggregateResultMinutely = db[schemaName].aggregate([
                        {
                            '$match': {'Jobid': jobMetric['Jobid']}
                        },
                        {
                            "$group": {
                                "_id": {
                                    "year": {"$year": {"$add": [EPOCH_BEGIN_DATETIME, "$Timestamp"]}},
                                    "month": {"$month": {"$add": [EPOCH_BEGIN_DATETIME, "$Timestamp"]}},
                                    "day": {"$dayOfMonth": {"$add": [EPOCH_BEGIN_DATETIME, "$Timestamp"]}},
                                    "hour": {"$hour": {"$add": [EPOCH_BEGIN_DATETIME, "$Timestamp"]}},
                                    "minute": {"$minute": {"$add": [EPOCH_BEGIN_DATETIME, "$Timestamp"]}},
                                    "Jobid": "$Jobid",
                                    "NodeId": "$NodeId",
                                    "ProcessId": "$ProcessId"

                                },
                                "Timestamp": {"$last": "$Timestamp"},
                                "" + metric: {"$last": "$" + metric}
                            }
                        },

                        {
                            '$project': {
                                'Timestamp': "$Timestamp",
                                '' + metric: "$" + metric
                            }
                        }

                    ])
                    bulkopMinutely = db[schemaName + '.minutely'].initialize_ordered_bulk_op()
                    bulkTracker = 0
                    for record in aggregateResultMinutely:
                        bulkopMinutely.find({
                            '_id': record['_id']
                        }).upsert().update({
                            '$set': {
                                'Timestamp': record['Timestamp'],
                                'Jobid': record['_id']['Jobid'],
                                'NodeId': record['_id']['NodeId'],
                                'ProcessId': record['_id']['ProcessId'],
                                metric + '': record[metric],

                            }
                        })
                        bulkTracker += 1
                        if bulkTracker >= 500:
                            bulkopMinutely.execute()
                            bulkTracker = 0
                            bulkopMinutely = db[schemaName + '.minutely'].initialize_ordered_bulk_op()
                    # check for remaining bulk operations
                    if bulkTracker > 0:
                        bulkopMinutely.execute()

                for metric in metricFields:
                    aggregateResultHourly = db[schemaName + '.minutely'].aggregate([
                        {
                            '$match': {'Jobid': jobMetric['Jobid']}
                        },
                        {
                            "$group": {
                                "_id": {
                                    "year": "$_id.year",
                                    "month": "$_id.month",
                                    "day": "$_id.day",
                                    "hour": "$_id.hour",
                                    "Jobid": "$Jobid",
                                    "NodeId": "$NodeId",
                                    "ProcessId": "$ProcessId"

                                },
                                "Timestamp": {"$last": "$Timestamp"},
                                "" + metric: {"$last": "$" + metric}
                            }
                        },

                        {
                            '$project': {
                                'Timestamp': "$Timestamp",
                                '' + metric: "$" + metric
                            }
                        }

                    ])
                    bulkopHourly = db[schemaName + '.hourly'].initialize_ordered_bulk_op()
                    bulkTracker = 0
                    for record in aggregateResultHourly:
                        bulkopHourly.find({
                            '_id': record['_id']
                        }).upsert().update({
                            '$set': {
                                'Timestamp': record['Timestamp'],
                                'Jobid': record['_id']['Jobid'],
                                'NodeId': record['_id']['NodeId'],
                                'ProcessId': record['_id']['ProcessId'],
                                metric + '': record[metric]

                            }
                        })
                        bulkTracker += 1
                        if bulkTracker >= 500:
                            bulkopHourly.execute()
                            bulkTracker = 0
                            bulkopHourly = db[schemaName + '.hourly'].initialize_ordered_bulk_op()
                    # check for remaining bulk operations
                    if bulkTracker > 0:
                        bulkopHourly.execute()

                '''update dynamic_schema'''
                try:
                    dynamicSchemaCollection.update_one({"$and": [{"name": schemaName}, {"Jobid": jobMetric['Jobid']}]},
                                                       {'$set': {'processedMax': True}})
                except BaseException as e:
                    pass

        except BaseException as e:
            logging.error(datetime.now().strftime('%Y-%m-%d %H:%M:%S') + " : " + str(e))
        finally:
            childClient.close()
            time.sleep(90)


# for metric collection calculate and insert minutely,hourly and daily averages
if __name__ == '__main__':
    # Separately process each metrics using process
    metricProcesses = {}
    dynamicMetricProcesses = {}
    jobProcess = None
    clearOldProcess = None
    parentClient = None

    while True:

        parentClient = None
        schema = {}
        dynamic_schema = []
        try:
            # connect to mongodb and get metricnames from schema collection
            parentClient = MongoClient(MONGO_DB_URL)
            hpcDB = parentClient[DATABASE_NAME]
            schemaCollection = hpcDB.schema
            metricSchemas = schemaCollection.find({'type': 'metrics'})
            for metric in metricSchemas:
                structure = metric['structure']
                for key in metric['non_metric_fields']:
                    structure.pop(key, None)
                schema[metric['name']] = structure

            dynamicSchemaCollection = hpcDB.dynamic_schema
            dynamicSchemas = dynamicSchemaCollection.distinct("name")
            for dynamicSchema in dynamicSchemas:
                dynamic_schema.append(dynamicSchema)

            # Close mongoclient before forking to subprocess
            parentClient.close()

            # 1. Create processes for all metrics in schema collection (to calculate periodic averages)
            for metric in schema:
                # if the process doesnot exist for metrics or it is killed
                if metric not in metricProcesses or (not (metricProcesses[metric].is_alive())):
                    metricProcesses[metric] = mp.Process(target=processCollection, args=(metric, schema[metric]))
                    metricProcesses[metric].start()

            #2. Create process to check what metrics exist for all jobs
            if jobProcess is None or (not (jobProcess.is_alive())):
                jobProcess = mp.Process(target=jobMetricsChecker)
                jobProcess.start()

            # 3. Create process to clear the old data
            if clearOldProcess is None or (not (clearOldProcess.is_alive())):
                clearOldProcess = mp.Process(target=deleteOldData)
                clearOldProcess.start()

            # 4. Create processes for metrics in dynamic_schema collection
            for schemaName in dynamic_schema:

                if schemaName == 'spapi':
                    if schemaName + ".overview" not in dynamicMetricProcesses or (
                            not (dynamicMetricProcesses[schemaName + ".overview"].is_alive())):
                        dynamicMetricProcesses[schemaName + ".overview"] = mp.Process(target=processSpapiOverview,
                                                                                      args=(schemaName,))
                    dynamicMetricProcesses[schemaName + ".overview"].start()

                    if schemaName not in dynamicMetricProcesses or (
                            not (dynamicMetricProcesses[schemaName].is_alive())):
                        dynamicMetricProcesses[schemaName] = mp.Process(target=processSpapiCollection,
                                                                        args=(schemaName,))
                        dynamicMetricProcesses[schemaName].start()

        except BaseException  as e:
            logging.error(datetime.now().strftime('%Y-%m-%d %H:%M:%S') + " : " + str(e))

        finally:
            time.sleep(60 * 10)  # sleep 10 minutes

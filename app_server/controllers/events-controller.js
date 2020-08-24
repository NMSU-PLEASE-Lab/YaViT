/**
 * Controller for handling all 'events' requests
 */
const mongoose  = require('mongoose');
const cursor    = require('../models/cursor');
const _         = require('underscore');
let appevent    = mongoose.model('appevent', {}, 'appevent');

/**
 * Get events metadata for a job (id, first and last position) in Advance
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getEventsMetaData = (req, res) => {
    appevent
    .aggregate([
        {$match: {job_id: parseInt(req.query.jobId)}},
        {
            "$group": {
                "_id": '$eventMode',
                "first_cursor": {
                    "$min": "$_id"
                },
                "last_cursor": {
                    "$max": "$_id"
                }
            }
        }
    ])
    .exec((err, metadata) => {
        if (err)
            res.send(err);

        res.json(metadata.map((item) => {
            return {
                _id: item._id,
                first_cursor: item.first_cursor.toString(),
                last_cursor: item.last_cursor.toString()
            }
        }));
    })
};

/**
 * Get events data by events mode for events chart
 * @param req - HTTP request
 * @param res - HTTP response
 */
module.exports.getEventsData = (req, res) => {
    let requestObj = JSON.parse(req.query.filters);

    let filterObj = {};

    filterObj["NodeId"] = 1;
    filterObj["rank"] = 1;
    filterObj["eventName"] = 1;
    filterObj["eventTime"] = 1;
    filterObj["time_msec"] = 1;

    let queryObj = {};

    queryObj.job_id = parseInt(requestObj.jobId);
    queryObj.eventMode = requestObj.eventMode;

    let cursorResponse = new cursor.cursorResponse();
    let requestCursor = requestObj.cursor;
    let sortOrder = 1;

    if (typeof requestCursor === "undefined") {
        queryObj._id = {
            $gte: new mongoose.mongo.ObjectId(requestObj.metadata.first_cursor)
        };
    } else if (!requestCursor.startsWith("-")) {
        queryObj._id = {
            $gt: new mongoose.mongo.ObjectId(requestCursor)
        };
    } else {
        queryObj._id = {
            $lt: new mongoose.mongo.ObjectId(requestCursor.substring(1))
        };
        sortOrder = -1;
    }

    appevent
    .find(queryObj,filterObj)
    .sort({_id: sortOrder})
    .limit(requestObj.count)
    .lean()
    .exec((err, data) => {
        if (err)
            res.send(err);
        if (sortOrder == -1)
            data.reverse();

        cursorResponse.prev_cursor = data[0]._id.toString();
        cursorResponse.next_cursor = data[data.length - 1]._id.toString();
        cursorResponse.first_cursor = requestObj.metadata.first_cursor;
        cursorResponse.last_cursor = requestObj.metadata.last_cursor;

        if (cursorResponse.prev_cursor == cursorResponse.first_cursor)
            cursorResponse.prev_cursor = 0;

        if (cursorResponse.next_cursor == cursorResponse.last_cursor)
            cursorResponse.next_cursor = 0;

        let resp = {};

        resp.cursor = cursorResponse;

        resp.data = _.sortBy(data, (obj) => {
            return obj.eventName;
        });

        return res.status(200).json(resp);
    });
};

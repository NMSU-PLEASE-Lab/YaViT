# YAVIT

**Developers:**  
Ujjwal Panthi<br />
Omar Aziz<br />
Valentine Aduaka<br />

## Requirements
You must have the following dependencies installed in order to run this application.<br/> 
**Note:** The version numbers indicate the least version required for running the application. So as long as you have a relatively recent versions you should have no issues running the app.

1. Node.js >= v4.4.2
2. Mongo DB >= 2.6.12

## Installation
### Database Setup
 After MongoDB>=v4.4.2 is installed, follow the following steps. 
1. Create the initial setup DB from directory `start_db`. Change directory to `start_db` and execute command:
	```
    mongorestore --db hpc_monitoring data/hpc_monitoring
    ```
2. After above step, a database named `hpc_monitoring` is created on your system. The DB contains 8 basic collections. A collection named `schema` has single document for `meminfo` metric. It is an sample structure of a document in `schema` collection. Delete this if you do not collect this metric. Other collections dont have any documents but only structure.
3. Populate `user` collection with the users from the current system for whom you want give the access to the interface. Its better not to include root/system users. Populate the documents using following structure. At first, just the `_id` and `Name` field will be different for each user. Admin can be setup later.
 	```
    {
      "_id" : ObjectId("58cf4c315ccecb48e89ac5b1"),
      "UserType" : 2,
      "UserTypeName" : "User",
      "Name" : "IamANormalUser"
    }
    ```
   Allocate at least one admin by directly editing a prefered user from the collection using `Robomongo` tool or using mongodb query. To make a admin change: 
   ``` "UserType" to 1 and  "UserTypeName" to "Admin" ```. 
    Any other required admins can be setup by this admin from the interface.
4.  Populate `node` collection. The example structure of single document in `node` collection is:
    ```
    {
        "_id" : 1,
        "Name" : "fpga01"
    }
    ```
5.  Populate `application` collection. The example structure of single document in `application` collection is:
    ```
    {
        "_id" : ObjectId("58cf4cac5ccecb48e89b0d1b"),
        "Name" : "run_baseline_generic"
    }
    ```
6.  Populate `application_user` collection. The example structure of single document in `application_user` collection is:
    ```
    {
        "_id" : ObjectId("58cf4c315ccecb48e89ac5af"),
        "ApplicationName" : "sub-matmul",
        "UserID" : "589faf3493094bcb489de072f",
        "ApplicationID" : "58cf4c315cc48e89ac5a2",
        "UserName" : "hasdrz"
    }
    ```
7.  Populate `job` collection. The example structure of single document in `job` collection is:
    ```
    {
        "_id" : 39729,
        "ApplicationName" : "lulesh",
        "name" : "lulesh.run",
        "exit_status" : "0",
        "groupname" : "users",
        "mem_bytes" : 63647744,
        "fail_msg" : "",
        "queue" : "batch",
        "mem_used" : "60.7M",
        "node_req" : "3:ppn=27",
        "end_time" : 1489716413,
        "owner" : "oaaziz",
        "queue_time" : 1489716404,
        "slots" : 81,
        "ApplicationID" : "58cf4f615ccecb63485af8a5",
        "start_time" : 1489716404,
        "walltime" : "00:00:09"
    }

    ```
    Additional field name `metrices` will be added to each docucment by background python script.
8.  Populate `node_job` collection. The example structure of single document in `node_job` collection is:
    ```
    {
        "_id" : ObjectId("58c39fda5ccecb59565808af"),
        "NodeId" : 6,
        "JobNumber" : 2
    }
    ```
9. Populate `schema` collection. The sample document is already provided in initial DB.
10. Populate `appevent` collection with PROMON events. The example of single document structure is:
    ```{
        "_id" : ObjectId("58d344c05ccecb52ff15caf1"),
        "Timestamp" : NumberLong(1490240704000),
        "NodeId" : 6,
        "NO_MSG_QUEUE" : NumberLong(935),
        "Block_Time_RECV_SEC" : NumberLong(1490240704),
        "Block_Time_RECV_NANOSEC" : NumberLong(504915044),
        "rank" : NumberLong(0),
        "userName" : "oaaziz",
        "jobMS" : "PBS",
        "job_id" : NumberLong(39761),
        "time_sec" : NumberLong(1490240522),
        "time_msec" : NumberLong(1490240522927),
        "time_nsec" : NumberLong(927378560),
        "eventMode" : "HEARTBEAT",
        "eventControl" : "Begin",
        "eventName" : "Heartbeat",
        "eventSegment" : "Function",
        "eventCount" : NumberLong(23),
        "eventVarType" : "0",
        "eventVarValue" : NumberLong(0),
        "n" : NumberLong(0),
        "extra" : ""
    }
    ```
**Note**: [Robomongo](https://robomongo.org/) is a very handly GUI tool for managing MongoDB database.

### Background scripts
YAVIT has some background python scripts which fill data to different collections and for calculating different statistics. The scripts are located in the directory called `scripts`.

### Application Setup
After Node.js>=v4.4.2 is installed and database is setup successfully, follow the following steps:
1. Node.js requires NPM (a package manager) for installing different packages. NPM comes with default Node.js but it updates very frequently. Hence, after Node.js installation you can update NPM as follows:
  	```
    npm install npm@latest -g
  	```
2. Install all the packages required for this application. The required packages are listed in `package.json` file. Run the following command in home directory of this application to install the packages:
	```
    npm install
	```
3. Change the server port for running the application. Default is 8000. You can change this by changing the following line in `server.js` file.
	```
	var SERVER_PORT = 8000; // set port
	```

4. Change MongoDB details for the application. By default, the mongodb server url is: `127.0.0.1:27017` and  database name is `hpc_monitoring`. If you have the different monogodb server url or a database then change following line in `app_server/models/db.js` file accordingly.
 	```
 	var dbURI = 'mongodb://127.0.0.1:27017/hpc_monitoring';
	```
5. Run the following command on home directory of this application.
	```
    node server.js
    ```
	**Note**: Use background run or service run according to your convinence. Also, use your preferred 	Linux stderr and stdout logging procedure to redirect errors and outputs.
    
6. Navigate to browser url: ``http://YOUR_SERVER_URL:8000``. Change 8000 to the preferred port as configured in server.js file.

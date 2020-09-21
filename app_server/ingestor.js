const { spawn } = require('child_process');
const helpers = require('../app_server/config/helpers');

let Ingestor = {};

// const ls = spawn('ls', ['-l']);
//     const grep = spawn('grep', ['package'], { stdio: [ls.stdout, 'pipe', 'pipe'] } );

/* {
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
} */

/* 
    +-----------------+------------------+-------+--+--+
| _id             | jobid            |       |  |  |
+-----------------+------------------+-------+--+--+
| ApplicationName |                  |       |  |  |
+-----------------+------------------+-------+--+--+
| name            | jobname          |       |  |  |
+-----------------+------------------+-------+--+--+
| groupname       | group            |       |  |  |
+-----------------+------------------+-------+--+--+
| mem_bytes       | maxrss           | bytes |  |  |
+-----------------+------------------+-------+--+--+
| fail_msg        | comment          |       |  |  |
+-----------------+------------------+-------+--+--+
| state           | state            |       |  |  |
+-----------------+------------------+-------+--+--+
| queue           | partition        |       |  |  |
+-----------------+------------------+-------+--+--+
| node_req        | nnodes:ppn=ncpus |       |  |  |
+-----------------+------------------+-------+--+--+
| end_time        | end              | unix  |  |  |
+-----------------+------------------+-------+--+--+
| owner           | user             |       |  |  |
+-----------------+------------------+-------+--+--+
| queue_time      | submit           |       |  |  |
+-----------------+------------------+-------+--+--+
| slots           | priority         |       |  |  |
+-----------------+------------------+-------+--+--+
| ApplicationID   |                  |       |  |  |
+-----------------+------------------+-------+--+--+
| start_time      | start            | unix  |  |  |
+-----------------+------------------+-------+--+--+
| walltime        | time             |       |  |  |
+-----------------+------------------+-------+--+--+
*/

// Get jobs in the queue
Ingestor.watchQueue = async () => {

    // return new Promise( (resolve, reject) => {
    //     const ls = spawn('squeue');

    //     ls.stdout.on('data', data => {
    //         console.log(`stdout: ${data}`);
    //     });

    //     ls.stderr.on("data", data => {
    //         console.log(`stderr: ${data}`);
    //     });

    //     ls.on('error', (error) => {
    //         console.log(`error: ${error.message}`);
    //     });

    //     ls.on('close', code => {
    //         console.log(`child process exited with code ${code}`);
    //     });
    // });
}

Ingestor.filteredData = async arr => {
    let resultArr = [];

    return new Promise((resolve, reject) => {
      arr.filter((value, index) => {
        let search = new RegExp(/-/);
        let data = {};
        let headers = [
          "_id",
          "name",
          "groupname",
          "mem_bytes",
          "fail_msg",
          "state",
          "queue",
          "nnodes",
          "ncpus",
          "end_time",
          "owner",
          "queue_time",
          "slots",
          "start_time",
          "walltime"
        ];
  
        if (value !== '' && search.test(value) !== false && index > 0) {
  
          let jobArrs = value.split("|");
          
          let newProp;
  
          for (let i = 0,j = 0, jobArrLen=jobArrs.length, headersLen=headers.length; i<jobArrLen && j<headersLen; i++,j++) {
            // Assign values to their respective headers
            data[headers[i]] = jobArrs[j];

            data.ApplicationName = "";

            // Format time to unix timestamp for 
            // start_time, queue_time and end_time
            if (headers[i] === "start_time") {
              data[headers[i]] = helpers.toTimeStamp(jobArrs[i]);
            }
  
            if (headers[i] === "queue_time") {
              data[headers[i]] = helpers.toTimeStamp(jobArrs[i]);
            }
  
            if (headers[i] === "end_time") {
              data[headers[i]] = helpers.toTimeStamp(jobArrs[i]);
            }
  
            // Create object prop in torque format ("node_req" : "3:ppn=27",)
            if (headers[i] === "nnodes") {
              newProp = `${jobArrs[j]}:ppn=`;
            }
  
            // Append ncpus value to new prop format (torques)
            if (headers[i] === "ncpus") {
              newProp += `${jobArrs[j]}`;
              data.node_req = newProp;
            }
  
            // Delete non required object properties
            delete data["nnodes"];
            delete data["ncpus"];
  
            // Push formatted objects into array
            resultArr.push(data);
          }
        }
        // Return the data object
        return data;
      });
  
      // Strip out dulicate objects
      let uniqueItems = Array.from(new Set(resultArr));
  
      // Send output promise
      resolve(uniqueItems);
    });
};

// Injest all jobs into DB
Ingestor.injest = () => {
    const period = '2020-09-01';
    const headers = 'jobid,jobname,group,maxrss,comment,state,partition,nnodes,ncpus,end,user,submit,priority,start,time';
    const sacct = spawn('sacct', ['--allocation', '-P',`--starttime=${period}`, `--format=${headers}`]);

    sacct.stdout.on('data', data => {
        let sacctData = `${data}`;
        let arr = sacctData.split(/\n/);
        
        Ingestor.filteredData(arr).then( response => {
            response.forEach((obj) => {
                
                const seffQueryPerJobId = spawn('seff', ['-j', obj._id]);

                seffQueryPerJobId.stdout.on('data', seffInfoStream => {
                    obj.mem_bytes = helpers.getSeffMem(`${seffInfoStream}`).bytes
                    console.log(obj)
                    // return obj;
                });
            });
        });
    });

    sacct.stderr.on("data", data => {
        console.log(`stderr: ${data}`);
    });

    sacct.on('close', code => {
        console.log(`child process exited with code ${code}`);
    });
}



module.exports = Ingestor;
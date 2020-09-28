const mongoose = require('mongoose');
const { spawn, exec } = require('child_process');
const helpers = require('../app_server/lib/helpers');
const User = require('./models/users');
const Job = require('./models/job');
const Node = require('./models/node');
const IngestCollection = require('./models/ingest');

let Ingestor = {};

// Get jobs in the queue
Ingestor.watchQueue = async () => {
}

/**
 * Clean stdout from sacct query
 */
Ingestor.filteredData = async arr => {
    let resultArr = [];

    return new Promise((resolve, reject) => {
      arr.filter((value, index) => {
        let search = new RegExp(/-/);
        let data = {};
        let headers = [
          "_id",
          "name",
          "exit_status",
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
  
          // let jobArrs = value.split("|");
          let jobArrs = value.split("|").filter(function(v,i){
            if(i === 15) {
              return v !=='';
            }
            return true; 
          });
          
          // Placeholder to hold the conversion of slurm's nnodes and ncpus to torque format ("3:ppn=27")
          let newProp;
  
          for (let i = 0,j = 0, jobArrLen=jobArrs.length, headersLen=headers.length; i<jobArrLen && j<headersLen; i++,j++) {
            // Assign values to their respective headers
            data[headers[i]] = jobArrs[j];

            data.ApplicationName = "";
            data.ApplicationID = "";

            // Convert to unix time stamp
            if (headers[i] === "start_time") {
              data[headers[i]] = helpers.toTimeStamp(jobArrs[i]);
            }
            
            // Convert to unix time stamp
            if (headers[i] === "queue_time") {
              data[headers[i]] = helpers.toTimeStamp(jobArrs[i]);
            }
  
            // Convert to unix time stamp
            if (headers[i] === "end_time") {
              data[headers[i]] = helpers.toTimeStamp(jobArrs[i]);
            }

            // Format exit_staus return value
            if (headers[i] === "exit_status") {
              data[headers[i]] = jobArrs[i].split(':')[0];
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

/**
 * Confirm whether or not the number of HPC jobs 
 * have been added to the jobs collection
 * @param {*} jobsCollectionResult 
 * @param {*} id 
 */
Ingestor.confirmJobsIngestion = async ({JobsIngested, _id}) => {
  console.log(_id);
  return new Promise( (resolve, reject ) => {
    if(!JobsIngested) {
      console.log('\x1b[35m%s\x1b[0m',"Ingesting jobs...");
      Ingestor.injestJobs(_id).then( res => resolve( res )).catch( error => reject( error ));
    } else {
      resolve({status: true, message: `No jobs to ingest!` });
    }
  });
};

/**
 * Confirm whether or not the number of HPC nodes
 * have been added to the nodes collection
 * @param {*} nodesCollectionResult 
 * @param {*} id 
 */
Ingestor.confirmNodesIngestion = async ({NodesIngested, _id}) => {
  return new Promise( (resolve, reject ) => {
    if(!NodesIngested) {
      console.log('\x1b[35m%s\x1b[0m',"Ingesting nodes...");
      Ingestor.injestJNodes(_id).then( res => resolve( res )).catch( error => reject( error ));
    } else {
      resolve({status: true, message: `No nodes to ingest!` });
    }
  });
};

/**
 * Start ingesting SLURM data to DB
 */
Ingestor.init = async () => {
  const ingestResult = await IngestCollection.find();
  // const [{JobsIngested, NodesIngested, _id}] = ingestResult;

  await Ingestor.confirmJobsIngestion(ingestResult[0])
        .then( response => console.log('\x1b[32m', response.message))
        .catch( error => console.error('\x1b[31m', error.message));

  await Ingestor.confirmNodesIngestion(ingestResult[0])
        .then( response => console.log('\x1b[32m', response.message))
        .catch( error => console.error('\x1b[31m', error.message));

};

/**
 * Ingest all nodes into DB
 * @param {*} nodesIngestId 
 */
Ingestor.injestJNodes = async (nodesIngestId) => {
  // sinfo -N -h | awk '{print $1}'
  let buffer = "";

  const sinfo = spawn('sinfo', ['-N', '-h']);
  const awk = spawn('awk', ['{print $1}']);

  sinfo.stdout.on('data', (data) => {
    awk.stdin.write(data);
  });

  sinfo.stderr.on('data', (data) => {
    console.error(`sinfo stderr: ${data}`);
  });

  sinfo.on('close', (code) => {
    if (code !== 0) {
      console.log(`sinfo process exited with code ${code}`);
    }
    awk.stdin.end();
  });

  awk.stdout.on('data', (data) => {
    buffer += data.toString();
  });

  awk.stderr.on('data', (data) => {
    console.error(`awk stderr: ${data}`);
  });

  return new Promise( (resolve, reject) => {
    awk.on('close', (code) => {

      if (code !== 0) {
        reject({state: false, message: `awk process exited with code ${code}`});
      } else {
        // Put fetched nodes in array
        let hpcComputeNodes = buffer.split("\n");

        // Strip empty slots 
        let filteredComputeNodes = hpcComputeNodes.filter( (node) => node !== "" );
        let NodesJsonFormat = filteredComputeNodes.map( (nodename, id) => {
          return {
            _id: id+1,
            Name: nodename
          }
        });

        // Insert to const {propertyName} = objectToDestruct
        try {
          Node.insertMany(NodesJsonFormat).then(async ()=>{ 
            // Update ingest jobs document
            await IngestCollection.findOneAndUpdate({ _id: nodesIngestId },{ NodesIngested: true }, {upsert: true, useFindAndModify: false}, (err, doc) => {
              if (err) reject(new Error(err)) 
            });

            if(NodesJsonFormat.length > 0 )
              resolve({status: true, message: `${NodesJsonFormat.length} nodes were successfully ingested to nodes collection`});
          }).catch(error =>{ 
            reject(error);
          }); 
        } catch (error) {
          console.log('\x1b[31m', error);
        }
      }
    });
  });
};

/**
 * Injest all jobs into DB
 * @TODO - Move startDate to config page
 */
Ingestor.injestJobs = async (jobsIngestId) => {
  // Get date of the previous day
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const startDate = '2020-09-01'; 
  const endDate = yesterday.toLocaleDateString('fr-CA'); // The previous day
  const headers = 'jobid,jobname,exit,group,maxrss,comment,state,partition,nnodes,ncpus,end,user,submit,priority,start,time';
  let buffer = "";

  const sacct = spawn('sacct', ['--allusers', '--allocation', '-p',`--starttime=${startDate}`, `--format=${headers}`]);
 
  // Append standard out to buffer
  sacct.stdout.on('data', data => buffer += data.toString());

  // Output stdout errors
  sacct.stderr.on("data", data => console.log(`stderr: ${data}`));

  // Ingest stdout to DB
  return new Promise((resolve, reject) => {
    sacct.on('close', code => {
      let sacctData = buffer.split(/\n/);
      Ingestor.filteredData( sacctData ).then( response => {
        helpers.injectParams( response ).then( async res => {
          try {
            await Job.insertMany(res).then(async ()=>{ 
              // Update ingest jobs document
              await IngestCollection.findOneAndUpdate({ _id: jobsIngestId },{ JobsIngested: true }, {upsert: true, useFindAndModify: false}, (err, doc) => {
                if (err) reject(new Error(err)) 
                // else return true;
              });

              if(res.length > 0 )
                resolve({status: true, message: `${res.length} jobs were successfully ingested to jobs collection`});
            }).catch(error =>{ 
              reject(error);
            }); 
          } catch (error) {
            console.log('\x1b[31m', error);
          }
        });
      });
    });
  });
};

module.exports = Ingestor;
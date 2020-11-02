const mongoose = require('mongoose');
const { spawn } = require('child_process');
const { resolve } = require('bluebird');
const helpers = require('../app_server/lib/helpers');
const config = require('../app_server/lib/config');
const db = require('./models/db');
const User = require('./models/users');
const Job = require('./models/job');
const Node = require('./models/node');
const NodeJob = require('./models/nodejob');
const Application = require('./models/application');
const IngestCollection = require('./models/ingest');
const ingest = require('./models/ingest');

const ObjectID = require('bson').ObjectID;

let Ingestor = {};

// Get jobs in the queue
Ingestor.watchQueue = async () => {
}

Ingestor.createCollection = async () => {
  return new Promise( (resolve, reject) => {
    IngestCollection.createCollection((err, res) => {
      if (err) throw err;

      console.log("Ingest Collection created!");

      Ingestor.createDocuments().then( response => {
        resolve(response)
      }).catch( error => {
        reject(error)
      })
    });


    // const ingestResult = await IngestCollection.find( (error, doc) => {
    
    //   if(error === null){
    //     console.log('\x1b[31m','No Ingest Collection found in DB\n', '\x1b[32m', '==>', `Creating Ingest Collection in database...`);
    //   }
    // });
  });
}


/**
 * Check if  given collection name exists in the database
 * @param {*} collectionName 
 */
Ingestor.collectionExists = ( collectionName ) => {
  const dbConnect = mongoose.createConnection(db.dbURI, config.db.mongoOptions);

  return new Promise( (resolve, reject) => {
    dbConnect.on('open', () => {
      dbConnect.db.listCollections().toArray( (err, collectionNames) => {
          if (err) {
            reject(err);
            return;
          }
          // Check if the given collection name exixts in the list of collection objects returned
          let result = collectionNames.map( data => {return data.name} ).includes(collectionName);
  
          if( !result ){
            resolve(result)
          } else {
            resolve(result);
          }
          // Close connection
          dbConnect.close();
        });
    });
  });
};

/**
 * Create Ingest collection documents
 */
Ingestor.createDocuments = async () => {

  console.log("Creating Ingest collection documents...");

  let documents = { 
    JobsIngested: false,
    NodesIngested: false,
    NodeJobIngested: false,
    ApplicationIngested: false,
    ApplicationUserIngested: false
  };

  return new Promise( (resolve, reject) =>{
    IngestCollection.insertMany(documents, (err, res) => {
      if (err) reject({status: false, message: err, statusMsg: 'Error'});
      resolve({ data: res, message: `${res.length} document${res.length > 1 ? 's were' : ' was'} successfully inserted.`})
    });
  });
};

/**
 * Check of if the Ingest collection has documents in it
 * @param {*} callback
 */
Ingestor.hasDocuments = async ( callback ) => {
  return IngestCollection.find( (err, res) => {
    if(!err){
      if(res.length > 0){
        callback(null, true);
      } else {
        callback(null, false);
      }
    } else {
      callback(err, null);
    }
  });
};

/**
 * 
 * @param {*} callback 
 */
Ingestor.getIngestCollectionDocs = async () => {

  return new Promise( async (resolve, reject) => {
    // Check if Ingest Collection exists
    await Ingestor.collectionExists('ingest').then( async res  => {
      
      if(res){
        // Check if the ingest collection has documents
        await Ingestor.hasDocuments((err, res) => {
          if(!res){
            Ingestor.createDocuments().then( response => {
              console.log(response.message);
              resolve(response.data)
            }).catch( error => {
              console.log(error);
            });
          } else {
            // Return the documents found
            const ingestResult = IngestCollection.find((err, docs)=>{
              resolve(docs);
              return docs;
            });

            return ingestResult;
          }
        });
        return;
      } else {
        // If it doesn't exist, create the collection
        Ingestor.createCollection().then( response => {
          console.log(response.message);
          resolve(response.data);
        }).catch( error => {
          console.log(error.message);
        })
      };
    }).catch( error => {
      console.log(error);
    });
  });
};


/**
 * Start ingesting SLURM data to DB
 */
Ingestor.init = async () => {

  await Ingestor.getIngestCollectionDocs();

  const ingestResult = await IngestCollection.find();

  if(ingestResult.length > 0){

    // const [{JobsIngested, NodesIngested, _id}] = ingestResult;

    let nodesIngested = []; // Placeholder for the returned list of ingested nodes.
    let jobsIngested = []; // Placeholder for the returned list of ingested jobs.

    // Ingest Nodes
    await Ingestor.confirmNodesIngestion(ingestResult[0])
          .then( response => {
            nodesIngested = response.data;
            console.log('\x1b[32m', '==>', response.message)
          })
          .catch( error => console.error('\x1b[31m', error.message));

    // Ingest jobs
    await Ingestor.confirmJobsIngestion(ingestResult[0], nodesIngested)
          .then( response => {
            jobsIngested = response.data;
            console.log('\x1b[32m', '==>', response.message)
          })
          .catch( error => console.error('\x1b[31m', error.message));

    // Ingest application data
    await Ingestor.confirmApplicationIngestion(ingestResult[0], jobsIngested)
        .then( response => console.log('\x1b[32m', '==>', response.message))
        .catch( error => console.error('\x1b[31m', error.message));

    // Ingest node_job data
    await Ingestor.confirmNodeJobIngestion(ingestResult[0])
        .then( response => console.log('\x1b[32m', '==>', response.message))
        .catch( error => console.error('\x1b[31m', error.message));
    
  } else {
    console.error('\x1b[31m', "Please confirm that the Ingest Collection exists in DB then restart the app");
    return false;
  }

  // Always reset console (stdout) color
  console.log('\x1b[0m');
};

/**
 * Confirm whether or not the number of HPC jobs 
 * have been added to the jobs collection.
 * @param {*} param0 * Destructure Ingest collection results
 */
Ingestor.confirmJobsIngestion = async ({JobsIngested, _id}, nodes) => {
  
  return new Promise( (resolve, reject ) => {
    if(!JobsIngested) {
      console.log('\x1b[35m%s\x1b[0m',"Ingesting jobs...");
      Ingestor.injestJobs(_id, nodes).then( res => resolve( res )).catch( error => reject( error ));
    } else {
      resolve({status: true, message: `No jobs to ingest!` });
    }
  });
};

/**
 * Confirm whether or not the number of HPC jobs 
 * have been added to the jobs collection.
 * @param {*} param0 * Destructure Ingest collection results
 */
Ingestor.confirmApplicationIngestion = async ({ApplicationIngested, _id}, jobs) => {
  
  return new Promise( (resolve, reject ) => {
    if(!ApplicationIngested) {
      console.log('\x1b[35m%s\x1b[0m',"Ingesting Applications...");
      Ingestor.injestApplications(_id, jobs).then( res => resolve( res )).catch( error => reject( error ));
    } else {
      resolve({status: true, message: `No applications to ingest!` });
    }
  });
};

/**
 * Confirm whether or not the number of HPC nodes
 * have been added to the nodes collection
 * @param {*} param0 * Destructure Ingest collection results
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
 * Confirm whether or not the nodejob data have
 * been added to the node_job collection
 * @param {*} param0 
 */
Ingestor.confirmNodeJobIngestion = async ({NodeJobIngested, _id}) => {
  return new Promise( (resolve, reject ) => {
    if(!NodeJobIngested) {
      console.log('\x1b[35m%s\x1b[0m',"Populating Node Job collection...");
      Ingestor.injestNodeJob(_id).then( res => resolve( res )).catch( error => reject( error ));
    } else {
      resolve({status: true, message: `No node job data to ingest!` });
    }
  });
};

/**
 * Clean stdout from sacct query
 * @param {*} arr // Stdout raw data
 * @param {*} nodes // Nades in DB
 */
Ingestor.filteredData = async (arr, nodes) => {
    let resultArr = [];

    return new Promise((resolve, reject) => {
      
      arr.filter(async (value, index) => {
        let search = new RegExp(/-/);
        let data = {};
        let headers = [
          "_id",
          "name",
          "exit_status",
          "groupname",
          "mem_bytes",
          "ApplicationName",
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
          "walltime",
          "nodeId"
        ];
  
        if (value !== '' && search.test(value) !== false && index > 0) {
  
          // let jobArrs = value.split("|");
          let jobArrs = value.split("|").filter((v,i) => {
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

            // Assign app name
            if (headers[i] === "ApplicationName") {
              data[headers[i]] = jobArrs[i] === "" ? null : jobArrs[i];
            }

            // Generate app ID only if App name exists
            let id  = new ObjectID();
            data.ApplicationID = data.ApplicationName !== null ? id.toString() : "";

            // Convert to unix time stamp
            if (headers[i] === "start_time") {
              data[headers[i]] = Date.parse(jobArrs[i]);
            }
            
            // Convert to unix time stamp
            if (headers[i] === "queue_time") {
              data[headers[i]] = Date.parse(jobArrs[i]);
            }
  
            // Convert to unix time stamp
            if (headers[i] === "end_time") {
              data[headers[i]] = Date.parse(jobArrs[i]);
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

            // Check that nodeId matches the list of available nodes.
            if (headers[i] === "nodeId") {
              let nodeObj = nodes.filter( (obj, id) =>  obj.Name === jobArrs[i]);
              data[headers[i]] = nodeObj[0] !== undefined ? nodeObj[0]['_id'] : 0;
            }
  
            // Delete non required object keys
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
 * Ingest all nodes into DB
 * @param {*} nodesIngestId 
 */
Ingestor.injestJNodes = async (nodesIngestId) => {
  // Slurm command to retrieve compute nodes (sinfo -N -h | awk '{print $1}')

  // Placeholder for sinfo result stream
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
          Node.insertMany(NodesJsonFormat).then(async ( nodes )=>{ 
            // Update ingest jobs document
            await IngestCollection.findOneAndUpdate({ _id: nodesIngestId },{ NodesIngested: true }, {upsert: true, useFindAndModify: false}, (err, doc) => {
              if (err) reject(new Error(err)) 
            });

            if(NodesJsonFormat.length > 0 )
              resolve({status: true, data: nodes, message: `${NodesJsonFormat.length} nodes were successfully ingested to nodes collection`});
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
 * @param {*} jobsIngestId * Id of the ingestCollection, in order to keep track of what document to update
 * @TODO Add end date --endtime=endDate
 */
Ingestor.injestJobs = async (jobsIngestId, nodes) => {
  // Get date of the previous day
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const startDate = config.jobs.ingestJobsFromDate; 
  const endDate = yesterday.toLocaleDateString('fr-CA'); // The previous day
  const headers = 'jobid,jobname,exit,group,maxrss,comment,SystemComment,state,partition,nnodes,ncpus,end,user,submit,priority,start,time,node';
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
      Ingestor.filteredData( sacctData, nodes ).then( response => {
        helpers.injectParams( response ).then( async res => {
          try {
            await Job.insertMany(res).then(async (jobs)=>{ 
              // Update ingest jobs document
              await IngestCollection.findOneAndUpdate({ _id: jobsIngestId },{ JobsIngested: true }, {upsert: true, useFindAndModify: false}, (err, doc) => {
                if (err) reject(new Error(err)) 
                // else return true;
              });

              if(res.length > 0 )
                resolve({status: true, data: jobs, message: `${jobs.length} jobs were successfully ingested to jobs collection`});
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

/**
 * Add node_job data to the node_job collection 
 * if it doesn't exist in the db already
 * @param {*} nodeJobIngestId // Id of the ingestCollection, in order to keep track of what document to update
 */
Ingestor.injestNodeJob = async (nodeJobIngestId) => {

  return new Promise((resolve, reject) => {
    Job.find({}, { nodeId:1, _id : 1 }).then( async response => {
      let nodeJobs = response.map( obj => {
        return {
          NodeId : obj.nodeId,
          JobNumber : obj._id
        }
      });

      try {
        await NodeJob.insertMany(nodeJobs).then(async ()=>{ 
          // Update ingest jobs document
          await IngestCollection.findOneAndUpdate({ _id: nodeJobIngestId },{ NodeJobIngested: true }, {upsert: true, useFindAndModify: false}, (err, doc) => {
            if (err) reject(new Error(err)) 
            // else return true;
          });

          if(nodeJobs.length > 0 )
            resolve({status: true, message: `${nodeJobs.length} nodejob data were successfully ingested to node_job collection`});
        }).catch(error =>{ 
          reject(error);
        }); 
      } catch (error) {
        console.log('\x1b[31m', error);
      }
    });
  });
};

/**
 * Add node_job data to the node_job collection 
 * if it doesn't exist in the db already
 * @param {*} nodeJobIngestId // Id of the ingestCollection, in order to keep track of what document to update
 */
Ingestor.injestApplications = async (applicationIngestId, jobs) => {
  
  let allApplications =  Array.from(new Set(jobs.map((obj) => obj.ApplicationName)))
  .map( elem => {
    return {
      Name: elem
  }});

  let jobsWithAppName = jobs.filter( obj => obj.ApplicationName !== null);

  // console.log(jobsWithAppName)
  
  return new Promise( async (resolve, reject) => {

    if(allApplications.length > 0){
      try {
        await Application.insertMany(allApplications).then(async (apps)=>{ 
          // Update ingest jobs document
          await IngestCollection.findOneAndUpdate({ _id: applicationIngestId },{ ApplicationIngested: true }, {upsert: true, useFindAndModify: false}, async (err, doc) => {
            if (err) reject(new Error(err)) 
            // else return true;
            console.log('\x1b[35m%s\x1b[0m',"Updating job application IDs...");

            // await Application.find({}, { Name:1, _id : 1 }).then( ( data ) => {
            //   console.log(data);
            // })

            let data = await Application.find({});
            console.log(data);
            

            // Job.findOneAndUpdate()
          });

          if(apps.length > 0 )
            resolve({status: true, message: `${apps.length} applications were successfully ingested`});
        }).catch(error =>{ 
          reject(error);
        }); 
      } catch (error) {
        console.log('\x1b[31m', error);
      }
    }
  });
};

module.exports = Ingestor;
/**
 * Ingestor Driver code

 * *************************************************************************************************
 * ** Description
 * *************************************************************************************************
 * The Ingestor driver code is basically responsible for ensuring that the SLURM data 
 * required for the YaViT application to function is ingested into the database. The Ingestor driver
 * initializes whenever the application is launched and during the initialization process,
 * it checks to see if the Ingestor collection and the single ingest document exist. 
 * 
 * If the ingest collection and single ingest document exists, it reads the single document 
 * which contains 'keys' & 'values' that represent the 'data status' of other collections 
 * such as: nodes, node_job, application, application_user and jobs. If the value of a given 
 * key is set to false, it means no data has been ingested for that given collection, therefore 
 * the ingest driver will go ahead to ingest the data for that given collection and update its 
 * value to true in the ingest document. 
 * 
 * If the ingest collection and single ingest document don't exist, the Ingestor driver creates 
 * both the collection and the single document with a default value of false for each key in the 
 * document. The Ingestor driver has been built to query HPC systems that use the SLURM scheduler for 
 * job scheduling and management. All queries to fecth job and node details are all SLURM commands.
 * ***************************************************************************************************
 */

const mongoose = require('mongoose');
const { PerformanceObserver, performance } = require('perf_hooks');
const moment = require('moment');
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
const Ingest = require('./models/ingest');
const ObjectID = require('bson').ObjectID;

/**
 * Ingestor object
 */
const Ingestor = {};

/**
 * Slurm sacct command --format headers to query for.
 */
Ingestor.jobHeaders = 'jobid,jobname,exit,group,maxrss,comment,SystemComment,state,partition,nnodes,ncpus,end,user,submit,priority,start,time,node';

/**
 * Start ingesting SLURM data to DB
 */
Ingestor.init = async () => {

  // Confirm existence of Ingest collection and required 'ingest' documents
  await Ingestor.getIngestCollectionDocs();

  // Get Ingest documents
  const ingestResult = await Ingest.find();

  if(ingestResult.length > 0){

    let nodesIngested = []; // Placeholder for the returned list of ingested nodes.
    let jobsIngested = []; // Placeholder for the returned list of ingested jobs.

    // Ingest Nodes
    await Ingestor.confirmNodesIngestion(ingestResult[0])
          .then( response => {
            nodesIngested = response.data;
            helpers.out.success(response.message);
          }).catch( error => helpers.out.error(error.message));

    // Ingest jobs
    await Ingestor.confirmJobsIngestion(ingestResult[0], nodesIngested)
          .then( response => {
            jobsIngested = response.data;
            helpers.out.success(response.message);
          }).catch( error => helpers.out.error(error.message));

    // Ingest application data
    await Ingestor.confirmApplicationIngestion(ingestResult[0], jobsIngested)
        .then( response => helpers.out.success(response.message))
        .catch( error => helpers.out.error(error.message));

    // Ingest node_job data
    await Ingestor.confirmNodeJobIngestion(ingestResult[0])
        .then( response => helpers.out.success(response.message))
        .catch( error => helpers.out.error(error.message));
    
  } else {
    helpers.out.error("Please confirm that the Ingest Collection exists in DB then restart the app");
    return false;
  }

  // Always reset console (stdout) color
  console.log('\x1b[0m');
};


/**
 * Retrieve the last job with end_time !=== 0
 */
Ingestor.getLastJob = () => {
  return new Promise( async (resolve, reject) => {
    try {

      // Get the last job id that has an end_time value
      let lastJob = await Job.find({'end_time': {$ne: 0}}).sort({'_id': -1}).limit(1);

      if(typeof lastJob === 'object' && lastJob.length > 0){
        resolve(lastJob[0]);
      } else {
        return {};
      }
    } catch (error) {
      reject(error)
    }
  });
};


/**
 * Ingest recent jobs
 */
Ingestor.recentJobsWorker = async () => {
  // Get all nodes from YaViT db
  const computeNodes = await Node.find({});

  setInterval(() => {
    Ingestor
    .getLastJob() // Retrieve last job
    .then(res => {

      // Get the endtime of the last job and convert to yyyy-mm-dd format
      const startDate = helpers.fromDateTime(res.end_time, 1000);

      let buffer = "";
    
      // Query slurm database and get all recent jobs until current time using the endtime of the last job
      const sacct = spawn('sacct', ['--allusers', '--allocation', '-p',`--starttime=${startDate}`, `--format=${Ingestor.jobHeaders}`]);
    
      // Append standard out to buffer
      sacct.stdout.on('data', data => buffer += data.toString());

      // Output stdout errors
      sacct.stderr.on("data", data => helpers.out.error(`stderr: ${data}`));

      // Filter and store recent jobs into YaViT database.
      sacct.on('close', code => {

        let sacctData = buffer.split(/\n/);
        
        if(sacctData.length > 2){
          Ingestor.filteredData( sacctData, computeNodes ).then( response => {
            helpers.injectParams( response ).then( async res => {
              try {
                // Retrieve only jobIDs from the response
                let getJobIds = res.map((obj) => Number(obj._id));
                
                // Check database to see if any of the jobIds already exists
                let getExistingJobs = await Job.find().where('_id').in(getJobIds).exec();

                // Retrieve only jobIDs of the existing jobs in the DB (at this point existing jobs are likely to be 'running jobs')
                let getExistingJobsIds = getExistingJobs.map(obj => Number(obj._id));
                
                // Remove the existing jobs and allow only the non-existing jobs to be inserted to the DB
                let nonExistingJobs = res.map(obj => {
                  if(getExistingJobsIds.indexOf(Number(obj._id)) < 0){
                    return obj;
                  }
                }).filter(item => item !== undefined); // remove undefined values in array

                if(nonExistingJobs.length > 0){
                  // Ingest stdout to DB
                  await Job.insertMany(nonExistingJobs).then(async (jobs)=>{ 
                    if(res.length > 0 ){
                      helpers.out.success(`[${helpers.timestamp()}] ${jobs.length} new ${helpers.pluralize(jobs.length, 'job')} ingested to jobs collection successfully`)
                    }
                  }).catch(error =>{ 
                    helpers.out.error(error);
                  }); 

                  
                } else {
                  helpers.out.normal(`[${helpers.timestamp()}] No recent jobs found!`);
                }
              } catch (error) {
                helpers.out.error(error);
              }
            });
          });
        } else {
          helpers.out.normal(`[${helpers.timestamp()}] No recent jobs found!`);
        }
      });
    }).catch( error => {
      helpers.out.error(error);
    });

  }, config.jobs.recentJobsWorkerInterval);

  // Always reset console (stdout) color
    console.log('\x1b[0m');
};


/**
 * Update running jobs           
 */
Ingestor.runningJobsWorker = async () => {
  // Get all nodes from YaViT db
  const computeNodes = await Node.find({});

  setInterval( async () => {

    let currentTime = moment();
    let prevDate = currentTime.subtract(config.jobs.hpcMaxWalltime, 'days').format('YYYY-MM-DD HH:mm:ss');

      try {
        // Get runnibg jobs in DB with start_time greater than > 0 and end_time = 0
        let runningJobs = await Job.find({end_time: 0, start_time: {$gte:0}}).exec();
        let runningJobsIds = runningJobs.map((obj) => Number(obj._id));

        let buffer = "";

        // Query slurm database and get all recent jobs until current time using the endtime of the last job
        const sacct = spawn('sacct', ['--allusers', '--allocation', '-p',`--starttime=${prevDate}`, `--format=${Ingestor.jobHeaders}`]);
        
        // Append standard out to buffer
        sacct.stdout.on('data', data => buffer += data.toString());

        // Output stdout errors
        sacct.stderr.on("data", data => helpers.out.error(`stderr: ${data}`));

        // Filter and store recent jobs into YaViT database.
        sacct.on('close', code => {

          let sacctData = buffer.split(/\n/);

          if(sacctData.length > 2){
            Ingestor.filteredData( sacctData, computeNodes ).then( response => {
              helpers.injectParams( response ).then( async res => {
                try {

                  let counter = 0;
                  
                  // Compare and retrieve jobs that need to be updated
                  let jobsToUpdate = res.map(obj => {
                    if(runningJobsIds.indexOf(Number(obj._id)) >= 0 && obj.end_time > 0) 
                      return obj;
                  }).filter(item => item !== undefined); // remove undefined values in array

                  if(jobsToUpdate.length > 0){
                    // Loop through and update jobs
                    jobsToUpdate.forEach(async (obj) => {
                      try {
                        Job.findByIdAndUpdate(obj._id , obj, {new: true, useFindAndModify: false}, (err, doc) => {
                           if (err) reject(new Error(err));
                        });
                        counter += 1;
                      } catch (error) {
                        helpers.out.error(error);
                      }      
                    }); 

                    if (counter === jobsToUpdate.length && counter > 0) {
                      helpers.out.success(`[${helpers.timestamp()}] Updated ${counter} finished ${helpers.pluralize(counter, 'job')} successfully`);
                    }

                    // Update jobs with the correct application IDs
                    try {
                      await Ingestor.injestApplications(null, jobsToUpdate).then( response => {
                      }).catch( error => {
                          helpers.out.error(error);
                      });
                    } catch (error) {
                      helpers.out.error(error);
                    }
                  } else {
                    helpers.out.normal(`[${helpers.timestamp()}] No running jobs found!`);
                  }
                } catch (error) {
                  helpers.out.error(error);
                }
              });
            });
          } else {
            helpers.out.normal(`[${helpers.timestamp()}] No running jobs found!`);
          }
        });

      } catch (error) {
        // Db error
        helpers.out.error(error);
      }
  }, config.jobs.runningJobsWorkerInterval);
};

/**
 * Create Ingest collection and document respectively.
 */
Ingestor.createCollection = async () => {
  return new Promise( (resolve, reject) => {
    Ingest.createCollection((err, res) => {
      if (err) throw err;

      helpers.out.success("Ingest Collection created!");

      Ingestor.createDocuments().then( response => {
        resolve(response)
      }).catch( error => {
        reject(error)
      })
    });
  });
};

/**
 * Create Ingest collection documents
 */
Ingestor.createDocuments = async () => {

  helpers.out.process("Creating Ingest collection documents...");

  let documents = { 
    JobsIngested: false,
    NodesIngested: false,
    NodeJobIngested: false,
    ApplicationIngested: false,
    ApplicationUserIngested: false
  };

  return new Promise( (resolve, reject) =>{
    Ingest.insertMany(documents, (err, res) => {
      if (err) reject({status: false, message: err, statusMsg: 'Error'});
      resolve({ data: res, message: `${res.length} document${res.length > 1 ? 's were' : ' was'} successfully inserted.`})
    });
  });
};


/**
 * Check if  given collection name exists in the database
 * @param {*} Collection 
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
 * Check of if the Ingest collection has documents in it
 * @param {*} function
 */
Ingestor.hasDocuments = async ( callback ) => {
  return Ingest.find( (err, res) => {
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
 * Confirm the exixtence of Ingest collection and Documents and create it
 * if they don't exist
 * @param {*} function 
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
              helpers.out.success(response.message);
              resolve(response.data)
            }).catch( error => {
              helpers.out.error(error);
            });
          } else {
            // Return the documents found
            const ingestResult = Ingest.find((err, docs)=>{
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
          helpers.out.success(response.message);
          resolve(response.data);
        }).catch( error => {
          helpers.out.error(error.message);
        })
      };
    }).catch( error => {
      helpers.out.error(error);
    });
  });
};

/**
 * Confirm whether or not the number of HPC jobs 
 * have been added to the jobs collection.
 * @param {*} param * Destructure Ingest collection results
 */
Ingestor.confirmJobsIngestion = async ({JobsIngested, _id}, nodes) => {
  
  return new Promise( (resolve, reject ) => {
    if(!JobsIngested) {
      helpers.out.process("Ingesting jobs...");
      Ingestor.injestJobs(_id, nodes).then( res => resolve( res )).catch( error => reject( error ));
    } else {
      resolve({status: true, message: `No Jobs to ingest!` });
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
      helpers.out.process("Ingesting Applications...");
      Ingestor.injestApplications(_id, jobs).then( res => resolve( res )).catch( error => reject( error ));
    } else {
      resolve({status: true, message: `No Applications to ingest!` });
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
      helpers.out.process("Ingesting nodes...");
      Ingestor.injestJNodes(_id).then( res => resolve( res )).catch( error => reject( error ));
    } else {
      resolve({status: true, message: `No Nodes to ingest!` });
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
      helpers.out.process("Populating Node Job collection...");
      Ingestor.injestNodeJob(_id).then( res => resolve( res )).catch( error => reject( error ));
    } else {
      resolve({status: true, message: `No Node Job data to ingest!` });
    }
  });
};

/**
 * Clean stdout of sacct query
 * @param {*} arr // Stdout raw data
 * @param {*} nodes // Nades (compute nodes) in DB
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
              let checkType = (jobArrs[i] === 'Unknown') ? 0 : jobArrs[i];
              data[headers[i]] = checkType === 0 ? 0 : Date.parse(checkType);
            }
            
            // Convert to unix time stamp
            if (headers[i] === "queue_time") {
              data[headers[i]] = Date.parse(jobArrs[i]);
            }
  
            // Convert to unix time stamp
            if (headers[i] === "end_time") {
              let checkType = (jobArrs[i] === 'Unknown') ? 0 : jobArrs[i];
              data[headers[i]] = checkType === 0 ? 0 : Date.parse(checkType);
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
    helpers.out.error(`sinfo stderr: ${data}`);
  });

  sinfo.on('close', (code) => {
    if (code !== 0) {
      helpers.out.error(`sinfo process exited with code ${code}`);
    }
    awk.stdin.end();
  });

  awk.stdout.on('data', (data) => {
    buffer += data.toString();
  });

  awk.stderr.on('data', (data) => {
    helpers.out.error(`awk stderr: ${data}`);
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
            await Ingest.findOneAndUpdate({ _id: nodesIngestId },{ NodesIngested: true }, {upsert: true, useFindAndModify: false}, (err, doc) => {
              if (err) reject(new Error(err)) 
            });

            if(NodesJsonFormat.length > 0 )
              resolve({status: true, data: nodes, message: `${NodesJsonFormat.length} nodes were successfully ingested to nodes collection`});
          }).catch(error =>{ 
            reject(error);
          }); 
        } catch (error) {
          helpers.out.error( error);
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

  let buffer = "";

  const sacct = spawn('sacct', ['--allusers', '--allocation', '-p',`--starttime=${config.jobs.ingestJobsFromDate}`, `--format=${Ingestor.jobHeaders}`]);
 
  // Append standard out to buffer
  sacct.stdout.on('data', data => buffer += data.toString());

  // Output stdout errors
  sacct.stderr.on("data", data => helpers.out.error(`stderr: ${data}`));

  // Ingest stdout to DB
  return new Promise((resolve, reject) => {
    sacct.on('close', code => {
      let sacctData = buffer.split(/\n/);
      Ingestor.filteredData( sacctData, nodes ).then( response => {
        helpers.injectParams( response ).then( async res => {
          try {
            await Job.insertMany(res).then(async (jobs)=>{ 
              // Update ingest jobs document
              await Ingest.findOneAndUpdate({ _id: jobsIngestId },{ JobsIngested: true }, {upsert: true, useFindAndModify: false}, (err, doc) => {
                if (err) reject(new Error(err)) 
                // else return true;
              });

              if(res.length > 0 )
                resolve({status: true, data: jobs, message: `${jobs.length} jobs were successfully ingested to jobs collection`});
            }).catch(error =>{ 
              reject(error);
            }); 
          } catch (error) {
            helpers.out.error( error);
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
          await Ingest.findOneAndUpdate({ _id: nodeJobIngestId },{ NodeJobIngested: true }, {upsert: true, useFindAndModify: false}, (err, doc) => {
            if (err) reject(new Error(err)) 
          });

          if(nodeJobs.length > 0 )
            resolve({status: true, message: `${nodeJobs.length} Node Job data were successfully ingested to node_job collection`});
        }).catch(error =>{ 
          reject(error);
        }); 
      } catch (error) {
        helpers.out.error( error);
      }
    });
  });
};

/**
 * Update jobs with new Application IDs
 * @param {*} jobs Job IDs and new Application IDs
 */
let updateJobsAppName = async (jobs) => {
  return new Promise((resolve, reject) => {
    let jobsLength = jobs.length;
    let counter = 0;

    // Loop through and update jobs with the new app IDs
    jobs.forEach(async (obj) => {
      try {
        Job.findByIdAndUpdate(obj._id , { ApplicationID: `${obj.ApplicationID}`}, {new: true, useFindAndModify: false}, (err, doc) => {
          if (err) reject(new Error(err));
        })
        counter += 1;
     } catch (e) {
        reject(e)
     }      
    });

    if (counter === jobsLength) {
      resolve({ status: true, nRows: counter });
    }
  });
};

/**
 * 
 * if it doesn't exist in the db already
 * @param {*} nodeJobIngestId // Id of the ingestCollection, in order to keep track of what document to update
 */
Ingestor.injestApplications = async (applicationIngestId, jobs) => {

  
  let allApplications = Array.from(new Set(jobs.map((obj) => obj.ApplicationName)))
  .map( elem => {
    return {
      Name: elem === null ? 'unknown' : elem
  }});

  let getExistingApps = await Application.find({}).lean().exec();

  let getAppNamesOnly = getExistingApps.map(obj => obj.Name ).sort();

  let newAppNames = allApplications.map(obj => {
    if(getAppNamesOnly.indexOf(obj.Name) < 0){
        return obj.Name;
    }
  }).sort().filter(item => item !== undefined);

  let objNewAppNames = newAppNames.map(item => {
    return {
      Name: item
    }
  });
  
  return new Promise( async (resolve, reject) => {

    if(allApplications.length > 0){
      try {
        await Application.insertMany(objNewAppNames).then(async (apps)=>{ 
          // Update ingest jobs document
          if(applicationIngestId !== null){
            await Ingest.findOneAndUpdate({ _id: applicationIngestId },{ ApplicationIngested: true }, {upsert: true, useFindAndModify: false}, async (err, doc) => {
              if (err) reject(new Error(err)) 
            });
          }
          if(apps.length > 0 )
            resolve({status: true, message: `${apps.length} applications were successfully ingested`});
            
        }).catch(error =>{ 
          reject(error);
        }); 
      } catch (error) {
        helpers.out.error( error);
      }
    }

    helpers.out.process("Updating job application IDs...");

    let jobsWithAppName = jobs.filter( obj => obj.ApplicationName !== null);

    let appData = await Application.find({});

    let jobsWithNewAppName = jobsWithAppName.map((job) => {
      let checkAppName = helpers.checkIfAppExists(appData, job.ApplicationName);
      if (checkAppName.exists) {
        return {
          _id: job._id,
          ApplicationID: checkAppName.data._id
        };
      }
    });
    
    updateJobsAppName(jobsWithNewAppName).then((res) => {
      helpers.out.success(`${res.nRows} jobs application IDs modified...`);
    }).catch( error => {
      helpers.out.error( error);
    });
  });
};

module.exports = Ingestor;
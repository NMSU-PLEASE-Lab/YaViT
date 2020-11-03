
const { spawn } = require('child_process');
let Helpers = {};

/**
 * Convert units to byte
 * @param {*} meminfo 
 */
Helpers.unitConverter = (meminfo) => {
    const [value, unit] = meminfo;
    switch (unit) {
      case "EB":
        return 1024 * value;
      case "KB":
        return 1024 * value;
      case "MB":
        return 1000000 * value;
      case "GB":
        return 1000000000 * value;
      default:
        throw new Error("Cannot determine unit size");
    }
};

/**
 * Retrieve memory info from Slurm's seff plugin
 * @param {*} seffInfo 
 */
Helpers.getSeffMem = (seffInfo) => {
  // Regular expression for Memory Utilized retrieval
  let seffParam = new RegExp(/[a-z A-Z]+(:) [0-9]+([.])[0-9]+ (EB|KB|MB|GB)/gi);
  let arrSeffInfo = seffInfo.split(/\n/);

  // Iterate the list of seff params and retrieve 'Memory Utilized' value
  let getMemInfo = arrSeffInfo.filter( val => {
    let searchMemInfo = seffParam.test(val);
    if (searchMemInfo === true) {
      return val;
    }
    return false;
  });

  // Separate the mem value and the unit then convert to bytes and return
  let spiltMemInfo = getMemInfo[0].split(":")[1].trim().split(" ", 2);
  let memInfoInBytes = Helpers.unitConverter(spiltMemInfo);
  spiltMemInfo[1] = spiltMemInfo[1].replace('MB', 'M');
  spiltMemInfo[1] = spiltMemInfo[1].replace('EB', 'K')
  spiltMemInfo[1] = spiltMemInfo[1].replace('GB', 'G')
  
  return {
    bytes: memInfoInBytes,
    raw: spiltMemInfo.join("")
  };
};

Helpers.injectParams = async (responseObj) => {
  let result = [];
  let seffQueryPerJobId;
  return new Promise((resolve, reject) => {
    
     responseObj.forEach((obj) => {
      seffQueryPerJobId = spawn('seff', ['-j', obj._id]);

      seffQueryPerJobId.stdout.on('data', seffInfoStream => {
        obj.mem_bytes = Helpers.getSeffMem(`${seffInfoStream}`).bytes;
        obj.mem_used = Helpers.getSeffMem(`${seffInfoStream}`).raw;
        
        result.push(obj)
      });
    }); 

    seffQueryPerJobId.on('close', code => {
      resolve(result);
    });
  });
}
  
/**
 * Convert Epoch to unix timestamp
 * @param {*} value 
 */
Helpers.toTimeStamp = (time) => {
    let dateObj = new Date(time);
    return dateObj.getTime();
};

/**
 * Check if a given item(Application name) exists among the list of applications fetched
 * and return its object information
 * @param {*} obj All application names
 * @param {*} item App name to check for existence
 */
Helpers.checkIfAppExists = (obj, item) => {
  let result = {};

  let apps = obj.map((data) => {
    return data.Name;
  });

  let checker = apps.includes(item);

  result.appNames = apps;
  result.exists = checker;

  if (checker) {
    result.index = apps.indexOf(item);
    const { _id, Name } = obj[result.index];
    result.data = { _id, Name };
  }

  return result;
};

module.exports = Helpers;
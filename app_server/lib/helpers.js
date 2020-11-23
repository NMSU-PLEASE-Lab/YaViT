
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

  let defaultMem = ['0.00', 'MB'];

  getMemInfo = getMemInfo.length !== 0 ? getMemInfo : null;

  // Separate the mem value and the unit then convert to bytes and return
  let splitMemInfo = getMemInfo !== null ? getMemInfo[0].split(":")[1].trim().split(" ", 2) : defaultMem;
  let memInfoInBytes = Helpers.unitConverter(splitMemInfo);
  splitMemInfo[1] = splitMemInfo[1].replace('MB', 'M');
  splitMemInfo[1] = splitMemInfo[1].replace('EB', 'K')
  splitMemInfo[1] = splitMemInfo[1].replace('GB', 'G')
  
  return {
    bytes: memInfoInBytes,
    raw: splitMemInfo.join("")
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
 * @param {*} obj Object
 * @param {*} item String
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

/**
 * pluralize words
 * @param {*} size Array
 * @param {*} word String
 */
Helpers.pluralize = (size, word) => {
  return (size.length > 0 ) ? `${word}s` : `${word}`;
};

module.exports = Helpers;
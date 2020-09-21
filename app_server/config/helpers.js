
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
    let arrSeffInfo = seffInfo.split("\n");
  
    // Iterate the list of seff params and retrieve 'Memory Utilized' value
    let getMemInfo = arrSeffInfo.filter( val => {
      let searchMemInfo = seffParam.test(val);
      if (searchMemInfo === true) {
        return val;
      }
      return false;
    });
  
    // Separate the mem value and the unit then convert to bytes and return
    let spiltMemInfo = getMemInfo[0].split(":")[1].trim().split(" ");
    let memInfoInBytes = Helpers.unitConverter(spiltMemInfo);
  
    return {
      bytes: memInfoInBytes,
      raw: spiltMemInfo.join("")
    };
};
  

/**
 * Convert Epoch to unix timestamp
 * @param {*} value 
 */
Helpers.toTimeStamp = (time) => {
    let dateObj = new Date(time);
    return dateObj.getTime();
};

module.exports = Helpers;
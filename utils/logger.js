
const chalk = require("chalk");

/**
 * @Global logger utility
 **/
global.log = {
  info:    (msg) => console.log(chalk.blue("[INFO]"), msg),
  warn:    (msg) => console.log(chalk.yellow("[WARN]"), msg),
  error:   (msg) => console.log(chalk.red("[ERROR]"), msg),
  success: (msg) => console.log(chalk.green("[SUCCESS]"), msg),
  event:   (msg) => console.log(chalk.magenta("[EVENT]"), msg)
};

/**
* @Notice 
* this is only optional if you want lke this 
// Option A (recommended):

const log = require("./logger");

// Option B:

require("./logger"); // sets global.log

// later: global.log.info("message")
**/

module.exports = global.log;

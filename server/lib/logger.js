const chalk = require('chalk');
class Logger {
  constructor() {
  }
  debug(message) {
    console.log(chalk.green(message));
  }
  info(message) {
    console.log(chalk.blue(message));
  }
}

module.exports = Logger;
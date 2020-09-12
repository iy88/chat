/*
 * @Author: iy88 
 * @Date: 2020-07-21 22:04:11 
 * @Last Modified by: iy88
 * @Last Modified time: 2020-09-11 19:41:38
 */
const mysql = require('mysql')

/**
 * @constructor MySQLTools
 */
class MySQLTools {
  /**
   * MySQLtools constructor
   * @param config
   * @param logger 
   */
  constructor(config, logger) {
    if (config) {
      this.pool = mysql.createPool(config);
      this.config = config;
    }
    if (logger) {
      this.logger = logger;
    }
  }

  /**
   * mysql config
   * @param config 
   */
  conf(config) {
    if (config) {
      this.pool = mysql.createPool(config);
      this.config = config;
      return this;
    } else {
      throw new ReferenceError('param lose');
    }
  }

  /**
   * then
   * @param resolve 
   * @param reject 
   */
  then(resolve, reject) {
    if (this.__promise__) {
      return this.__promise__.then(resolve, reject);
    } else {
      return Promise.resolve(undefined).then(resolve, reject);
    }
  }

  /**
   * use database
   * @param databaseName
   */
  use(databaseName) {
    if (databaseName) {
      this.db = databaseName;
      return this;
    } else {
      throw new ReferenceError('param lose');
    }
  }

  /**
   * do sql
   * @param sql 
   * @param cb 
   */
  doSql(sql, cb) {
    if (this.pool) {
      if (cb) {
        this.pool.getConnection((getConnectionError, connection) => {
          getConnectionError ? cb(getConnectionError) : '';
          if (this.logger) {
            this.logger(mysql.format(sql, []));
          }
          connection.query(mysql.format(sql, []), cb);
        })
      } else {
        this.__promise__ = new Promise((resolve, reject) => {
          this.pool.getConnection((getConnectionError, connection) => {
            getConnectionError ? reject(getConnectionError) : '';
            if (this.logger) {
              this.logger(mysql.format(sql, []));
            }
            connection.query(mysql.format(sql, []), (queryError, results, fields) => {
              resolve({ error: queryError, results, fields })
            });
          })
        })
      }
      return this;
    } else {
      throw new ReferenceError('please config first');
    }
  }

  /**
   * create
   * @param type 
   * @param name 
   * @param any 
   * @param cb 
   */
  create(type, name, any, cb) {
    if (this.pool) {
      if (type === 'table') {
        if (name) {
          let sql = `create table `;
          if (typeof any === 'object' && any.checkExists === true) {
            sql += 'if not exists ';
          }
          sql += name;
          if (typeof any === 'object' && any.desc) {
            sql += '(';
            let keys = Object.keys(any.desc);
            for (let i = 0; i < keys.length; i++) {
              sql += keys[i] + ' ' + any.desc[keys[i]];
              if (i !== keys.length - 1) {
                sql += ',';
              }
            }
            sql += ')';
          } else if (typeof any === 'string') {
            sql += any;
          }
          if (any && typeof any === 'function' || typeof cb === 'function') {
            return this.doSql(sql, cb || any);
          } else {
            return this.doSql(sql);
          }
        } else {
          throw new Error('please input name');
        }
      } else if (type === 'database') {
        if (name) {
          let sql = `create database `;
          if (any === true) {
            sql += 'if not exists ';
          }
          sql += name;
          if (typeof any === 'function' || typeof cb === 'function') {
            return this.doSql(sql, cb || any);
          } else {
            return this.doSql(sql);
          }
        } else {
          throw new Error('please input name');
        }
      }
    } else {
      throw new Error('please config first');
    }
  }

  /**
   * select
   * @param exp 
   * @param table table name 
   * @param any where and limit or callback function 
   * @param cb callback function
   */
  select(exp, table, any, cb) {
    if (this.pool) {
      if (this.config.database || this.db) {
        if (exp && table) {
          let sql = `select ${exp} from ${this.db ? this.db + '.' + table : table}`;
          if (any && typeof any === 'object') {
            if (any.where.main) {
              sql += ' where ';
              let key = Object.keys(any.where.main)[0];
              let value = any.where.main[key];
              typeof value === 'number' ? sql += `${key}=${value}` : sql+=`${key}='${value}'`;
            }
            if (any.where.main && any.where.ands) {
              let pairs = any.where.ands;
              // let keys = Object.keys(any.where.ands);
              for (let i = 0; i < pairs.length; i++) {
                let key = Object.keys(pairs[i]);
                let value = pairs[i][key];
                typeof value === 'number' ? sql += ` and ${key}=${value}` : sql += ` and ${key}='${value}'`;
              }
            }
            if (any.limit && any.limit.start) {
              sql = `${sql} limit ${any.limit.start} ${any.limit.end ? ',' + any.limit.end : ''}`;
            }
          } else if (typeof any === 'string') {
            sql += ' ' + any;
          }
          if (any && typeof any === 'function' || typeof cb === 'function') {
            return this.doSql(sql, cb || any);
          } else {
            return this.doSql(sql);
          }
        } else {
          throw new Error('param lost');
        }
      } else {
        throw new Error('database not config');
      }
    } else {
      throw new Error('please config first');
    }
  }

  /**
   * insert
   * @param table 
   * @param pairs 
   * @param cb 
   */
  insert(table, pairs, cb) {
    if (this.pool) {
      if (table) {
        if (pairs) {
          let sql = `insert into ${table} (${Object.keys(pairs).join()}) values (`;
          for (let i = 0; i < Object.keys(pairs).length; i++) {
            typeof pairs[Object.keys(pairs)[i]] === 'number' ? sql += pairs[Object.keys(pairs)[i]] : sql += `'${pairs[Object.keys(pairs)[i]]}'`;
            if (i !== Object.keys(pairs).length - 1) {
              sql += ',';
            }
          }
          sql += ')';
          if (cb) {
            return this.doSql(sql, cb);
          } else {
            return this.doSql(sql);
          }
        } else {
          throw new Error('please input data');
        }
      } else {
        throw new Error('please input table name');
      }

    } else {
      throw new Error('please config first');
    }
  }

  /**
   * update
   * @param table 
   * @param pairs 
   * @param any 
   * @param cb 
   */
  update(table, pairs, any, cb) {
    if (this.pool) {
      if (table) {
        if (pairs) {
          let sql = `update ${table} set `
          let keys = Object.keys(pairs);
          for (let i = 0; i < keys.length; i++) {
            typeof pairs[keys[i]] === 'number' ? sql += `${keys[i] + '=' + pairs[keys[i]]}` : sql += `${keys[i] + '="' + pairs[keys[i]]}"`;
            if (i !== Object.keys(pairs).length - 1) {
              sql += ',';
            }
          }
          if (typeof any === 'object') {
            sql += ' where ';
            typeof any.main[Object.keys(any.main)[0]] === 'number' ? sql += Object.keys(any.main)[0] + '=' + any.main[Object.keys(any.main)[0]] : sql += Object.keys(any.main)[0] + '="' + any.main[Object.keys(any.main)[0]] + '"';
            if (any.ands) {
              for (let i = 0; i < any.ands.length; i++) {
                let key = Object.keys(any.ands[i])[0];
                let value = any.ands[i][key];
                typeof value === 'number' ? sql += ` and ${key}=${value}` : sql += ` and ${key}='${value}'`;
              }
            }
            if (any.ands && any.or) {
              let key = any.or.keys()[0];
              let o = any.or;
              typeof o[key] === 'number' ? sql += ` or ${key}=${o[key]}` : sql += ` or ${key}='${o[key]}'`;
            }
          } else if (typeof any === 'string') {
            sql += any;
          }
          if (typeof any === 'function' || typeof cb === 'function') {
            return this.doSql(sql, cb || any);
          } else {
            return this.doSql(sql);
          }
        } else {
          throw new Error('please input data');
        }
      } else {
        throw new Error('please input table name')
      }
    } else {
      throw new Error('please config first');
    }
  }

  /**
     * delete
     * @param table 
     * @param any 
     * @param cb 
     */
  delete(table, any, cb) {
    if (this.pool) {
      if (table) {
        let sql = `delete from ${table}`;
        if (typeof any === 'object') {
          if (any.where.main) {
            sql += ' ';
            let key = Object.keys(any.where.main)[0];
            let value = any.where.main[key];
            typeof value === 'number' ? sql += `${key}=${value}` : `${key}='${value}'`;
          }
          if (any.where.main && any.where.ands) {
            let keys = Object.keys(any.where.ands);
            for (let i = 0; i < keys.length; i++) {
              typeof any.where.ands[i][keys[i]] === 'number' ? sql += ` and ${keys[i]}=${any.where.ands[i][keys[i]]}` : sql += ` and ${keys[i]}='${any.where.ands[i][keys[i]]}'`;
            }
          }
        }
        if (typeof any === 'function' || typeof cb === 'function') {
          return this.doSql(sql, cb || any);
        } else {
          return this.doSql(sql);
        }
      } else {
        throw new ReferenceError('please input table name');
      }
    } else {
      throw new ReferenceError('please config first');
    }
  }

  /**
   * drop
   * @param type 
   * @param name 
   * @param any 
   * @param cb 
   */
  drop(type, name, any, cb) {
    if (this.pool) {
      if (type === 'database' || type === 'table') {
        if (name) {
          let sql = `drop ${type} `;
          if (any === true) {
            sql += 'if exists ';
          }
          sql += name;
          if (typeof cb === 'function' || typeof any === 'function') {
            return this.doSql(sql, cb || any);
          } else {
            return this.doSql(sql);
          }
        } else {
          throw new Error('please input name');
        }
      } else {
        throw new Error('type is not support');
      }
    } else {
      throw new Error('please config first');
    }
  }

  /**
   * truncate
   * @param type 
   * @param name 
   * @param cb 
   */
  truncate(type, name, cb) {
    if (type) {
      if (name) {
        let sql = `truncate ${type} ${name}`;
        if (typeof cb === 'function') {
          return this.doSql(sql, cb);
        } else {
          return this.doSql(sql);
        }
      } else {
        throw new Error('please input name');
      }
    } else {
      throw new Error('please input type');
    }
  }

}
module.exports = MySQLTools;
const WebSocket = require('ws');
const redis = require('redis');
const pool = require('./lib/mysql');
const md5 = require('./lib/md5');
const config = require('./config');
const Logger = require('./lib/logger');
const createTable = require('./lib/createTable');
const hash = require('./lib/hash');
const redisClient = redis.createClient(...config.redis);
const chatMain = new pool({ ...config.mysql, database: 'chat_main' });
const chatUserInfo = new pool({ ...config.mysql, database: 'chat_userinfo' });
const chatGroupInfo = new pool({ ...config.mysql, database: 'chat_groupinfo' });
const EXPIRE_DELAY = 1 * 60 * 60;
let logger = new Logger();
const wss = new WebSocket.Server({
  port: 1026,
  perMessageDeflate: false,
}, () => {
  logger.info('[info] websocket server listening at ws://localhost:1026');
  let users = {};
  wss.on('connection', (wsc) => {
    let uid = null;
    wsc.on('message', (message) => {
      logger.debug(`[debug] received: ${message}`);
      try {
        let req = JSON.parse(message);
        logger.info(`[info] action: ${req.action ? req.action : 'none'}`);
        if (req.action === 'login') {
          if (req.type === 1) {
            logger.info('[info] login by token');
            if (!uid) {
              logger.debug('[debug] not logged in yet');
              if (req.tk) {
                logger.debug('[debug] parameters are complete');
                redisClient.get(`ltk:${req.tk}`, (error, reply) => {
                  if (error) {
                    logger.info('[info] redis error');
                    wsc.send(JSON.stringify({ action: 'login', type: 1, code: -1000, detail: 'SE' }));
                  } else {
                    if (reply) {
                      logger.debug('[debug] login information found');
                      uid = JSON.parse(reply).uid;
                      if (users[uid]) {
                        logger.debug('[debug] this user already has a logged in connection');
                        logger.debug('[debug] login status does not expired');
                        users[uid].close();
                        users[uid] = wsc;
                        // del ltk:oldToken, set ls:uid => ndwToken, set ltk:newTokne => JSON.stringify({uid,nickname})
                        let oldToken = JSON.parse(reply).token;
                        let newToken = md5(new Date().toString());
                        redisClient.del(`ltk:${oldToken}`, (error) => {
                          if (error) {
                            logger.info('[info] redis error');
                            wsc.send(JSON.stringify({ action: 'login', type: 1, code: -1000, detial: 'SE' }));
                          } else {
                            redisClient.set(`ls:${uid}`, newToken, (error) => {
                              if (error) {
                                logger.info('[info] redis error');
                                wsc.send(JSON.stringify({ action: 'login', type: 1, code: -1000, detial: 'SE' }));
                              } else {
                                redisClient.set(`ltk:${newToken}`, JSON.stringify({ uid, nickname: results[0].nickname }), (error) => {
                                  if (error) {
                                    logger.info('[info] redis error');
                                    wsc.send(JSON.stringify({ action: 'login', type: 1, code: -1000, detial: 'SE' }));
                                  } else {
                                    redisClient.expire(`ltk:${newToken}`, EXPIRE_DELAY, (error) => {
                                      if (error) {
                                        logger.info('[info] redis error');
                                        wsc.send(JSON.stringify({ action: 'login', type: 1, code: -1000, detial: 'SE' }));
                                      } else {
                                        redisClient.expire(`ls:${uid}`, EXPIRE_DELAY, (error) => {
                                          if (error) {
                                            logger.info('[info] redis error');
                                            wsc.send(JSON.stringify({ action: 'login', type: 1, code: -1000, detial: 'SE' }));
                                          } else {
                                            logger.info('[info] login successfully');
                                            wsc.send(JSON.stringify({ action: 'login', type: 1, code: 1, detail: 'S', data: { nickname: results[0].nickname, token: newToken } }));
                                          }
                                        })
                                      }
                                    })
                                  }
                                })
                              }
                            })
                          }
                        })
                      } else {
                        logger.debug('[debug] this user does not have a logged in connection');
                        logger.debug('[debug] login status does not expired');
                        users[uid] = wsc;
                        let oldToken = JSON.parse(reply).token;
                        redisClient.expire(`ltk:${oldToken}`, EXPIRE_DELAY, (error) => {
                          if (error) {
                            logger.info('[info] redis error');
                            wsc.send(JSON.stringify({ action: 'login', type: 1, code: -1000, detial: 'SE' }));
                          } else {
                            redisClient.expire(`ls:${uid}`, EXPIRE_DELAY, (error) => {
                              if (error) {
                                logger.info('[info] redis error');
                                wsc.send(JSON.stringify({ action: 'login', type: 1, code: -1000, detial: 'SE' }));
                              } else {
                                logger.info('[info] login successfully');
                                wsc.send(JSON.stringify({ action: 'login', type: 1, code: 1, detail: 'S', data: { nickname: results[0].nickname, token: oldToken } }));
                              }
                            })
                          }
                        })
                      }
                    } else {
                      logger.debug('[debug] login information not found');
                      wsc.send(JSON.stringify({ action: 'login', type: 1, code: 0, detail: 'TI' }));
                    }
                  }
                })
              } else {
                logger.debug('[debug] missing parameters');
                wsc.send(JSON.stringify({ action: 'login', type: 1, code: -999, detail: 'PL' }));
              }
            } else {
              logger.debug('[debug] Logged in');
              wsc.send(JSON.stringify({ action: 'login', type: 1, code: -1, detail: 'AL' }));
            }
          } else {
            logger.info('[info] login by account & password (default)');
            if (!uid) {
              logger.debug('[debug] not logged in yet');
              if (req.a && req.p) {
                logger.debug('[debug] parameters are complete');
                chatMain.select('uid,nickname', 'users', { where: { main: { account: req.a }, ands: [{ password: req.p }] } }).then(({ error, results }) => {
                  if (!error) {
                    if (results.length !== 0) {
                      logger.debug('[debug] user information found');
                      uid = results[0].uid;
                      if (users[uid]) {
                        logger.debug('[debug] this user already has a logged in connection');
                        users[uid].close();
                        users[uid] = wsc;
                        // del ltk:oldToken, set ls:uid => ndwToken, set ltk:newTokne => JSON.stringify({uid,nickname})
                        redisClient.get(`ls:${uid}`, (error, reply) => {
                          if (error) {
                            logger.info('[info] redis error');
                            wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                          } else {
                            if (reply) {
                              logger.debug('[debug] login status does not expired');
                              let oldToken = reply;
                              let newToken = md5(new Date().toString());
                              redisClient.del(`ltk:${oldToken}`, (error) => {
                                if (error) {
                                  logger.info('[info] redis error');
                                  wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                } else {
                                  redisClient.set(`ls:${uid}`, newToken, (error) => {
                                    if (error) {
                                      logger.info('[info] redis error');
                                      wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                    } else {
                                      redisClient.set(`ltk:${newToken}`, JSON.stringify({ uid, nickname: results[0].nickname }), (error) => {
                                        if (error) {
                                          logger.info('[info] redis error');
                                          wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                        } else {
                                          redisClient.expire(`ltk:${newToken}`, EXPIRE_DELAY, (error) => {
                                            if (error) {
                                              logger.info('[info] redis error');
                                              wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                            } else {
                                              redisClient.expire(`ls:${uid}`, EXPIRE_DELAY, (error) => {
                                                if (error) {
                                                  logger.info('[info] redis error');
                                                  wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                                } else {
                                                  logger.info('[info] login successfully');
                                                  wsc.send(JSON.stringify({ action: 'login', type: 0, code: 1, detail: 'S', data: { nickname: results[0].nickname, token: newToken } }));
                                                }
                                              })
                                            }
                                          })
                                        }
                                      })
                                    }
                                  })
                                }
                              })
                            } else {
                              logger.debug('[debug] login status expired');
                              let newToken = md5(new Date().toString());
                              redisClient.set(`ls:${uid}`, newToken, (error) => {
                                if (error) {
                                  logger.info('[info] redis error');
                                  wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                } else {
                                  redisClient.set(`ltk:${newToken}`, JSON.stringify({ uid, nickname: results[0].nickname }), (error) => {
                                    if (error) {
                                      logger.info('[info] redis error');
                                      wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                    } else {
                                      redisClient.expire(`ltk:${newToken}`, EXPIRE_DELAY, (error) => {
                                        if (error) {
                                          logger.info('[info] redis error');
                                          wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                        } else {
                                          redisClient.expire(`ls:${uid}`, EXPIRE_DELAY, (error) => {
                                            if (error) {
                                              logger.info('[info] redis error');
                                              wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                            } else {
                                              logger.info('[info] login successfully');
                                              wsc.send(JSON.stringify({ action: 'login', type: 0, code: 1, detail: 'S', data: { nickname: results[0].nickname, token: newToken } }));
                                            }
                                          })
                                        }
                                      })
                                    }
                                  })
                                }
                              })
                            }
                          }
                        })
                      } else {
                        logger.debug('[debug] this user does not have a logged in connection');
                        users[uid] = wsc;
                        redisClient.get(`ls:${uid}`, (error, reply) => {
                          if (error) {
                            logger.info('[info] redis error');
                            wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                          } else {
                            if (reply) {
                              logger.debug('[debug] login status does not expired');
                              let oldToken = reply;
                              redisClient.expire(`ltk:${oldToken}`, EXPIRE_DELAY, (error) => {
                                if (error) {
                                  logger.info('[info] redis error');
                                  wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                } else {
                                  redisClient.expire(`ls:${uid}`, EXPIRE_DELAY, (error) => {
                                    if (error) {
                                      logger.info('[info] redis error');
                                      wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                    } else {
                                      logger.info('[info] login successfully');
                                      wsc.send(JSON.stringify({ action: 'login', type: 0, code: 1, detail: 'S', data: { nickname: results[0].nickname, token: oldToken } }));
                                    }
                                  })
                                }
                              })
                            } else {
                              logger.debug('[debug] login status expired');
                              let newToken = md5(new Date().toString());
                              redisClient.set(`ls:${uid}`, newToken, (error) => {
                                if (error) {
                                  logger.info('[info] redis error');
                                  wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                } else {
                                  redisClient.set(`ltk:${newToken}`, JSON.stringify({ uid, nickname: results[0].nickname }), (error) => {
                                    if (error) {
                                      logger.info('[info] redis error');
                                      wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                    } else {
                                      redisClient.expire(`ltk:${newToken}`, EXPIRE_DELAY, (error) => {
                                        if (error) {
                                          logger.info('[info] redis error');
                                          wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                        } else {
                                          redisClient.expire(`ls:${uid}`, EXPIRE_DELAY, (error) => {
                                            if (error) {
                                              logger.info('[info] redis error');
                                              wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detial: 'SE' }));
                                            } else {
                                              logger.info('[info] login successfully');
                                              wsc.send(JSON.stringify({ action: 'login', type: 0, code: 1, detail: 'S', data: { nickname: results[0].nickname, token: newToken } }));
                                            }
                                          })
                                        }
                                      })
                                    }
                                  })
                                }
                              })
                            }
                          }
                        })
                      }
                    } else {
                      logger.debug('[debug] user information not found');
                      wsc.send(JSON.stringify({ action: 'login', type: 0, code: 0, detail: 'EAOEP' }));
                    }
                  } else {
                    logger.info('[info] mysql error');
                    wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1000, detail: 'SE' }));
                  }
                })
              } else {
                logger.debug('[debug] missing parameters');
                wsc.send(JSON.stringify({ action: 'login', type: 0, code: -999, detail: 'PL' }));
              }
            } else {
              logger.debug('[debug] Logged in');
              wsc.send(JSON.stringify({ action: 'login', type: 0, code: -1, detail: 'AL' }));
            }
          }
        } else if (req.action === 'jp') {
          if (uid) {
            if (req.gid) {
              logger.debug('[debug] parameters are complete');
              chatMain.select('1', '`groups`', { where: { main: { gid: req.gid } } }).then(({ error, results }) => {
                if (error) {
                  logger.info('[info] mysql error');
                  wsc.send(JSON.stringify({ action: 'jp', code: -1000, detail: 'SE' }));
                } else {
                  if (results.length > 0) {
                    let jointime = new Date().toJSON();
                    chatGroupInfo.insert(`group_${req.gid}`, { uid: uid, jointime }).then(({ error }) => {
                      if (error && error.errno === 1062) {
                        logger.debug('[debug] has joined this group');
                        wsc.send(JSON.stringify({ action: 'jp', code: 0, detail: 'AJG' }));
                      } else if (!error) {
                        chatUserInfo.insert(`user_${uid}_groups`, { gid: req.gid, jointime }).then(({ error }) => {
                          if (error && error.errno === 1062) {
                            logger.debug('[debug] has joined this group');
                            wsc.send(JSON.stringify({ action: 'jp', code: 0, detail: 'AJG' }));
                          } else if (!error) {
                            logger.info('[info] join group successfully');
                            wsc.send(JSON.stringify({ action: 'jp', code: 1, detail: 'S' }));
                          } else {
                            logger.info('[info] mysql error');
                            wsc.send(JSON.stringify({ action: 'jp', code: -1000, detail: 'SE' }));
                          }
                        })
                      } else {
                        logger.info('[info] mysql error');
                        wsc.send(JSON.stringify({ action: 'jp', code: -1000, detail: 'SE' }));
                      }
                    })
                  } else {
                    logger.debug('[debug] no such group');
                    wsc.send(JSON.stringify({ action: 'jp', code: -1, detail: 'NTG' }));
                  }
                }
              })
            } else {
              logger.debug('[debug] missing parameters');
              wsc.send(JSON.stringify({ action: 'jp', code: -999, detail: 'PL' }));
            }
          } else {
            logger.debug('[debug] not logged in');
            wsc.send(JSON.stringify({ action: 'jp', code: -2, detail: 'NL' }));
          }
        } else if (req.action === 'au') {
          if (uid) {
            if (req.uid) {
              logger.debug('[debug] parameters are complete');
              chatMain.select('1', 'users', { where: { main: { uid: req.uid } } }).then(({ error, results }) => {
                if (error) {
                  logger.info('[info] mysql error');
                  wsc.send(JSON.stringify({ action: 'au', code: -1000, detail: 'SE' }));
                } else {
                  if (results.length > 0) {
                    let addtime = new Date().toJSON();
                    chatUserInfo.insert(`user_${req.uid}_friends`, { uid: uid, addtime }).then(({ error }) => {
                      if (error && error.errno === 1026) {
                        logger.debug('[debug] has been added as a friend');
                        wsc.send(JSON.stringify({ action: 'au', code: 0, detail: 'AAU' }));
                      } else if (!error) {
                        chatUserInfo.insert(`user_${uid}_friends`, { uid: req.uid, addtime }).then(({ error }) => {
                          if (error && error.errno === 1026) {
                            logger.debug('[debug] has been added as a friend');
                            wsc.send(JSON.stringify({ action: 'au', code: 0, detail: 'AAU' }));
                          } else if (!error) {
                            logger.info('[info] add friend successfully');
                            wsc.send(JSON.stringify({ action: 'au', code: 1, detail: 'S' }));
                          } else {
                            logger.info('[info] mysql error');
                            wsc.send(JSON.stringify({ action: 'au', code: -1000, detail: 'SE' }));
                          }
                        })
                      } else {
                        logger.info('[info] mysql error');
                        wsc.send(JSON.stringify({ action: 'au', code: -1000, detail: 'SE' }));
                      }
                    })
                  } else {
                    logger.debug('[debug] no such user');
                    wsc.send(JSON.stringify({ action: 'au', code: -1, detail: 'NTU' }));
                  }
                }
              })
            } else {
              logger.debug('[debug] missing parameters');
              wsc.send(JSON.stringify({ action: 'au', code: -999, detail: 'PL' }));
            }
          }
        } else if (req.action === 'reg') {
          if (req.a && req.p) {
            logger.debug('[debug] parameters are complete');
            if (/[a-z0-9]/.test(req.a) && req.a.length >= 3 && req.a.length <= 20 && req.p.length >= 6) {
              logger.debug('[debug] parameters are valid');
              let id = hash(req.a + req.p + (Math.random() + new Date().getTime()));
              chatMain.insert('users', { uid: id, account: req.a, password: req.p }).then(({ error }) => {
                if (error && error.errno === 1026) {
                  logger.debug('[debug] duplicate account');
                  wsc.send(JSON.stringify({ acition: 'reg', code: 0, detail: 'DA' }));
                } else if (!error) {
                  chatUserInfo.doSql(createTable.friends(id)).then(({ error }) => {
                    if (error) {
                      logger.info('[info] mysql error');
                      wsc.send(JSON.stringify({ action: 'reg', code: -1000, detail: 'SE' }));
                    } else {
                      chatUserInfo.doSql(createTable.groups(id)).then(({ error }) => {
                        if (error) {
                          logger.info('[info] mysql error');
                          wsc.send(JSON.stringify({ action: 'reg', code: -1000, detail: 'SE' }));
                        } else {
                          logger.info('[info] register successfully');
                          wsc.send(JSON.stringify({ action: 'reg', code: 1, detail: 'S' }));
                        }
                      })
                    }
                  })
                } else {
                  logger.info('[info] mysql error');
                  wsc.send(JSON.stringify({ action: 'reg', code: -1000, detail: 'SE' }));
                }
              })
            } else {
              logger.debug('[debug] invalid parameter');
              wsc.send(JSON.stringify({ action: 'reg', code: -998, detail: 'IP' }));
            }
          } else {
            logger.debug('[debug] missing parameters');
            wsc.send(JSON.stringify({ action: 'reg', code: -999, detail: 'PL' }));
          }
        } else {
          logger.debug('[debug] no such action');
          wsc.send(JSON.stringify({ action: null, code: -999, detail: 'PL' }));
        }
      } catch (e) {
        wsc.close();
      }
    })
    wsc.on('close', () => {
      if (uid && users[uid]) {
        delete users[uid];
      } else {
        delete uid;
      }
      logger.info('[info] an connection closed,this connection has been cleared');
    })
    wsc.on('error', () => {
      if (uid && users[uid]) {
        delete users[uid];
      } else {
        delete uid;
      }
      logger.info('[info] an error occurred in the connection,this connection has been cleared');
    })
  })
});

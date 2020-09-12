CREATE TABLE `users` (
  `uid` int(10) unsigned NOT NULL,
  `account` varchar(100) NOT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `password` varchar(32) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY (`account`)
)
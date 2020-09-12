function groups(uid) {
  return `CREATE TABLE \`user_${uid}_groups\` (
    \`gid\` int(10) unsigned NOT NULL,
    \`nickname\` varchar(100) DEFAULT NULL,
    \`jointime\` varchar(100) NOT NULL,
    PRIMARY KEY (\`gid\`)
  )`
}
function friends(uid) {
  return `CREATE TABLE \`user_${uid}_friends\` (
    \`uid\` int(10) unsigned NOT NULL,
    \`nickname\` varchar(100) DEFAULT NULL,
    \`addtime\` varchar(100) NOT NULL,
    PRIMARY KEY (\`uid\`)
  )`
}
module.exports = {
  groups,friends  
}
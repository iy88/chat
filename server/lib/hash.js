function hash(key){
  if (Array.prototype.reduce){
    return Math.abs(key.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0));
  }
  let hash = 0;
  if (key.length === 0) return hash;
  for (let i = 0; i < key.length; i++) {
    let character  = key.charCodeAt(i);
    hash  = ((hash<<5)-hash)+character;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
module.exports = hash;
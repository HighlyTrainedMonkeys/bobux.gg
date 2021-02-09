let cache = new Map();

cache.set("adgate", []);
cache.set("ayetstudios", []);

let result = Array.from(cache.get("adgate"), ([name, value]) => ({ name, value }));

console.log(result);
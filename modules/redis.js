let connection;

module.exports.setConnection = (c) => {
  connection = c;
};

module.exports.setStock = async (stock) => {
  try {
    return await connection.set("stock", stock);
  } catch (error) {
    throw error;
  }
};

module.exports.getStock = async () => {
  try {
    return await connection.get("stock");
  } catch (error) {
    throw error;
  }
};

module.exports.getGroups = async () => {
  try {
    return await connection.get("groups");
  } catch (error) {
    throw error;
  }
};

module.exports.getOfferwallCache = async (name) => {
  try {
    return await connection.get(`${name}-offers`);
  } catch (error) {
    throw error;
  }
};

module.exports.setOffers = async (name, offers) => {
  try {
    return await connection.set(`${name}-offers`, JSON.stringify(offers));
  } catch (error) {
    throw error;
  }
};

module.exports.enableTransactionLock = async (rid) => {
  try {
    await connection.sadd("transacting", rid);
  } catch (error) {
    throw error;
  }
};

module.exports.disableTransactionLock = async (rid) => {
  try {
    await connection.srem("transacting", rid);
  } catch (error) {
    throw error;
  }
};

module.exports.isTransactionLocked = async (rid) => {
  try {
    return await connection.sismember("transacting", rid);
  } catch (error) {
    throw error;
  }
};

module.exports.addTransaction = async (rid, transaction) => {
  try {
    await connection.set(`transaction-${rid}`, JSON.stringify(transaction));
  } catch (error) {
    throw error;
  }
};

module.exports.removeTransaction = async (rid) => {
  try {
    await connection.del(`transaction-${rid}`);
  } catch (error) {
    throw error;
  }
};

module.exports.getTransaction = async (rid) => {
  try {
    return JSON.parse(await connection.get(`transaction-${rid}`));
  } catch (error) {
    throw error;
  }
};

module.exports.getGiveawayEntries = async () => {
  try {
    return JSON.parse(await connection.get("giveaway-entries"));
  } catch (error) {
    throw error;
  }
};

module.exports.addGiveawayEntry = async (rid) => {
  try {
    let entries = await this.getGiveawayEntries();
    entries.push(rid);
    await connection.set("giveaway-entries", JSON.stringify(entries));
  } catch (error) {
    throw error;
  }
};

module.exports.clearGiveawayEntries = async () => {
  try {
    await connection.del("giveaway-entries");
  } catch (error) {
    throw error;
  }
};

module.exports.getGiveawayInfo = async () => {
  try {
    return JSON.parse(await connection.get("giveaway-info"));
  } catch (error) {
    throw error;
  }
};

module.exports.setGiveawayInfo = async (info) => {
  try {
    await connection.set("giveaway-info", JSON.stringify(info));
  } catch (error) {
    throw error;
  }
};

module.exports.getGroups = async () => {
  try {
    return JSON.parse(await connection.get("groups"));
  } catch (error) {
    throw error;
  }
};

module.exports.updateGroups = async (groups) => {
  try {
    await connection.set("groups", JSON.stringify(groups));
  } catch (error) {
    throw error;
  }
};


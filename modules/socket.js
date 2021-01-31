//for sending messages to the websocket
const EventEmitter = require("events");

class Emitter extends EventEmitter {}

const emitter = new Emitter();

module.exports = emitter;

'use strict';

const _ = require('lodash');

module.exports = {

    // Returns a room where the history cbuffer is converted into an array
    // for clients. Transforms it so it can be broadcast to clients.
    roomToArray: function(room) {
        var tmp = _.clone(room);
        tmp.history = room.history.toArray();
        delete tmp.clients;
        return tmp;
    }
};
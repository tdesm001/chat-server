'use strict';

const _ = require('lodash');
const debug = require('debug')('app:client');
const assert = require('better-assert');
//const EventEmitter = require('events').EventEmitter;

module.exports = Client;
function Client(server, socket, room, user) {
    if (user) {
        debug('[client] creating client with user in room %j', room);
    } else {
        debug('[client] creating client without user %j', room);
    }

    // Initialize
    this.server = server; // required
    this.socket = socket; // required
    // TODO: Change to roomName
    this.room   = room;   // required
    // user is { id: Int, uname: String, role: String }
    // role is mod | admin | member
    this.user   = user;   // optional

    // Join room
    this.socket.join(this.room);

    this.socket.on('new_message', this.onNewMessage.bind(this));
}

Client.prototype.onNewMessage = function(text, cb) {
    var self = this;

    // Validation

    // User must be auth'd
    if (this.user === undefined) {
        cb('USER_REQUIRED');
        return;
    }

    // User must not be muted
    // However, allow owners, staff, and mods to circumvent this
    // TODO: it would be better to simply prevent /mute from applying to
    //       these users, but that would require loading the unames of app owners/mods
    //       Might be better to do that once we refactor apps to have many owners
    //       and many mods.
    if (self.server.rooms[self.room].muteList[self.user.uname.toLowerCase()] && !_.contains(['admin', 'mod', 'owner'], self.user.role)) {
        this.socket.emit('system_message', 'You are muted');
        return;
    }

    // text required
    if (typeof text !== 'string') {
        this.socket.emit('client_error',
            '`new_message` requires string as first argument');
        return;
    }

    text = text.trim();

    if (text.length < 1 || text.length > 140) {
        this.socket.emit('client_error', '`new_message` text must be 1-140 chars');
        return;
    }

    if (cb && typeof cb !== 'function') {
        this.socket.emit('client_error', '`new_message` requires a callback');
        return;
    }

    let textIsCommand = text.startsWith('/mute') || text.startsWith('/unmute');

    // Ensure user has appropriate role to send commands
    if (textIsCommand && !_.contains(['admin', 'owner', 'mod'], this.user.role)) {
        this.socket.emit('system_message', 'You are not authorized to do that');
        return;
    }

    // Validation success

    debug('[client] new_message:', text);

    if (text.startsWith('/unmute')) {
        let unmuteRegexp = /^\/unmute ([a-z0-9_]+)$/i;

        // TODO: Validate uname
        // TODO: Ensure mods cannot mute MPStaff or Owners
        // TODO: Ensure owners cannot mute MPStaff
        // TODO: Ensure MPStaff cannot mute MPStaff
        // TODO: Ensure uname keys are lowercase

        if (unmuteRegexp.test(text)) {
            debug('valid unmute');
            let match = text.match(unmuteRegexp);
            let uname = match[1];
            // Check if uname is muted
            if (this.server.rooms[this.room].muteList[uname.toLowerCase()]) {
                delete this.server.rooms[this.room].muteList[uname.toLowerCase()];
                this.broadcast('user_unmuted', { uname: uname.toLowerCase() });
                this.socket.emit('system_message', 'User "'+ uname.toLowerCase() +'" unmuted');
                return;
            } else {
                this.socket.emit('system_message', 'User "'+ uname.toLowerCase() +'" not in mutelist');
                return;
            }
        } else {
            this.socket.emit('system_message', 'Invalid unmute command');
            return;
        }
    }

    // TODO: Ensure user is owner/mod/admin
    if (text.startsWith('/mute')) {
        console.log('starts with /mute');
        if (/\/mute [a-z0-9_]+ [\d]+/.test(text)) {
            // Mute
            let match = text.match(/^\/mute ([a-z0-9_]+) ([\d]+)$/i);
            let uname = match[1]; // TODO: validate
            let mins = Number.parseInt(match[2], 10);  // TODO: handle massive numbers. validate
            // TODO: Convert to iso string
            let date = new Date(Date.now() + (1000 * 60 * mins));
            let muteObj = {
                uname: uname,
                mins: mins,
                expires_at: date
            };
            this.server.rooms[this.room].muteList[uname] = muteObj;
            debug('muteList is now:', this.server.rooms[this.room].muteList);
            this.broadcast('user_muted', muteObj);
            this.socket.emit('system_message', 'User "'+ uname +'" muted for '+ mins +' minutes');
            return;
        } else {
            this.socket.emit('system_message', 'Invalid mute command');
            return;
        }
    }

    if (!textIsCommand) {
        this.server.insertMessage(this.room, this.user, text, function(err, message) {
            if (err) {
                cb('INTERNAL_ERROR');
                return;
            }

            self.broadcast('new_message', message);

            // Let user know the message was inserted successfully
            if (cb)
                cb();

        });
    }

};

Client.prototype.broadcast = function(event, data) {
    debug('[Client#broadcast] event: %j, data: %j', event, data);
    assert(typeof event === 'string');
    assert(typeof data === 'object');

    //Send to every client in this room channel including the sender
    this.server.io.to(this.room).emit(event, data);
};

# chat-server

## Usage

When you connect to that chat server, immediately send an "auth" event with this payload:

``` javascript
{
  app_id: Integer,   (Required)
  token_hash: String (Optional)
}
```

For example:

``` javascript
socket.emit('connect', function() {
  socket.emit('auth', authPayload, function(err, data) {
    if (err) ...
  })
});
```

The chat server will automatically subscribe you to the app's lobby channel.

`token_hash` is `sha256(access_token)`. It represents a logged-in user. If missing or if the token_hash is invalid, then the socket will only be able to read new messages and will not be able to create any messages.

You must also provide a callback with signature `fn(err, data)`.

If auth is successful, the `data` response will provide you with the necessary information to sync your chatbox with the server.

`data` looks like this:

``` javascript
{
  // User of the token_hash you provided
  // Only exists if token_hash was provided and valid
  user: {
    id: 69,
    uname: 'donald',
    role: 'admin' | 'mod' | 'owner'
  },
  // The state of the app's lobby channel
  // Always present
  room: {
    // Object of users in the channel, keyed by their case-sensitive usernames
    // Always present
    users: {
      <UNAME>: <OBJECT>,
      foo: { id: 42, uname: 'foo', role: 'admin' | 'mod' | 'owner' }
    },
    // Array of messages in the channel (oldest to newest)
    // - id: Integer, unique incrementing id of message
    // - user: Object
    // - text: String
    // Always present
    history: [
      {
        id: 2,
        user: { uname: 'foo', role: 'owner' },
        text: 'Hello, world!'
      },
      ...
    ]
    // Object of muted unames, keyed by lowercase unames
    // - mins: Integer of mute duration in minutes
    // - expires_at: String of ISO-format timestamp of when the mute ends
    //   e.g. var date = Date.parse(timestamp)
    // TODO: Only present if auth'd user is owner|admin|mod
    muteList: {
      'foo': { uname: 'foo', mins: 30, expires_at: '2015-05-07T21:07:40.322Z' }
    }
  }
}
```

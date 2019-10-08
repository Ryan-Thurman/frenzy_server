# Realtime Draft Lobby API

## Connecting

## Events

All events should use the following schema:

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e", // UUID
  "at": "2018-08-03T14:30:23.438-08:00", // Event timestamp in ISO format with ms-precision
  "data": { } // Data payload, varies by event
}
```

### Client-side events

These are events that may be sent from the client to the server.

#### Responses

When sending events, specify a callback to be notified of success or failure.
The following response objects may be sent back as a param supplied to that callback.

##### Success Message
```js
{
  "originalEventId": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "success": true
}
```

##### Failure Message
```js
{
  "originalEventId": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "success": false,
  "message": "A message explaining what went wrong"
}
```

#### `joinDraftLobby`

A client request to join the draft lobby for a particular fantasy league.

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "at": "2018-08-03T14:30:23.438-08:00",
  "data": {
    // ID of the league whose draft lobby the client is requesting to join
    "fantasyLeagueId": 123,

    // *Optional*
    // When the client fetches the draft object via the REST API,
    // the response will include a `lastEventId` property that
    // should be passed here. The server will then send any events
    // that have since occurred, to catch up the client state
    //
    // To have no catch-up events sent, omit this field entirely.
    // Any falsey value such as `false` or `null` will result
    // all catch-up events being sent.
    "lastEventId": "cb52e9b8-3a46-4ee2-8eb7-a25a8bf34378"
  }
}
```

#### `pickPlayer`

A user's request to pick a specific player during their turn

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "at": "2018-08-03T14:30:23.438-08:00",
  "data": {
    // ID of the league the user is drafting in
    "fantasyLeagueId": 123,
    // ID of the player who the user is attempting to draft
    "proPlayerId": 123,
  }
}
```

### Server-side events

These are events that may be sent from the server to one or all clients.

#### `draftStart`

Sent when the draft starts.

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "at": "2018-08-03T14:30:23.438-08:00",
  "data": {
    "fantasyLeagueId" 123
  }
}
```

#### `draftCancelled`

Sent when the draft is aborted.

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "at": "2018-08-03T14:30:23.438-08:00",
  "data": {
    "fantasyLeagueId": 123,
    "reason": "There were not enough players to start the draft."
  }
}
```

#### `draftEnd`

Sent when the draft is complete.

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "at": "2018-08-03T14:30:23.438-08:00",
  "data": {
    "fantasyLeagueId": 123
  }
}
```

#### `userJoined`

Sent when a user joins the draft lobby.

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "at": "2018-08-03T14:30:23.438-08:00",
  "data": {
    "fantasyLeagueId": 123,
    // ID of the user who just joined the lobby
    "userId": "cb52e9b8-3a46-4ee2-8eb7-a25a8bf34378",
    // Username of the user who just joined the lobby
    "username": "ryan the astounding 268"
  }
}
```

#### `pickTurnStarted`

Sent when a new pick turn starts.

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "at": "2018-08-03T14:30:23.438-08:00",
  "data": {
    "fantasyLeagueId": 123,
    // ID of the team who is now picking
    "fantasyTeamId": 123,
    "currentPickNumber": 4,
    "currentPickStartsAt": "2018-08-03T14:30:23.438-08:00",
    "currentPickEndsAt": "2018-08-03T14:30:23.438-08:00"
  }
}
```

#### `playerDrafted`

Sent when a player is drafted to a team

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "at": "2018-08-03T14:30:23.438-08:00",
  "data": {
    // ID of the league
    "fantasyLeagueId": 123,
    // ID of the team who picked the player
    "fantasyTeamId": 123,
    // The picking turn number
    "pickNumber": 12,
    // ID of the customer who made the pick
    "teamOwnerId": "cb52e9b8-3a46-4ee2-8eb7-a25a8bf34378",
    // Username of the customer who made the pick
    "teamOwnerUsername": "ryan the spectacular 764",
    // ID of the player who was picked
    "proPlayerId": 123,
    // Whether this draft was done automatically because the timer expired
    "wasAutoSelected": false
  }
}
```

#### `noPlayerDrafted`

Sent when no player is drafted during a pick turn because there was no eligible player available

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "at": "2018-08-03T14:30:23.438-08:00",
  "data": {
    // ID of the league
    "fantasyLeagueId": 123,
    // ID of the team who picked the player
    "fantasyTeamId": 123,
    // The picking turn number
    "pickNumber": 12,
  }
}
```

#### `pickTurnEnded`

Sent when a pick turn ends.

```js
{
  "id": "17d166a2-3657-4c83-8f55-c72edc44961e",
  "at": "2018-08-03T14:30:23.438-08:00",
  "data": {
    "fantasyLeagueId": 123,
    // ID of the team who was picking
    "fantasyTeamId": 123,
    "pickNumber": 4,
  }
}
```

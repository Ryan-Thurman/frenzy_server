# Event Rounds

Stats.com assigns some events (notably World Cup events) an eventRound.

Currently we store the `eventRound.name` string as `ProEvent#round` in our DB.

Here are the possible values for the 2018 FIFA world cup:

```
{
    "eventRoundId": 9,
    "name": "Group Stage"
}, {
    "eventRoundId": 10,
    "name": "Round of 16"
}, {
    "eventRoundId": 11,
    "name": "Quarterfinal"
}, {
    "eventRoundId": 12,
    "name": "Semifinal"
}, {
    "eventRoundId": 13,
    "name": "Final"
}, {
    "eventRoundId": 8,
    "name": "Third Place Game"
}
```

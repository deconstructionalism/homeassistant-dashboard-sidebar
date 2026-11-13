/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["user: me"] = 
`- User: Cron -> yes "Holds right now"
row 1: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot user: me */

snapshots["user: someone else"] = 
`- User: Sam -> no "Does not hold right now"
row 1: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot user: someone else */

snapshots["user: me among others"] = 
`- User: Sam, Cron -> yes "Holds right now"
row 1: Condition: User
    Users: [x] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot user: me among others */

snapshots["user: nobody chosen"] = 
`- User: No users chosen -> no "Does not hold right now"
row 1: Condition: User
    Users: [ ] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot user: nobody chosen */

snapshots["user: no users key"] = 
`- User: No users chosen -> needs "Needs attention: users: must be a list of user ids"
row 1: Condition: User
    Users: [ ] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot user: no users key */

snapshots["screen: matches"] = 
`- Screen: (min-width: 1px) -> yes "Holds right now"
row 1: Condition: Screen
    Match: Custom media query
    Media Query: "(min-width: 1px)" | hint: Any CSS media query, like (orientation: portrait).
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot screen: matches */

snapshots["screen: does not match"] = 
`- Screen: (max-width: 1px) -> no "Does not hold right now"
row 1: Condition: Screen
    Match: Custom media query
    Media Query: "(max-width: 1px)" | hint: Any CSS media query, like (orientation: portrait).
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot screen: does not match */

snapshots["screen: empty query"] = 
`- Screen: No screen sizes chosen -> needs "Needs attention: media_query: needs a CSS media query"
row 1: Condition: Screen
    Match: Screen sizes
    Sizes: [ ] Mobile (0px+), [ ] Tablet (768px+), [ ] Desktop (1024px+), [ ] Wide (1280px+) | hint: Same sizes as Home Assistant’s Screen condition.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot screen: empty query */

snapshots["screen: no query"] = 
`- Screen: No screen sizes chosen -> needs "Needs attention: media_query: needs a CSS media query"
row 1: Condition: Screen
    Match: Screen sizes
    Sizes: [ ] Mobile (0px+), [ ] Tablet (768px+), [ ] Desktop (1024px+), [ ] Wide (1280px+) | hint: Same sizes as Home Assistant’s Screen condition.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot screen: no query */

snapshots["time: after, passed"] = 
`- Time: After 22:00 -> yes "Holds right now"
row 1: Condition: Time
    After: 22 : 00 : -- | hint: From this time on. Empty means from midnight.
    Before: -- : -- (disabled) : -- (disabled) | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: after, passed */

snapshots["time: after, not yet"] = 
`- Time: After 23:00 -> no "Does not hold right now"
row 1: Condition: Time
    After: 23 : 00 : -- | hint: From this time on. Empty means from midnight.
    Before: -- : -- (disabled) : -- (disabled) | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: after, not yet */

snapshots["time: after, exactly now"] = 
`- Time: After 22:30 -> yes "Holds right now"
row 1: Condition: Time
    After: 22 : 30 : -- | hint: From this time on. Empty means from midnight.
    Before: -- : -- (disabled) : -- (disabled) | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: after, exactly now */

snapshots["time: after, with seconds"] = 
`- Time: After 22:29:59 -> yes "Holds right now"
row 1: Condition: Time
    After: 22 : 29 : 59 | hint: From this time on. Empty means from midnight.
    Before: -- : -- (disabled) : -- (disabled) | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: after, with seconds */

snapshots["time: before, exactly now (inclusive)"] = 
`- Time: Before 22:30 -> yes "Holds right now"
row 1: Condition: Time
    After: -- : -- (disabled) : -- (disabled) | hint: From this time on. Empty means from midnight.
    Before: 22 : 30 : -- | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: before, exactly now (inclusive) */

snapshots["time: before, just passed"] = 
`- Time: Before 22:29:59 -> no "Does not hold right now"
row 1: Condition: Time
    After: -- : -- (disabled) : -- (disabled) | hint: From this time on. Empty means from midnight.
    Before: 22 : 29 : 59 | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: before, just passed */

snapshots["time: before, ahead"] = 
`- Time: Before 23:00 -> yes "Holds right now"
row 1: Condition: Time
    After: -- : -- (disabled) : -- (disabled) | hint: From this time on. Empty means from midnight.
    Before: 23 : 00 : -- | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: before, ahead */

snapshots["time: window, inside"] = 
`- Time: After 08:00, before 23:00 -> yes "Holds right now"
row 1: Condition: Time
    After: 08 : 00 : -- | hint: From this time on. Empty means from midnight.
    Before: 23 : 00 : -- | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: window, inside */

snapshots["time: window, outside"] = 
`- Time: After 08:00, before 22:00 -> no "Does not hold right now"
row 1: Condition: Time
    After: 08 : 00 : -- | hint: From this time on. Empty means from midnight.
    Before: 22 : 00 : -- | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: window, outside */

snapshots["time: overnight, inside"] = 
`- Time: After 22:00, before 06:00 (overnight) -> yes "Holds right now"
row 1: Condition: Time
    After: 22 : 00 : -- | hint: From this time on. Empty means from midnight.
    Before: 06 : 00 : -- | hint: Overnight: from 22:00 until 06:00 the next day.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: overnight, inside */

snapshots["time: overnight, outside"] = 
`- Time: After 23:00, before 06:00 (overnight) -> no "Does not hold right now"
row 1: Condition: Time
    After: 23 : 00 : -- | hint: From this time on. Empty means from midnight.
    Before: 06 : 00 : -- | hint: Overnight: from 23:00 until 06:00 the next day.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: overnight, outside */

snapshots["time: same time both ends"] = 
`- Time: After 22:30, before 22:30 -> needs "Needs attention: after and before must differ"
row 1: Condition: Time
    After: 22 : 30 : -- | hint: From this time on. Empty means from midnight.
    Before: 22 : 30 : -- | ERROR Must differ from After. | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: same time both ends */

snapshots["time: today"] = 
`- Time: Thu -> yes "Holds right now"
row 1: Condition: Time
    After: -- : -- (disabled) : -- (disabled) | hint: From this time on. Empty means from midnight.
    Before: -- : -- (disabled) : -- (disabled) | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [x] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: today */

snapshots["time: other days"] = 
`- Time: Mon, Fri -> no "Does not hold right now"
row 1: Condition: Time
    After: -- : -- (disabled) : -- (disabled) | hint: From this time on. Empty means from midnight.
    Before: -- : -- (disabled) : -- (disabled) | hint: Until this time. Earlier than After crosses midnight.
    Days: [x] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [x] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: other days */

snapshots["time: today in the window"] = 
`- Time: After 22:00, Thu, Fri -> yes "Holds right now"
row 1: Condition: Time
    After: 22 : 00 : -- | hint: From this time on. Empty means from midnight.
    Before: -- : -- (disabled) : -- (disabled) | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [x] Thu, [x] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: today in the window */

snapshots["time: overnight starting tomorrow"] = 
`- Time: After 22:00, before 06:00, Fri (overnight) -> no "Does not hold right now"
row 1: Condition: Time
    After: 22 : 00 : -- | hint: From this time on. Empty means from midnight.
    Before: 06 : 00 : -- | hint: Overnight: from 22:00 until 06:00 the next day.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [x] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: overnight starting tomorrow */

snapshots["time: no fields"] = 
`- Time: Any time -> needs "Needs attention: needs after, before or weekdays"
row 1: Condition: Time
    After: -- : -- (disabled) : -- (disabled) | hint: From this time on. Empty means from midnight.
    Before: -- : -- (disabled) : -- (disabled) | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: no fields */

snapshots["time: not a time"] = 
`- Time: After 25:00 -> needs "Needs attention: after: must be a time like 08:00 or 08:00:00"
row 1: Condition: Time
    After: -- : -- (disabled) : -- (disabled) | ERROR 25:00 is not a time; pick one. | hint: From this time on. Empty means from midnight.
    Before: -- : -- (disabled) : -- (disabled) | hint: Until this time. Earlier than After crosses midnight.
    Days: [ ] Mon, [ ] Tue, [ ] Wed, [ ] Thu, [ ] Fri, [ ] Sat, [ ] Sun | hint: None means every day.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot time: not a time */

snapshots["location: home"] = 
`- Location: You are in Home -> yes "Holds right now"
row 1: Condition: Location
    Check: Where you are | hint: Zones can overlap; where you are is the one zone your person shows.
    Places: [x] Home, [ ] Block, [ ] Work
    Away Also when you are in no zone.: "on" | [ ] | hint: Also when you are in no zone.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: home */

snapshots["location: elsewhere"] = 
`- Location: You are in Work -> no "Does not hold right now"
row 1: Condition: Location
    Check: Where you are | hint: Zones can overlap; where you are is the one zone your person shows.
    Places: [ ] Home, [ ] Block, [x] Work
    Away Also when you are in no zone.: "on" | [ ] | hint: Also when you are in no zone.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: elsewhere */

snapshots["location: away (not away)"] = 
`- Location: You are in Away -> no "Does not hold right now"
row 1: Condition: Location
    Check: Where you are | hint: Zones can overlap; where you are is the one zone your person shows.
    Places: [ ] Home, [ ] Block, [ ] Work
    Away Also when you are in no zone.: "on" | [x] | hint: Also when you are in no zone.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: away (not away) */

snapshots["location: home or away"] = 
`- Location: You are in Home or Away -> yes "Holds right now"
row 1: Condition: Location
    Check: Where you are | hint: Zones can overlap; where you are is the one zone your person shows.
    Places: [x] Home, [ ] Block, [ ] Work
    Away Also when you are in no zone.: "on" | [x] | hint: Also when you are in no zone.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: home or away */

snapshots["location: zone, any"] = 
`- Location: You are in Block -> yes "Holds right now"
row 1: Condition: Location
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [x] Block, [ ] Home, [ ] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: zone, any */

snapshots["location: zone, active only"] = 
`- Location: You are in Block (as your current zone) -> no "Does not hold right now"
row 1: Condition: Location
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [x] Block, [ ] Home, [ ] Work
    Match: Only as your current zone
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: zone, active only */

snapshots["location: home zone, active only"] = 
`- Location: You are in Home (as your current zone) -> yes "Holds right now"
row 1: Condition: Location
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [x] Home, [ ] Work
    Match: Only as your current zone
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: home zone, active only */

snapshots["location: another zone"] = 
`- Location: You are in Work -> no "Does not hold right now"
row 1: Condition: Location
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [ ] Home, [x] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: another zone */

snapshots["location: zones by label"] = 
`- Location: You are in zones labelled mine -> yes "Holds right now"
row 1: Condition: Location
    note: Also targets label_id (edit as YAML).
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [ ] Home, [ ] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: zones by label */

snapshots["location: zones by label, less one"] = 
`- Location: You are in zones labelled mine, except Home, Block -> no "Does not hold right now"
row 1: Condition: Location
    note: Also targets label_id, exclude (edit as YAML).
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [ ] Home, [ ] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: zones by label, less one */

snapshots["location: zone by area"] = 
`- Location: You are in zones in Den -> no "Does not hold right now"
row 1: Condition: Location
    note: Also targets area_id (edit as YAML).
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [ ] Home, [ ] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: zone by area */

snapshots["location: zone by floor"] = 
`- Location: You are in zones on floor up -> no "Does not hold right now"
row 1: Condition: Location
    note: Also targets floor_id (edit as YAML).
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [ ] Home, [ ] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: zone by floor */

snapshots["location: zone by parent device"] = 
`- Location: You are in zones of Zone Hub -> yes "Holds right now"
row 1: Condition: Location
    note: Also targets device_id (edit as YAML).
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [ ] Home, [ ] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: zone by parent device */

snapshots["location: zone by labelled device (no children)"] = 
`- Location: You are in zones labelled zones -> no "Does not hold right now"
row 1: Condition: Location
    note: Also targets label_id (edit as YAML).
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [ ] Home, [ ] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: zone by labelled device (no children) */

snapshots["location: empty target"] = 
`- Location: No places chosen -> no "Does not hold right now"
row 1: Condition: Location
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [ ] Home, [ ] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: empty target */

snapshots["location: target not a mapping"] = 
`- Location: No places chosen -> needs "Needs attention: target: must map entity_id, device_id, area_id, floor_id or label_id to ids"
row 1: Condition: Location
    note: Also targets 0, 1, 2, 3, 4, 5, 6, 7, 8 (edit as YAML).
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [ ] Home, [ ] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: target not a mapping */

snapshots["location: places and target"] = 
`- Location: You are in Work or Home -> needs "Needs attention: use either locations or target, not both"
row 1: Condition: Location
    Check: Which zones you are in | hint: Zones can overlap; where you are is the one zone your person shows.
    Zones: [ ] Block, [x] Home, [ ] Work
    Match: In any of them
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: places and target */

snapshots["location: nothing"] = 
`- Location: No places chosen -> needs "Needs attention: needs locations, target or away"
row 1: Condition: Location
    Check: Where you are | hint: Zones can overlap; where you are is the one zone your person shows.
    Places: [ ] Home, [ ] Block, [ ] Work
    Away Also when you are in no zone.: "on" | [ ] | hint: Also when you are in no zone.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot location: nothing */

snapshots["state: is"] = 
`- State: Kitchen is on -> yes "Holds right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: is */

snapshots["state: is not"] = 
`- State: Kitchen is off -> no "Does not hold right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "off" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: is not */

snapshots["state: any of"] = 
`- State: Kitchen is off or on -> yes "Holds right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "off, on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: any of */

snapshots["state: state_not"] = 
`- State: Kitchen is not off -> yes "Holds right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is not
    States: "off" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: state_not */

snapshots["state: state_not list"] = 
`- State: Kitchen is not on or idle -> no "Does not hold right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is not
    States: "on, idle" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: state_not list */

snapshots["state: both, state wins"] = 
`- State: Kitchen is on -> yes "Holds right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: both, state wins */

snapshots["state: attribute as text"] = 
`- State: Kitchen brightness is 128 -> yes "Holds right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: brightness | hint: Compare an attribute instead of the state.
    Match: Is
    States: "128" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: attribute as text */

snapshots["state: attribute as a number"] = 
`- State: Kitchen brightness is 128 -> no "Does not hold right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: brightness | hint: Compare an attribute instead of the state.
    Match: Is
    States: "128" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: attribute as a number */

snapshots["state: missing attribute is unknown"] = 
`- State: Kitchen nope is unknown -> yes "Holds right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: nope | hint: Compare an attribute instead of the state.
    Match: Is
    States: "unknown" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: missing attribute is unknown */

snapshots["state: missing entity is unknown"] = 
`- State: light.gone is unknown -> server "Waiting for Home Assistant"
row 1: Condition: State
    Entity: "light.gone"
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "unknown" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: missing entity is unknown */

snapshots["state: missing entity, state_not"] = 
`- State: light.gone is not on -> server "Waiting for Home Assistant"
row 1: Condition: State
    Entity: "light.gone"
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is not
    States: "on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: missing entity, state_not */

snapshots["state: value names an entity"] = 
`- State: Kitchen mode is input_select.mode -> yes "Holds right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: mode | hint: Compare an attribute instead of the state.
    Match: Is
    States: "input_select.mode" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: value names an entity */

snapshots["state: value names a missing entity"] = 
`- State: Kitchen is input_select.gone -> no "Does not hold right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "input_select.gone" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: value names a missing entity */

snapshots["state: a number value"] = 
`- State: sensor.five is 5 -> no "Does not hold right now"
row 1: Condition: State
    Entity: picked sensor.five
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "5" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: a number value */

snapshots["state: entity_id form"] = 
`- State: Kitchen is on -> yes "Holds right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: entity_id form */

snapshots["state: entity_id form, for"] = 
`- State: Kitchen is on for 00:05:00 -> server "Waiting for Home Assistant"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "00:05:00" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: entity_id form, for */

snapshots["state: legacy shape"] = 
`- State: Kitchen is on -> yes "Holds right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: legacy shape */

snapshots["state: legacy shape, state_not"] = 
`- State: Hall is not off -> no "Does not hold right now"
row 1: Condition: State
    Entity: picked light.hall
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is not
    States: "off" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: legacy shape, state_not */

snapshots["state: no value"] = 
`- State: Kitchen is not ? -> needs "Needs attention: needs state or state_not"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: no value */

snapshots["state: no entity"] = 
`- State: (no entity) is on -> needs "Needs attention: entity: needs an entity id"
row 1: Condition: State
    Entity: ""
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state: no entity */

snapshots["numeric: above"] = 
`- Numeric State: Temperature above 20 -> yes "Holds right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "20" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: above */

snapshots["numeric: above, equal (strict)"] = 
`- Numeric State: Temperature above 21.5 -> no "Does not hold right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "21.5" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: above, equal (strict) */

snapshots["numeric: below"] = 
`- Numeric State: Temperature below 22 -> yes "Holds right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "" | hint: A number, or an entity whose state is one.
    Below: "22" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: below */

snapshots["numeric: between"] = 
`- Numeric State: Temperature above 20 and below 22 -> yes "Holds right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "20" | hint: A number, or an entity whose state is one.
    Below: "22" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: between */

snapshots["numeric: outside"] = 
`- Numeric State: Temperature above 22 and below 30 -> no "Does not hold right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "22" | hint: A number, or an entity whose state is one.
    Below: "30" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: outside */

snapshots["numeric: numeric text bound"] = 
`- Numeric State: Temperature above 20 -> yes "Holds right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "20" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: numeric text bound */

snapshots["numeric: bound names an entity"] = 
`- Numeric State: Temperature below input_number.limit -> yes "Holds right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "" | hint: A number, or an entity whose state is one.
    Below: "input_number.limit" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: bound names an entity */

snapshots["numeric: lower bound names an entity"] = 
`- Numeric State: Temperature above input_number.limit -> no "Does not hold right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "input_number.limit" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: lower bound names an entity */

snapshots["numeric: junk bound ignored"] = 
`- Numeric State: Temperature above abc -> yes "Holds right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "abc" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: junk bound ignored */

snapshots["numeric: attribute"] = 
`- Numeric State: Temperature target above 19 -> yes "Holds right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: target | hint: Compare an attribute instead of the state.
    Above: "19" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: attribute */

snapshots["numeric: null attribute reads as 0"] = 
`- Numeric State: Temperature nothing above -1 -> yes "Holds right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: nothing | hint: Compare an attribute instead of the state.
    Above: "-1" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: null attribute reads as 0 */

snapshots["numeric: not a number"] = 
`- Numeric State: sensor.text above 0 -> no "Does not hold right now"
row 1: Condition: Numeric State
    Entity: picked sensor.text
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "0" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: not a number */

snapshots["numeric: empty state reads as 0"] = 
`- Numeric State: sensor.empty above -1 -> yes "Holds right now"
row 1: Condition: Numeric State
    Entity: picked sensor.empty
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "-1" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: empty state reads as 0 */

snapshots["numeric: missing entity"] = 
`- Numeric State: sensor.gone below 100 -> server "Waiting for Home Assistant"
row 1: Condition: Numeric State
    Entity: "sensor.gone"
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "" | hint: A number, or an entity whose state is one.
    Below: "100" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: missing entity */

snapshots["numeric: no bounds"] = 
`- Numeric State: Temperature ? -> needs "Needs attention: needs above or below"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: no bounds */

snapshots["numeric: entity_id form"] = 
`- Numeric State: Temperature above 20 -> yes "Holds right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "20" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric: entity_id form */

snapshots["template"] = 
`- Template: {{ true }} -> server "Waiting for Home Assistant"
row 1: Condition: Template
    Template: "{{ true }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot template */

snapshots["template: empty"] = 
`- Template: No template yet -> needs "Needs attention: value_template: needs a template"
row 1: Condition: Template
    Template: "" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot template: empty */

snapshots["sun: after sunset"] = 
`- Sun: After sunset -> server "Waiting for Home Assistant"
row 1: Condition: Sun
    After: Sunset
    After Offset: "-01:00:00" | hint: Like -01:00:00 for an hour before.
    Before: (none)
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot sun: after sunset */

snapshots["sun: bad value"] = 
`- Sun: After noon -> needs "Needs attention: after: must be sunrise or sunset"
row 1: Condition: Sun
    After: (none)
    After Offset: "" | hint: Like -01:00:00 for an hour before.
    Before: (none)
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot sun: bad value */

snapshots["sun: nothing"] = 
`- Sun: No time chosen -> needs "Needs attention: needs after or before"
row 1: Condition: Sun
    After: (none)
    Before: (none)
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot sun: nothing */

snapshots["zone"] = 
`- Zone: Cron is in Home -> server "Waiting for Home Assistant"
row 1: Condition: Zone
    Person or Tracker: picked person.cron | hint: Whose location to check.
    Zones: [ ] Block, [x] Home, [ ] Work | hint: In any of these.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot zone */

snapshots["zone: no zone"] = 
`- Zone: Cron is in ? -> needs "Needs attention: zone: needs a zone"
row 1: Condition: Zone
    Person or Tracker: picked person.cron | hint: Whose location to check.
    Zones: [ ] Block, [ ] Home, [ ] Work | hint: In any of these.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot zone: no zone */

snapshots["device"] = 
`- Device: d1: Is on -> server "Waiting for Home Assistant"
row 1: Condition: Device
    Device: d1
    Condition: is_on | hint: What the device offers. Extra options are in YAML.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot device */

snapshots["device: incomplete"] = 
`- Device: d1 -> needs "Needs attention: domain: needs the device integration; type: needs a condition type"
row 1: Condition: Device
    Device: d1
    Condition: Loading… | hint: What the device offers. Extra options are in YAML.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot device: incomplete */

snapshots["integration condition"] = 
`- Some integration thing: Edited as YAML -> server "Waiting for Home Assistant"
row 1: Condition: Some integration thing
    note: An integration's condition, checked by Home Assistant. Edit it with the tab's Edit As YAML.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot integration condition */

snapshots["view_columns"] = 
`- View columns: Edited as YAML -> yes "Holds right now"
row 1: Condition: View columns
    note: An integration's condition, checked by Home Assistant. Edit it with the tab's Edit As YAML.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot view_columns */

snapshots["turned off"] = 
`- User: Sam (off) -> off "Turned off"
row 1: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn On, Delete Condition`;
/* end snapshot turned off */

snapshots["templated enabled"] = 
`- User: Cron -> server "Waiting for Home Assistant"
row 1: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot templated enabled */

snapshots["and: T,T"] = 
`- And: All of these -> yes "Holds right now"
  - User: Cron -> yes "Holds right now"
  - User: Cron -> yes "Holds right now"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot and: T,T */

snapshots["and: T,F"] = 
`- And: All of these -> no "Does not hold right now"
  - User: Cron -> yes "Holds right now"
  - User: Sam -> no "Does not hold right now"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot and: T,F */

snapshots["and: F,T"] = 
`- And: All of these -> no "Does not hold right now"
  - User: Sam -> no "Does not hold right now"
  - User: Cron -> yes "Holds right now"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot and: F,T */

snapshots["and: F,F"] = 
`- And: All of these -> no "Does not hold right now"
  - User: Sam -> no "Does not hold right now"
  - User: Sam -> no "Does not hold right now"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot and: F,F */

snapshots["or: T,T"] = 
`- Or: Any of these -> yes "Holds right now"
  - User: Cron -> yes "Holds right now"
  - User: Cron -> yes "Holds right now"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot or: T,T */

snapshots["or: T,F"] = 
`- Or: Any of these -> yes "Holds right now"
  - User: Cron -> yes "Holds right now"
  - User: Sam -> no "Does not hold right now"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot or: T,F */

snapshots["or: F,T"] = 
`- Or: Any of these -> yes "Holds right now"
  - User: Sam -> no "Does not hold right now"
  - User: Cron -> yes "Holds right now"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot or: F,T */

snapshots["or: F,F"] = 
`- Or: Any of these -> no "Does not hold right now"
  - User: Sam -> no "Does not hold right now"
  - User: Sam -> no "Does not hold right now"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot or: F,F */

snapshots["not: T,T"] = 
`- Not: None of these -> no "Does not hold right now"
  - User: Cron -> yes "Holds right now"
  - User: Cron -> yes "Holds right now"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot not: T,T */

snapshots["not: T,F"] = 
`- Not: None of these -> yes "Holds right now"
  - User: Cron -> yes "Holds right now"
  - User: Sam -> no "Does not hold right now"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot not: T,F */

snapshots["not: F,T"] = 
`- Not: None of these -> yes "Holds right now"
  - User: Sam -> no "Does not hold right now"
  - User: Cron -> yes "Holds right now"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot not: F,T */

snapshots["not: F,F"] = 
`- Not: None of these -> yes "Holds right now"
  - User: Sam -> no "Does not hold right now"
  - User: Sam -> no "Does not hold right now"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot not: F,F */

snapshots["and: empty list"] = 
`- And: All of these -> yes "Holds right now"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition`;
/* end snapshot and: empty list */

snapshots["or: empty list"] = 
`- Or: Any of these -> no "Does not hold right now"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition`;
/* end snapshot or: empty list */

snapshots["not: empty list"] = 
`- Not: None of these -> no "Does not hold right now"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition`;
/* end snapshot not: empty list */

snapshots["and: no list"] = 
`- And: All of these -> needs "Needs attention: conditions: needs a list of conditions"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition`;
/* end snapshot and: no list */

snapshots["or: no list"] = 
`- Or: Any of these -> needs "Needs attention: conditions: needs a list of conditions"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition`;
/* end snapshot or: no list */

snapshots["not: no list"] = 
`- Not: None of these -> needs "Needs attention: conditions: needs a list of conditions"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition`;
/* end snapshot not: no list */

snapshots["or: one condition, not a list"] = 
`- Or: Any of these -> yes "Holds right now"
  - User: Cron -> yes "Holds right now"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot or: one condition, not a list */

snapshots["not: one condition, not a list"] = 
`- Not: None of these -> yes "Holds right now"
  - User: Sam -> no "Does not hold right now"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot not: one condition, not a list */

snapshots["nested: or(F, and(T, not(F)))"] = 
`- Or: Any of these -> yes "Holds right now"
  - User: Sam -> no "Does not hold right now"
  - And: All of these -> yes "Holds right now"
    - User: Cron -> yes "Holds right now"
    - Not: None of these -> yes "Holds right now"
      - User: Sam -> no "Does not hold right now"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up, Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 4: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 5: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up, Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 6: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot nested: or(F, and(T, not(F))) */

snapshots["nested: not(or(F, F))"] = 
`- Not: None of these -> yes "Holds right now"
  - Or: Any of these -> no "Does not hold right now"
    - User: Sam -> no "Does not hold right now"
    - User: Sam -> no "Does not hold right now"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 4: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot nested: not(or(F, F)) */

snapshots["nested: not(or(F, T))"] = 
`- Not: None of these -> no "Does not hold right now"
  - Or: Any of these -> yes "Holds right now"
    - User: Sam -> no "Does not hold right now"
    - User: Cron -> yes "Holds right now"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 4: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot nested: not(or(F, T)) */

snapshots["nested: and(or(T, F), or(F, F))"] = 
`- And: All of these -> no "Does not hold right now"
  - Or: Any of these -> yes "Holds right now"
    - User: Cron -> yes "Holds right now"
    - User: Sam -> no "Does not hold right now"
  - Or: Any of these -> no "Does not hold right now"
    - User: Sam -> no "Does not hold right now"
    - User: Sam -> no "Does not hold right now"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 4: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition
row 5: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up, Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 6: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 7: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot nested: and(or(T, F), or(F, F)) */

snapshots["nested: three deep"] = 
`- And: All of these -> yes "Holds right now"
  - Or: Any of these -> yes "Holds right now"
    - Not: None of these -> yes "Holds right now"
      - User: Sam -> no "Does not hold right now"
    - User: Sam -> no "Does not hold right now"
  - Not: None of these -> yes "Holds right now"
    - And: All of these -> no "Does not hold right now"
      - User: Cron -> yes "Holds right now"
      - User: Sam -> no "Does not hold right now"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 3: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 4: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition
row 5: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition
row 6: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up, Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 7: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 8: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 9: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot nested: three deep */

snapshots["top level list is and"] = 
`- User: Cron -> yes "Holds right now"
- Or: Any of these -> yes "Holds right now"
  - User: Sam -> no "Does not hold right now"
  - User: Cron -> yes "Holds right now"
- Not: None of these -> yes "Holds right now"
  - User: Sam -> no "Does not hold right now"
row 1: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 2: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up, Move down
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 4: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition
row 5: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up, Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 6: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot top level list is and */

snapshots["and: only child turned off"] = 
`- And: All of these -> yes "Holds right now"
  - User: Sam (off) -> off "Turned off"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn On, Delete Condition`;
/* end snapshot and: only child turned off */

snapshots["or: only child turned off"] = 
`- Or: Any of these -> no "Does not hold right now"
  - User: Cron (off) -> off "Turned off"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn On, Delete Condition`;
/* end snapshot or: only child turned off */

snapshots["not: only child turned off"] = 
`- Not: None of these -> no "Does not hold right now"
  - User: Cron (off) -> off "Turned off"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn On, Delete Condition`;
/* end snapshot not: only child turned off */

snapshots["or: turned-off true and a false"] = 
`- Or: Any of these -> no "Does not hold right now"
  - User: Cron (off) -> off "Turned off"
  - User: Sam -> no "Does not hold right now"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn On, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot or: turned-off true and a false */

snapshots["top: turned-off false"] = 
`- User: Cron -> yes "Holds right now"
- User: Sam (off) -> off "Turned off"
row 1: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn On, Delete Condition`;
/* end snapshot top: turned-off false */

snapshots["templated enabled inside or with true"] = 
`- Or: Any of these -> yes "Holds right now"
  - User: Sam -> server "Waiting for Home Assistant"
  - User: Cron -> yes "Holds right now"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot templated enabled inside or with true */

snapshots["templated enabled inside and"] = 
`- And: All of these -> server "Waiting for Home Assistant"
  - User: Cron -> server "Waiting for Home Assistant"
  - User: Cron -> yes "Holds right now"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot templated enabled inside and */

snapshots["server alone"] = 
`- Template: {{ x }} -> server "Waiting for Home Assistant"
row 1: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot server alone */

snapshots["server siblings at top"] = 
`- Template: {{ x }} -> server "Waiting for Home Assistant"
- Sun: After sunset -> server "Waiting for Home Assistant"
row 1: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 2: Condition: Sun
    After: Sunset
    After Offset: "" | hint: Like -01:00:00 for an hour before.
    Before: (none)
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot server siblings at top */

snapshots["server siblings under or"] = 
`- Or: Any of these -> server "Waiting for Home Assistant"
  - Template: {{ x }} -> server "Waiting for Home Assistant"
  - Sun: After sunset -> server "Waiting for Home Assistant"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: Sun
    After: Sunset
    After Offset: "" | hint: Like -01:00:00 for an hour before.
    Before: (none)
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot server siblings under or */

snapshots["server and a true"] = 
`- Template: {{ x }} -> server "Waiting for Home Assistant"
- User: Cron -> yes "Holds right now"
row 1: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot server and a true */

snapshots["server and a false"] = 
`- Template: {{ x }} -> server "Waiting for Home Assistant"
- User: Sam -> no "Does not hold right now"
row 1: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot server and a false */

snapshots["or: true with server"] = 
`- Or: Any of these -> yes "Holds right now"
  - User: Cron -> yes "Holds right now"
  - Template: {{ x }} -> server "Waiting for Home Assistant"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot or: true with server */

snapshots["or: false with server"] = 
`- Or: Any of these -> server "Waiting for Home Assistant"
  - User: Sam -> no "Does not hold right now"
  - Template: {{ x }} -> server "Waiting for Home Assistant"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot or: false with server */

snapshots["and: false with server"] = 
`- And: All of these -> no "Does not hold right now"
  - User: Sam -> no "Does not hold right now"
  - Template: {{ x }} -> server "Waiting for Home Assistant"
row 1: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot and: false with server */

snapshots["not: around server"] = 
`- Not: None of these -> server "Waiting for Home Assistant"
  - Template: {{ x }} -> server "Waiting for Home Assistant"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot not: around server */

snapshots["not: around server and false"] = 
`- Not: None of these -> yes "Holds right now"
  - Template: {{ x }} -> server "Waiting for Home Assistant"
  - User: Sam -> no "Does not hold right now"
row 1: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot not: around server and false */

snapshots["all-server group sent whole"] = 
`- Or: Any of these -> server "Waiting for Home Assistant"
  - Template: {{ x }} -> server "Waiting for Home Assistant"
  - Not: None of these -> server "Waiting for Home Assistant"
    - Sun: After sunset -> server "Waiting for Home Assistant"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up, Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 4: Condition: Sun
    After: Sunset
    After Offset: "" | hint: Like -01:00:00 for an hour before.
    Before: (none)
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot all-server group sent whole */

snapshots["mixed group nested"] = 
`- Or: Any of these -> yes "Holds right now"
  - And: All of these -> server "Waiting for Home Assistant"
    - Template: {{ x }} -> server "Waiting for Home Assistant"
    - User: Cron -> yes "Holds right now"
  - Not: None of these -> yes "Holds right now"
    - Sun: After sunset -> server "Waiting for Home Assistant"
    - User: Sam -> no "Does not hold right now"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: And
    Group: And: all of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 3: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 4: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition
row 5: Condition: Not
    Group: Not: none of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up, Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 6: Condition: Sun
    After: Sunset
    After Offset: "" | hint: Like -01:00:00 for an hour before.
    Before: (none)
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 7: Condition: User
    Users: [ ] Cron, [x] Sam | hint: Shown only to these users.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot mixed group nested */

snapshots["server turned off"] = 
`- User: Cron -> yes "Holds right now"
- Template: {{ x }} (off) -> off "Turned off"
row 1: Condition: User
    Users: [x] Cron, [ ] Sam | hint: Shown only to these users.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 2: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn On, Delete Condition`;
/* end snapshot server turned off */

snapshots["state goes to the server"] = 
`- State: Kitchen is on -> yes "Holds right now"
- Template: {{ x }} -> server "Waiting for Home Assistant"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 2: Condition: Template
    Template: "{{ x }}" | hint: Shows while this renders true. Home Assistant checks it live.
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state goes to the server */

snapshots["state_not goes to the server"] = 
`- Or: Any of these -> yes "Holds right now"
  - State: Hall is not on -> yes "Holds right now"
  - Sun: After sunset -> server "Waiting for Home Assistant"
row 1: Condition: Or
    Group: Or: any of these | hint: Add the conditions it combines with Add Inside.
    tools: Move up (disabled), Move down (disabled)
    actions: Add Inside, Add After, Turn Off, Delete Condition
row 2: Condition: State
    Entity: picked light.hall
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is not
    States: "on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down
    actions: Add After, Turn Off, Delete Condition
row 3: Condition: Sun
    After: Sunset
    After Offset: "" | hint: Like -01:00:00 for an hour before.
    Before: (none)
    tools: Move up, Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot state_not goes to the server */

snapshots["numeric without bounds goes as a template"] = 
`- Numeric State: Temperature ? -> needs "Needs attention: needs above or below"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "" | hint: A number, or an entity whose state is one.
    Below: "" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric without bounds goes as a template */

snapshots["numeric with an infinite bound"] = 
`- Numeric State: Temperature below -Infinity -> no "Does not hold right now"
row 1: Condition: Numeric State
    Entity: picked sensor.temp
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Above: "" | hint: A number, or an entity whose state is one.
    Below: "-Infinity" | hint: Both are strict: the value must be past them.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot numeric with an infinite bound */

snapshots["alias and note kept for the server"] = 
`- State: Kitchen is on -> yes "Holds right now"
row 1: Condition: State
    Entity: picked light.kitchen
    Attribute: (state) | hint: Compare an attribute instead of the state.
    Match: Is
    States: "on" | hint: Separate several with commas. An entity id compares to its state.
    For At Least: "" | hint: Optional, like 00:05:00. Home Assistant then checks it.
    tools: Move up (disabled), Move down (disabled)
    actions: Add After, Turn Off, Delete Condition`;
/* end snapshot alias and note kept for the server */


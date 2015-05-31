# Nibelung

A library for caching things locally in websites or mobile apps.

Adds TTL (time-to-live) and LRU (least-recently-used) features to HTML
localStorage and sessionStorage.

## Usage:

```javascript
var myCache = new nibelung.Hoard({ namespace: 'fooCache' });

// Adds a bunch of objects as records, using the id property as the cache
// key.
myCache.put([{ id: 1, foo: 'bar'}], 'id');

var records = myCache.get(['id']);
var myFoo = records[0];
```

## Options:
 ```javascript
{
  // Used to disambiguate records belonging to different cache instances.
  namespace: 'my-cache-name',

  // Default: false.  If true, data persists across browser sessions. If false,
  // data is discarded when the browser is closed.
  persistent: true,

  // If set to a positive integer, records will be retained for that number of
  // milliseconds only.  Otherwise, records will be retained indefinitely.
  ttlMilliseconds: 3600000, // One hour.

  // If set to a positive integer, the number of cache records will be capped
  // at that number.  Records will be dropped using a least-recently-used
  // strategy based on last write time.  If omitted, no cap will be enforced.
  maxRecords: 100
}
```

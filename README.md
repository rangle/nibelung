# Nibelung [![Circle CI](https://circleci.com/gh/rangle/nibelung.svg?style=svg)](https://circleci.com/gh/rangle/nibelung)

A library for caching things locally in websites or mobile apps.

Adds the following features to HTML localStorage and sessionStorage

* Time-to-live (TTL).
* Namespacing.
* The ability to cap the number of records (uses an LRU strategy).
* A simpler event API.

## Creating a Hoard:

You can create a name-spaced cache as follows:

```javascript
var myCache = new nibelung.Hoard({ namespace: 'fooCache' });
```

The following options are supported:

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

## Basic Operations:

Adding, fetching, and removing a single value is straightforward:

```javascript
myCache.putOne('1', { id: 1, foo: 'bar'});

var myFoo = myCache.getOne('1');

myCache.deleteOne('1');
```

## Batch Operations:

You can also use batch versions of these operations:

```javascript
// Adds a bunch of objects as records, using the id property as the cache
// key.
myCache.put([
  { id: 1, foo: 'bar'},
  { id: 2, foo: 'baaaar', quux: 'foo'}],
  'id');

// Gets all objects matching the given keys, in the same order.
// Returns undefined
var myStuff = myCache.get([1, 2]);

// Deletes values for keys 1 and 2, ignored key 3.
myCache.delete([1, 2, 3]);
```

## Events:

A `Hoard` instance can notify you about changes to its data.  Use the `on` and
`off` methods to register event handlers.  

```javascript

var myHandler = function(key, value) {
  console.log(key + 'was added with value ' + value);
}

// Start listening for events on this cache.
myCache.on('PUT', myHandler);

// Stop listenting for events on this cache.
myCache.off('PUT', myHandler);
```

The following events are supported:

* `PUT` - fired when a value is added or updated.
* `REMOVE` - fired when a value is explicitly removed, or discarded by the LRU
or TTL logic.
* `CLEAR` - fired when the hoard is cleared.  Note that `clear()` will **not**
also fire individual `REMOVE` events for each record.

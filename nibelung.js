(function(global) {
  'use strict';

  function DefaultClock() {
    this.now = function() {
      return Date.now();
    }
  }

  function Hoard(options, clock) {
    var namespace = options.namespace;
    var ttlMilliseconds = options.ttlMilliseconds;
    var maxRecords = options.maxRecords;
    var _clock = clock || new DefaultClock();
    var _cache = options.persistent ? window.localStorage : window.sessionStorage;

    var _getRecordsByLastUpdateTime = R.pipe(
      R.keys,
      R.filter(_isKeyInNamespace),
      R.map(_getRecord),
      R.sortBy(R.prop('lastUpdateTimeMs')),
      R.reverse);

    this.get = function get(keys) {
      return R.reject(
        R.eq(undefined),
        R.map(function (key) {
          var cacheKey = _makeKey(key);
          var record = _getRecord(cacheKey);
          return record && !_isRecordExpired(record) ?
            record.value : undefined;
        }, keys));
    };

    this.put = function put(values, keyName) {
      R.forEach(function (value) {
        var cacheKey = _makeKey(value[keyName]);
        _cache[cacheKey] = _makeCacheRecord(cacheKey, value);
      }, values);

      _enforceMaxRecords();
      _enforceTimeToLive();
    };

    /** Filters the keys by what's not already cached. */
    this.excludes = function excludes(keys) {
      return R.reject(function (key) {
        return _cache.hasOwnProperty(_makeKey(key));
      }, keys);
    };

    /**
     * Gets the newest records in the cache, up to limit, in descending
     * order by last update time.
     */
    this.getLatest = function getLatest(limit) {
      var computeLatest = R.pipe(
        _getRecordsByLastUpdateTime,
        R.slice(0, limit),
        R.map(R.prop('value')));

      return computeLatest(_cache);
    };

    this.clear = function clear() {
      _cache.clear();
    };

    function _makeKey(key) {
      return [namespace, key].join('-');
    }

    function _makeCacheRecord(key, value) {
      return JSON.stringify({
        key: key,
        value: value,
        lastUpdateTimeMs: _clock.now()
      });
    }

    function _isKeyInNamespace(key) {
      return key && key.indexOf(namespace) === 0;
    }

    function _getRecord(key) {
      var json = _cache[key];
      if (!json) {
        return undefined;
      }

      return JSON.parse(json);
    }

    function _enforceMaxRecords() {
      if (!maxRecords) {
        return;
      }

      var allRecords = _getRecordsByLastUpdateTime(_cache);
      var recordsOverCap = R.slice(maxRecords, allRecords.length)(
        allRecords);
      _dropRecords(recordsOverCap);
    }

    function _enforceTimeToLive() {
      if (!ttlMilliseconds) {
        return;
      }

      var allRecords = _getRecordsByLastUpdateTime(_cache);
      var expiredRecords = R.filter(_isRecordExpired, allRecords);
      _dropRecords(expiredRecords);
    }

    function _dropRecords(records) {
      records.forEach(function (record) {
        _cache.removeItem(record.key);
      });
    }

    function _isRecordExpired(record) {
      if (!ttlMilliseconds) {
        return false;
      }

      return _clock.now() - record.lastUpdateTimeMs >
        ttlMilliseconds;
    }
  }

  var nibelung = {
    Hoard: Hoard
  };

  if (typeof exports === 'object') {
     module.exports = nibelung;
   } else if (typeof define === 'function' && define.amd) {
     define(function() { return nibelung; });
   } else {
     global.nibelung = nibelung;
   }
})(this);

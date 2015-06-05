(function(global) {
  'use strict';

  var nibelung = {
    Hoard: Hoard
  };

  var __eventSinks = {};

  function Hoard(options, clock, reentrancyProtector) {
    var namespace = options.namespace;
    var ttlMilliseconds = options.ttlMilliseconds;
    var maxRecords = options.maxRecords;
    var _cache = options.persistent ? window.localStorage : window.sessionStorage;
    var _clock = clock || new DefaultClock();
    var _reentrancyProtector = reentrancyProtector || new DefaultReentrancyProtector();

    __eventSinks[namespace] = __eventSinks[namespace] || new EventSink([
      'PUT', 'DELETE', 'CLEAR'
    ]);

    var _getRecordsByLastUpdateTime = R.pipe(
      R.keys,
      R.filter(_isKeyInNamespace),
      R.map(_getRecord),
      R.reject(R.eq(undefined)),
      R.sortBy(R.prop('lastUpdateTimeMs')),
      R.reverse);

    var _getRecordsByKey = R.pipe(
      R.map(_wrapKey),
      R.map(_getRecord),
      R.reject(R.eq(undefined)));

    this.get = function get(keys) {
      return R.map(
        _unwrapValue,
        _getRecordsByKey(keys));
    };

    this.put = function put(values, keyName) {
      R.forEach(function (value) {
        var cacheKey = _wrapKey(value[keyName]);
        _cache[cacheKey] = _wrapValue(cacheKey, value);
        __eventSinks[namespace].emit('PUT', value, _reentrancyProtector);
      }, values);

      _enforceMaxRecords();
    };

    /** Filters the keys by what's not already cached. */
    this.excludes = function excludes(keys) {
      var findRecords = R.pipe(
        _getRecordsByKey,
        R.pluck('key'),
        R.map(_unwrapKey));

      return R.difference(keys, findRecords(keys));
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
      __eventSinks[namespace].emit('CLEAR', undefined, _reentrancyProtector);
    };

    this.on = function on(event, handler) {
      __eventSinks[namespace].on(event, handler);
    };

    this.off = function off(event, handler) {
      __eventSinks[namespace].off(event, handler);
    };

    function _wrapKey(key) {
      return [namespace, key].join('-');
    }

    function _unwrapKey(key) {
      return key.replace(namespace + '-', '');
    }

    function _wrapValue(key, value) {
      return JSON.stringify({
        key: key,
        value: value,
        lastUpdateTimeMs: _clock.now()
      });
    }

    function _unwrapValue(record) {
      if (record) {
        return record.value;
      }

      return undefined;
    }

    function _isKeyInNamespace(key) {
      return key && key.indexOf(namespace) === 0;
    }

    function _getRecord(key) {
      var json = _cache[key];
      if (!json) {
        return undefined;
      }

      var record = JSON.parse(json);

      if (record && _isRecordExpired(record)) {
        _cache.removeItem(key);
        __eventSinks[namespace].emit(
          'DELETE',
          _unwrapValue(record),
          _reentrancyProtector);
        return undefined;
      }

      return record;
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

  function DefaultClock() {
    this.now = function() {
      return Date.now();
    }
  }

  // Protects emit calls against re-entancy and exception-prone handlers.
  function DefaultReentrancyProtector() {
    this.protect = function(fn) {
      return window.setTimeout(fn, 0);
    }
  }

  function EventSink(legalEvents) {
    var _handlers = {};
    var _legalEvents = [].concat(legalEvents); // Defensive copy.

    this.on = function on(event, handler) {
      _assertLegalEvent(event);

      if (!_handlers[event]) {
        _handlers[event] = [];
      }

      _handlers[event].push(handler);
    }

    this.off = function off(event, handler) {
      _assertLegalEvent(event);

      if (_handlers[event]) {
        _handlers[event] = R.reject(R.eq(handler), _handlers[event]);
      }
    }

    this.emit = function emit(event, data, reentrancyProtector) {
      _assertLegalEvent(event);
      if (!_handlers[event] || !_handlers[event].length) {
        return;
      }

      R.forEach(function _handle(handler) {
        reentrancyProtector.protect(function () {
          handler(event, data);
        }, 0);
      }, _handlers[event]);
    }

    function _assertLegalEvent(event) {
      if (!R.contains(event, _legalEvents)) {
        throw new Error('Invalid event: ' + event);
      }
    }
  }

  if (typeof exports === 'object') {
     module.exports = nibelung;
   } else if (typeof define === 'function' && define.amd) {
     define(function() { return nibelung; });
   } else {
     global.nibelung = nibelung;
   }
})(this);

'use strict';

var expect = chai.expect;

describe('Hoard', function () {
  var hoard;
  var hoardLogger;
  var hoardInFallbackMode;
  var fallbackModeLogger;
  var testItems;
  var testItems2;
  var mockClock;
  var mockReentrancyProtector;

  beforeEach(initMocks);
  beforeEach(initHoard);

  it('is constructed correctly', function () {
    expect(hoard).to.be.an('Object');
  });

  it('can save and load some items', function () {
    hoard.put(testItems, 'id');
    expect(hoard.get(['a', 'b'])).to.eql(testItems);

    // Also test that results are returned in the requested order.
    expect(hoard.get(['b', 'a'])).to.eql(testItems.reverse());
  });

  it('can save load, and remove a single item', function () {
    var putHandler = sinon.spy(function () {});
    var deleteHandler = sinon.spy(function () {});

    hoard.on('PUT', putHandler);
    hoard.putOne(testItems[0].id, testItems[0]);
    expect(putHandler.calledOnce).to.eql(true);
    expect(putHandler.calledWith(testItems[0]));
    expect(hoard.getOne(testItems[0].id)).to.eql(testItems[0]);

    hoard.on('REMOVE', deleteHandler);
    hoard.removeOne(testItems[0].id);
    expect(putHandler.calledOnce).to.eql(true);
    expect(putHandler.calledWith(testItems[0].id));
    expect(hoard.getOne(testItems[0].id)).to.eql(undefined);
  });

  it('can clear all its items', function () {
    hoard.put(testItems, 'id');
    expect(hoard.get(['a', 'b'])).to.eql(testItems);

    hoard.clear();
    expect(hoard.get(['a'])).to.eql([]);
    expect(hoard.get(['b'])).to.eql([]);
    expect(hoard.get(['a', 'b'])).to.eql([]);
  });

  it('can tell who\'s not in the hoard', function () {
    hoard.put(testItems, 'id');
    expect(hoard.excludes(['a', 'b', 'c'])).to.eql(['c']);
  });

  it('can get most recent items', function () {
    hoard.put(testItems, 'id');
    hoard.put(testItems2, 'id');

    var expectedItems = testItems2.reverse();
    expectedItems.push(testItems[1]);
    expect(hoard.getLatest(3)).to.eql(expectedItems);
  });

  it('enforces a maximum number of records', function () {
    hoard.put(testItems, 'id');
    hoard.put(testItems2, 'id');

    // The cap is 4, so the oldest item should still be in the hoard.
    expect(hoard.get(['a'])).to.eql([testItems[0]]);

    // But inserting one more item should kick 'a' out.
    var zItem = {
      'id': 'z',
      foo: 'fooBarQuux'
    };
    hoard.put([zItem], 'id');

    expect(hoard.get(['a'])).to.eql([]);
    expect(hoard.get(['z'])).to.eql([zItem]);
  });

  it('enforces a time-to-live', function () {
    hoard.put(testItems, 'id');
    expect(hoard.get(['a'])).not.to.eql([]);
    expect(hoard.excludes(['a'])).to.eql([]);

    mockClock.advanceClock(100);
    expect(hoard.get(['a'])).to.eql([]);
    expect(hoard.excludes(['a'])).to.eql(['a']);
  });

  it('emits PUT events', function () {
    var putHandler = sinon.spy(function () {});

    hoard.on('PUT', putHandler);
    hoard.put([testItems[0]], 'id');
    expect(putHandler.calledOnce).to.eql(true);
    expect(putHandler.calledWith(testItems[0]));

    putHandler.reset();
    hoard.off('PUT', putHandler);
    hoard.put([testItems[1]], 'id');
    expect(putHandler.calledOnce).to.eql(false);
  });

  it('emits CLEAR events', function () {
    var clearHandler = sinon.spy(function () {});

    hoard.on('CLEAR', clearHandler);
    hoard.clear();
    expect(clearHandler.calledOnce).to.eql(true);

    clearHandler.reset();
    hoard.off('CLEAR', clearHandler);
    hoard.clear();
    expect(clearHandler.calledOnce).to.eql(false);
  });

  it('complains if you register for a bad event', function () {
    var error = null;
    try {
      hoard.on('GOBBLEDYGOOK', function () {});
    }
    catch (e) {
      error = e;
    }

    expect(error).to.not.equal(null);
  });

  it('no longer has that bug where a namespace set to the prefix of a storage ' +
    'function would cause getLatest() to blow up in fallback storage mode',
    function () {
      hoardInFallbackMode.putOne('foo', { foo: 'foo' });
      expect(hoardInFallbackMode.getLatest(10))
        .to.eql([{ foo: 'foo' }]);
    });

  it('makes a log entry when localStorage isn\'t available', function () {
    expect(hoardLogger.calledOnce).to.eql(false);
    expect(fallbackModeLogger.calledOnce).to.eql(true);
  });

  it('can still clear records in fallback mode', function () {
    hoardInFallbackMode.putOne('a', 'b');
    hoardInFallbackMode.clear();
    expect(hoardInFallbackMode.getOne('a')).to.eql(undefined);
  });

  it('doesn\'t blow up if people insert bad data into localStorage manually',
    function () {
      window.localStorage.setItem('unitTestFoo', 'I am a baaad record.');
      expect(hoard.getOne('Foo')).to.eql(undefined);
      expect(hoard.getLatest(10)).to.eql([]);
    });

  it('doesn\'t check the version for an unversioned Hoard', function () {
    var versionChangeHandler = {
      onVersionChange: sinon.spy(function (h, e, a) {
        return false;
      })
    };

    var h = new nibelung.Hoard({
      namespace: 'noversion',
      versionChangeHandler: versionChangeHandler
    });

    expect(versionChangeHandler.onVersionChange.notCalled).to.eql(true);
    expect(h.version()).to.eql('');
  });

  it('doesn\'t report a newly-versioned Hoard', function () {
    var versionChangeHandler = {
      onVersionChange: sinon.spy(function () {
        return false;
      })
    };

    var h = new nibelung.Hoard({
      namespace: 'firstversion',
      version: '1',
      versionChangeHandler: versionChangeHandler
    });

    expect(versionChangeHandler.onVersionChange.notCalled).to.eql(true);

    // But it saves the version anyway.
    expect(h.version()).to.eql('1');
  });

  it('reports a changed-version Hoard', function () {
    var versionChangeHandler = {
      onVersionChange: sinon.spy(function () {
        return false;
      })
    };

    var h = new nibelung.Hoard({
      namespace: 'secondversion',
      version: '1',
      versionChangeHandler: { onVersionChange: function () { return true; } }
    });
    expect(h.version()).to.eql('1');

    var h = new nibelung.Hoard({
      namespace: 'secondversion',
      version: '2',
      versionChangeHandler: versionChangeHandler
    });

    expect(versionChangeHandler.onVersionChange.calledOnce).to.eql(true);
    expect(versionChangeHandler.onVersionChange.calledWith(
      h,
      '2',
      '1')).to.eql(true);
      expect(h.version()).to.eql('1');
  });

  it('clears the data on a version change if requested', function () {
    var h = new nibelung.Hoard({
      namespace: 'secondversion',
      version: '1',
      versionChangeHandler: new nibelung.ClearingVersionChangeHandler()
    });

    h.put(testItems);
    h = new nibelung.Hoard({
      namespace: 'secondversion',
      version: '2',
      versionChangeHandler: new nibelung.ClearingVersionChangeHandler()
    });

    expect(h.getOne('a')).to.be.undefined;
    expect(h.version()).to.eql('2');
  });

  function initMocks() {
    testItems = [{
      id: 'a',
      foo: 'bar'
    }, {
      id: 'b',
      foo: 'quux'
    }];

    testItems2 = [{
      id: 'q',
      foo: 'bar2'
    }, {
      id: 'w',
      foo: 'quux2'
    }];

    // In reality, Date.now()'s ~15ms precision is good enough for our purposes.
    // In unit tests, we need a bit more control.
    var tick = 0;
    mockClock = {
      now: function () {
        return tick++;
      },

      advanceClock: function (ticks) {
        tick += ticks;
      }
    };

    // In reality, events are emitted using window.timeout to avoid re-entrancy
    // problems.  In the tests, we'd like handlers to be called immediately.
    mockReentrancyProtector = {
      protect: function (fn) {
        fn();
      }
    };
  }

  function initHoard() {
    hoardLogger = sinon.spy();
    hoard = new nibelung.Hoard({
      namespace: 'unitTest',
      persistent: false,
      maxRecords: 4,
      ttlMilliseconds: 100,
      clock: mockClock,
      logger: hoardLogger,
      reentrancyProtector: mockReentrancyProtector
    });

    fallbackModeLogger = sinon.spy();
    hoardInFallbackMode = new nibelung.Hoard({
      namespace: 'removeItem',
      persistent: false,
      maxRecords: 4,
      ttlMilliseconds: 100,
      clock: mockClock,
      reentrancyProtector: mockReentrancyProtector,
      logger: fallbackModeLogger,
      storageAvailabilityChecker: {
        assertAvailable: function () {
          throw new Error('nope!');
        }
      }
    });

    hoard.clear();
  }
});

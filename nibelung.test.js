'use strict';

var expect = chai.expect;

describe('Hoard', function () {
  var hoard;
  var testItems;
  var testItems2;
  var mockClock;

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
  }

  function initHoard() {
    hoard = new nibelung.Hoard({
      namespace: 'unitTest',
      persistent: false,
      maxRecords: 4,
      ttlMilliseconds: 100
    },
    mockClock);

    hoard.clear();
  }
});

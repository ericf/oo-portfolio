'use strict';

// Old versions of v8 used the "updated" instead of "update" change record type.
var UPDATE_TYPE = (function () {
    var version = [3, 24, 9],
        v8      = typeof process !== 'undefined' && process.versions.v8,
        oldV8;

    if (v8) {
        oldV8 = v8.split('.').slice(0, 2).map(Number).some(function (v, i) {
            return v < version[i];
        });
    }

    return oldV8 ? 'updated' : 'update';
}());

// -- Quote --------------------------------------------------------------------

function Quote(symbol, price) {
    // Write-once because the `symbol` is the quote's id.
    Object.defineProperty(this, 'symbol', {
        enumerable: true,
        value     : symbol
    });

    this.price = price;
}

// -- Holding ------------------------------------------------------------------

function Holding(quote, shares) {
    // Private, internal state.
    var _shares = shares;

    // Notifier to generate synthetic change records.
    var notifier = Object.getNotifier(this);

    // Defines: `quote`, `shares`, and `value`.
    Object.defineProperties(this, {
        // Write-once because the `quote` is tightly bound to a holding.
        quote: {
            enumerable: true,
            value     : quote
        },

        // Accessor which generates synthetic `shares` and `value` records.
        shares: {
            enumerable: true,

            get: function () {
                return _shares;
            },

            set: function (shares) {
                if (shares === _shares) { return; }

                notifier.notify({
                    type    : UPDATE_TYPE,
                    name    : 'shares',
                    oldValue: _shares
                });

                notifier.notify({
                    type    : UPDATE_TYPE,
                    name    : 'value',
                    oldValue: this.value
                });

                _shares = shares;
            }
        },

        // Accessor which computes the current holding's `value`.
        value: {
            enumerable: true,

            get: function () {
                return this.quote.price * _shares;
            }
        }
    });

    // Observes the `quote` for price changes so it can generate a synthetic
    // `value` change record.
    Object.observe(quote, function (records) {
        // TODO: Optimize to a single `notify()` via `reverse().some()`?
        records.forEach(function (record) {
            if (record.name === 'price') {
                notifier.notify({
                    type    : UPDATE_TYPE,
                    name    : 'value',
                    oldValue: record.oldValue * _shares
                });
            }
        });
    }, [UPDATE_TYPE]);
}

// -- Portfolio ----------------------------------------------------------------

function Portfolio(name, holdings) {
    this.name = name;

    Object.defineProperties(this, {
        // Protected, internal state.
        _holdings: {value: holdings, writeable: true},
        _notifier: {value: Object.getNotifier(this)},

        holdings: {
            enumerable: true,
            writeable : true,
            get       : this._getHoldings,
            set       : this._setHoldings
        },

        value: {
            enumerable: true,
            get       : this._getValue
        }
    });

    // Observe both the `holdings` collection _and_ every holding object.
    this._observeHoldings(holdings);
}

Portfolio.prototype = {
    // -- Accessors ------------------------------------------------------------

    _getHoldings: function () {
        return this._holdings;
    },

    _getValue: function () {
        return this.holdings.reduce(function (total, holding) {
            return total + holding.value;
        }, 0);
    },

    _setHoldings: function (holdings) {
        if (holdings === this._holdings) { return; }

        this._notifyHoldingsChange(this._holdings);
        this._notifyValueChange(this.value);

        this._unobserveHoldings(this._holdings);
        this._observeHoldings(holdings);

        this._holdings = holdings;
    },

    // -- Observers ------------------------------------------------------------

    _holdingsObserver: function (records) {
        // TODO: Optimize to a single `notify()` via `reverse().some()`?
        records.forEach(function (record) {
            var addedCount = record.addedCount,
                index      = record.index,
                holdings   = record.object;

            if (record.type === 'splice') {
                record.removed.forEach(this._unobserveHolding, this);

                if (addedCount) {
                    this._observeHolding(holdings.slice(index, index + addedCount));
                }
            } else if (record.type === UPDATE_TYPE) {
                this._unobserveHolding(record.oldValue);
                this._observeHolding(holdings[record.name]);
            }

            this._notifyValueChange(this.value);
        }, this);
    },

    _holdingObserver: function (records) {
        // TODO: Optimize to a single `notify()` via `reverse().some()`?
        records.forEach(function (record) {
            var oldValue;

            if (record.name === 'value') {
                oldValue = this.value;
                oldValue += record.object.value - record.oldValue;

                this._notifyValueChange(oldValue);
            }
        }, this);
    },

    _observeHolding: function (holding) {
        Object.observe(holding, this._holdingObserver.bind(this), [UPDATE_TYPE]);
    },

    _observeHoldings: function (holdings) {
        Array.observe(holdings, this._holdingsObserver.bind(this), [
            UPDATE_TYPE, 'splice'
        ]);

        holdings.forEach(this._observeHolding, this);
    },

    _unobserveHolding: function (holding) {
        Object.unobserve(holding, this._holdingObserver);
    },

    _unobserveHoldings: function (holdings) {
        Array.unobserve(holdings, this._holdingsObserver);
        holdings.forEach(this._unobserveHolding, this);
    },

    // -- Notifiers ------------------------------------------------------------

    _notifyHoldingsChange: function (oldHoldings) {
        this._notifier.notify({
            type    : UPDATE_TYPE,
            name    : 'holdings',
            oldValue: oldHoldings
        });
    },

    _notifyValueChange: function (oldValue) {
        this._notifier.notify({
            type    : UPDATE_TYPE,
            name    : 'value',
            oldValue: oldValue
        });
    }
};

// -----------------------------------------------------------------------------

var quotes = {
    YHOO: new Quote('YHOO', 40.00),
    AAPL: new Quote('AAPL', 543.00),
    GOOG: new Quote('GOOG', 1117.00),
    QQQ : new Quote('QQQ', 86.31),
    FB  : new Quote('FB', 57.00)
};

var p1 = new Portfolio('Tech', [
    new Holding(quotes.YHOO, 50),
    new Holding(quotes.AAPL, 10),
    new Holding(quotes.QQQ, 200)
]);

var p2 = new Portfolio('Internet', [
    new Holding(quotes.YHOO, 500),
    new Holding(quotes.GOOG, 50)
]);

Object.observe(p1, function (records) {
    console.log(p1.name, p1.value);
});

Object.observe(p2, function (records) {
    console.log(p2.name, p2.value);
});

console.log(p1.name, p1.value);
console.log(p2.name, p2.value);

quotes.YHOO.price += 10.00;
quotes.GOOG.price -= 250.00;
console.log(quotes);

p2.holdings.push(new Holding(quotes.FB, 75));

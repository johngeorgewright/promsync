"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _get = function get(_x14, _x15, _x16) { var _again = true; _function: while (_again) { var object = _x14, property = _x15, receiver = _x16; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x14 = parent; _x15 = property; _x16 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var Break = (function (_Error) {
  function Break() {
    _classCallCheck(this, Break);

    _get(Object.getPrototypeOf(Break.prototype), "constructor", this).apply(this, arguments);
  }

  _inherits(Break, _Error);

  return Break;
})(Error);

function stoppable(promise) {
  return promise["catch"](function (e) {
    if (!(e instanceof Break)) {
      throw e;
    }
  });
}

var Promsync = (function (_Promise) {
  function Promsync() {
    _classCallCheck(this, Promsync);

    _get(Object.getPrototypeOf(Promsync.prototype), "constructor", this).apply(this, arguments);
  }

  _inherits(Promsync, _Promise);

  return Promsync;
})(Promise);

exports["default"] = Promsync;

function identity(it) {
  return it;
}

function addFn(fn) {
  var name = fn.name;

  Promsync[name] = fn.bind(Promsync.resolve());
  Promsync.prototype[name] = function () {
    var _this = this;

    for (var _len = arguments.length, yargs = Array(_len), _key = 0; _key < _len; _key++) {
      yargs[_key] = arguments[_key];
    }

    return this.then(function () {
      for (var _len2 = arguments.length, xargs = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        xargs[_key2] = arguments[_key2];
      }

      return fn.call.apply(fn, [_this].concat(xargs, yargs));
    });
  };
}

addFn(function each(arr) {
  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var promise = this;
  var result = [];
  var promises = arr.map(function (item, i) {
    return promise.then(function () {
      return item;
    }).then(function (value) {
      result.push(value);
      return iterator(value, i);
    });
  });
  return Promsync.all(promises).then(function () {
    return result;
  });
});

addFn(function eachSeries(arr) {
  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var result = [];
  return arr.reduce(function (promise, item, i) {
    return promise.then(function () {
      return item;
    }).then(function (value) {
      result.push(value);
      return iterator(value, i);
    });
  }, this).then(function () {
    return result;
  });
});

function inChunks(promise, arr, limit) {
  var iterator = arguments[3] === undefined ? identity : arguments[3];
  var onSaturate = arguments[4] === undefined ? identity : arguments[4];

  var length = arr.length;
  var result = [];
  var stopped = false;
  var concat = function concat(value) {
    result = result.concat(value);
    onSaturate(value);
  };
  var chunkResolver = function chunkResolver(index) {
    var chunkPromise = promise;
    var chunkResult = [];
    var chunk = arr.slice(index, index + limit);
    return function () {
      if (stopped) throw new Break();
      var promises = chunk.map(function (item, chunkIndex) {
        chunkIndex += index;
        return chunkPromise.then(function () {
          return item;
        }).then(function (value) {
          if (stopped) throw new Break();
          chunkResult.push(value);
          return iterator(value, chunkIndex);
        });
      });
      return Promsync.all(promises).then(function () {
        return chunkResult;
      });
    };
  };
  for (var i = 0; i < length; i += limit) {
    if (stopped) break;
    promise = promise.then(chunkResolver(i)).then(concat);
  }
  return {
    promise: stoppable(promise.then(function () {
      return result;
    })),
    stop: function stop() {
      stopped = true;
      return promise;
    }
  };
}

addFn(function eachLimit(arr, limit, iterator) {
  return inChunks(this, arr, limit, iterator).promise;
});

addFn(function map(arr) {
  var _this2 = this;

  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var promises = arr.map(function (item, i) {
    return _this2.then(function () {
      return item;
    }).then(function (value) {
      return iterator(value, i);
    });
  });
  return Promsync.all(promises);
});

addFn(function mapSeries(arr) {
  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var promise = this;
  var results = [];
  arr.forEach(function (item, i) {
    promise = promise.then(function () {
      return item;
    }).then(function (value) {
      return iterator(value, i);
    }).then(function (value) {
      return results.push(value);
    });
  });
  return promise.then(function () {
    return results;
  });
});

addFn(function forEachOf(obj) {
  var _this3 = this;

  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var result = {};
  var promises = Object.keys(obj).map(function (key) {
    return _this3.then(function () {
      return obj[key];
    }).then(function (value) {
      result[key] = value;
      return iterator(value, key);
    });
  });
  return Promsync.all(promises).then(function () {
    return result;
  });
});

addFn(function forEachOfSeries(obj) {
  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var result = {};
  var promise = Object.keys(obj).reduce(function (p, key) {
    return p.then(function () {
      return obj[key];
    }).then(function (value) {
      result[key] = value;
      return iterator(value, key);
    });
  }, this);
  return promise.then(function () {
    return result;
  });
});

addFn(function forEachOfLimit(obj, limit) {
  var iterator = arguments[2] === undefined ? identity : arguments[2];

  var result = {};
  var assign = function assign(chunk) {
    return Object.assign(result, chunk);
  };
  var keys = Object.keys(obj);
  var promise = this;
  var chunkPromise = function chunkPromise(i) {
    var chunkResult = {};
    var chunk = keys.slice(i, i + limit);
    var promises = chunk.map(function (key) {
      return promise.then(function () {
        return obj[key];
      }).then(function (value) {
        result[key] = value;
        return iterator(value, key);
      });
    });
    return promise.then(function () {
      return Promsync.all(promises).then(function () {
        return chunkResult;
      });
    });
  };
  for (var i = 0; i < keys.length; i += limit) {
    promise = chunkPromise(i).then(assign);
  }
  return promise.then(function () {
    return result;
  });
});

function filterItem(promise, arr, item, i, check) {
  var currentValue = undefined;
  return promise.then(function () {
    return item;
  }).then(function (value) {
    currentValue = value;
    return check(value, i);
  }).then(function (filtered) {
    if (filtered) arr.push(currentValue);
  });
}

function filter(arr) {
  var _this4 = this;

  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var result = [];
  var promises = arr.map(function (item, i) {
    return filterItem(_this4, result, item, i, iterator);
  });
  return Promsync.all(promises).then(function () {
    return result;
  });
}

addFn(filter);

addFn(function filterSeries(arr, iterator) {
  var results = [];
  return arr.reduce(function (promise, item, i) {
    return filterItem(promise, results, item, i, iterator);
  }, this).then(function () {
    return results;
  });
});

addFn(function reduce(arr, memo, iterator) {
  return this.then(function () {
    return Promsync.all([memo, Promsync.all(arr)]);
  }).then(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2);

    var origin = _ref2[0];
    var values = _ref2[1];
    return values.reduce(iterator, origin);
  });
});

addFn(function reduceRight(arr, memo, iterator) {
  return this.then(function () {
    return Promsync.all([memo, Promsync.all(arr)]);
  }).then(function (_ref3) {
    var _ref32 = _slicedToArray(_ref3, 2);

    var origin = _ref32[0];
    var values = _ref32[1];
    return values.reduceRight(iterator, origin);
  });
});

function detect(arr, iterator) {
  var _this5 = this;

  return new Promsync(function (resolve, reject) {
    var resolved = false;
    var promises = arr.map(function (item, i) {
      return _this5.then(function () {
        return item;
      }).then(function (value) {
        return Promsync.all([value, iterator(value, i)]);
      }).then(function (_ref4) {
        var _ref42 = _slicedToArray(_ref4, 2);

        var value = _ref42[0];
        var detected = _ref42[1];

        if (!resolved && detected) resolve(value);
      });
    });
    Promsync.all(promises).then(function () {
      if (!resolved) resolve();
    })["catch"](reject);
  });
}

addFn(detect);

addFn(function detectSeries(arr) {
  var _this6 = this;

  var iterator = arguments[1] === undefined ? identity : arguments[1];

  return new Promsync(function (resolve, reject) {
    var resolved = false;
    arr.reduce(function (promise, item, i) {
      return promise.then(function () {
        return item;
      }).then(function (value) {
        return Promsync.all([value, iterator(value, i)]);
      }).then(function (_ref5) {
        var _ref52 = _slicedToArray(_ref5, 2);

        var value = _ref52[0];
        var passed = _ref52[1];

        if (!resolved && passed) resolve(value);
      });
    }, _this6).then(function () {
      if (!resolved) resolve();
    })["catch"](reject);
  });
});

addFn(function sortBy(arr, iterator) {
  return Promsync.all(arr).then(function (values) {
    values.sort(iterator);
    return values;
  });
});

addFn(function some(arr, iterator) {
  return detect.call(this, arr, iterator).then(function (detected) {
    return !!detected;
  });
});

addFn(function every(arr, iterator) {
  return filter.call(this, arr, iterator).then(function (values) {
    return values.length === arr.length;
  });
});

function seriesArray(promise, tasks, args) {
  var result = [];
  return tasks.reduce(function (p, item) {
    return p.then(function () {
      return item;
    }).then(function (task) {
      return task.apply(null, args);
    }).then(function (value) {
      return result.push(value);
    });
  }, promise).then(function () {
    return result;
  });
}

function seriesObj(promise, tasks) {
  var result = {};
  return Object.keys(tasks).reduce(function (p, key) {
    var item = tasks[key];
    return p.then(function () {
      return item;
    }).then(function (task) {
      return task();
    }).then(function (value) {
      return result[key] = value;
    });
  }, promise).then(function () {
    return result;
  });
}

addFn(function series(tasks) {
  return Array.isArray(tasks) ? seriesArray(this, tasks) : seriesObj(this, tasks);
});

function parallelArray(promise, tasks, args) {
  return Promsync.all(tasks.map(function (item) {
    return promise.then(function () {
      return item;
    }).then(function (task) {
      return task.apply(null, args);
    });
  }));
}

function parallelObj(promise, tasks) {
  var result = {};
  var promises = Object.keys(tasks).map(function (key) {
    var item = tasks[key];
    return promise.then(function () {
      return item;
    }).then(function (task) {
      return task();
    }).then(function (value) {
      return result[key] = value;
    });
  });
  return Promsync.all(promises).then(function () {
    return result;
  });
}

addFn(function parallel(tasks) {
  return Array.isArray(tasks) ? parallelArray(this, tasks) : parallelObj(this, tasks);
});

function parallelLimitArray(promise, tasks, limit) {
  var onSaturate = arguments[3] === undefined ? identity : arguments[3];

  var length = tasks.length;
  var result = [];
  function concat(value) {
    result = result.concat(value);
    onSaturate(value);
  }
  for (var i = 0; i < length; i += limit) {
    var chunk = tasks.slice(i, i + limit);
    promise = parallelArray(promise, chunk).then(concat);
  }
  return promise.then(function () {
    return result;
  });
}

function parallelLimitObj(promise, tasks, limit) {
  var keys = Object.keys(tasks);
  var result = {};
  function createChunk(i) {
    var chunk = {};
    var selection = keys.slice(i, i + limit);
    selection.forEach(function (key) {
      return chunk[key] = tasks[key];
    });
    return chunk;
  }
  function assign(value) {
    Object.assign(result, value);
  }
  for (var i = 0; i < keys.length; i += limit) {
    var chunk = createChunk(i);
    promise = parallelObj(promise, chunk).then(assign);
  }
  return promise.then(function () {
    return result;
  });
}

addFn(function parallelLimit(tasks, limit) {
  return Array.isArray(tasks) ? parallelLimitArray(this, tasks, limit) : parallelLimitObj(this, tasks, limit);
});

function recurWhilst(promise, test, fn) {
  promise = promise.then(function () {
    return test();
  }).then(function (passed) {
    if (passed) return fn();else throw new Break();
  });
  return promise.then(function () {
    return recurWhilst(promise, test, fn);
  });
}

function whilst(test, fn) {
  var _this7 = this;

  return stoppable(this.then(function () {
    return recurWhilst(_this7, test, fn);
  }));
}

addFn(whilst);

addFn(function doWhilst(fn, test) {
  var promise = this.then(function () {
    return fn();
  });
  return whilst.call(promise, test, fn);
});

function until(test, fn) {
  var _this8 = this;

  var negTest = function negTest() {
    return _this8.then(function () {
      return test();
    }).then(function (passed) {
      return !passed;
    });
  };
  return whilst.call(this, negTest, fn);
}

addFn(until);

addFn(function doUntil(fn, test) {
  var promise = this.then(function () {
    return fn();
  });
  return until.call(promise, test, fn);
});

addFn(function forever(fn) {
  var _this9 = this;

  return this.then(function () {
    return recurWhilst(_this9, function () {
      return true;
    }, fn);
  });
});

function seq() {
  var _this10 = this;

  for (var _len3 = arguments.length, fns = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    fns[_key3] = arguments[_key3];
  }

  return function (value) {
    return fns.reduce(function (p, fn) {
      return p.then(function (it) {
        return fn(it);
      });
    }, _this10.then(function () {
      return value;
    }));
  };
}

addFn(seq);

addFn(function compose() {
  for (var _len4 = arguments.length, fns = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
    fns[_key4] = arguments[_key4];
  }

  fns = fns.slice();
  fns.reverse();
  return seq.apply(this, fns);
});

addFn(function applyEach(tasks) {
  for (var _len5 = arguments.length, args = Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
    args[_key5 - 1] = arguments[_key5];
  }

  return parallelArray(this, tasks, args);
});

addFn(function applyEachSeries(tasks) {
  for (var _len6 = arguments.length, args = Array(_len6 > 1 ? _len6 - 1 : 0), _key6 = 1; _key6 < _len6; _key6++) {
    args[_key6 - 1] = arguments[_key6];
  }

  return seriesArray(this, tasks, args);
});

addFn(function queue(worker) {
  var _this11 = this;

  var concurrency = arguments[1] === undefined ? 1 : arguments[1];

  var started = false;
  var running = false;
  var idle = true;
  var paused = false;
  var processor = undefined,
      items = undefined,
      saturated = undefined,
      empty = undefined,
      drain = undefined;
  saturated = empty = drain = identity;

  var reset = function reset() {
    items = [];
  };

  var kill = function kill() {
    reset();
    if (processor) return processor.stop();
  };

  var run = function run() {
    if (paused) {
      return Promsync.resolve();
    } else {
      started = true;
      running = true;
      processor = inChunks(_this11, items, concurrency, worker, saturated);
      return processor.promise.then(function (value) {
        running = false;
        items = [];
        return value;
      }).then(drain);
    }
  };

  var push = function push() {
    items.push.apply(items, arguments);
    return run();
  };

  var unshift = function unshift() {
    items.unshift.apply(items, arguments);
    return run();
  };

  var pause = function pause() {
    paused = true;
  };

  var resume = function resume() {
    paused = false;
    return run();
  };

  reset();

  return Object.defineProperties({
    push: push,
    unshift: unshift,
    pause: pause,
    resume: resume,
    kill: kill
  }, {
    length: {
      get: function get() {
        return items.length;
      },
      configurable: true,
      enumerable: true
    },
    started: {
      get: function get() {
        return started;
      },
      configurable: true,
      enumerable: true
    },
    running: {
      get: function get() {
        return running;
      },
      configurable: true,
      enumerable: true
    },
    idle: {
      get: function get() {
        return !items.length;
      },
      configurable: true,
      enumerable: true
    },
    concurrency: {
      get: function get() {
        return concurrency;
      },
      set: function set(value) {
        concurrency = value;
      },
      configurable: true,
      enumerable: true
    },
    saturated: {
      set: function set(fn) {
        saturated = fn;
      },
      configurable: true,
      enumerable: true
    },
    empty: {
      set: function set(fn) {
        empty = fn;
      },
      configurable: true,
      enumerable: true
    },
    drain: {
      set: function set(fn) {
        drain = fn;
      },
      configurable: true,
      enumerable: true
    }
  });
});
module.exports = exports["default"];

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x14, _x15, _x16) { var _again = true; _function: while (_again) { var object = _x14, property = _x15, receiver = _x16; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x14 = parent; _x15 = property; _x16 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _slicedToArray(arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var BreakRecursion = (function (_Error) {
  function BreakRecursion() {
    _classCallCheck(this, BreakRecursion);

    _get(Object.getPrototypeOf(BreakRecursion.prototype), "constructor", this).apply(this, arguments);
  }

  _inherits(BreakRecursion, _Error);

  return BreakRecursion;
})(Error);

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

var methods = {};

methods.each = function (arr) {
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
};

methods.eachSeries = function (arr) {
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
};

function eachLimit(promise, arr, limit) {
  var iterator = arguments[3] === undefined ? identity : arguments[3];
  var onSaturate = arguments[4] === undefined ? identity : arguments[4];

  var length = arr.length;
  var result = [];
  var stopped = false;
  function concat(value) {
    result = result.concat(value);
    onSaturate(value);
  }
  function chunkResolver(index) {
    var chunkPromise = promise;
    var chunkResult = [];
    var chunk = arr.slice(index, index + limit);
    var promises = chunk.map(function (item, chunkIndex) {
      chunkIndex += index;
      return chunkPromise.then(function () {
        return item;
      }).then(function (value) {
        chunkResult.push(value);
        return iterator(value, chunkIndex);
      });
    });
    return function () {
      return Promsync.all(promises).then(function () {
        return chunkResult;
      });
    };
  }
  for (var i = 0; i < length; i += limit) {
    if (stopped) break;
    promise = promise.then(chunkResolver(i)).then(concat);
  }
  return {
    promise: promise.then(function () {
      return result;
    }),
    stop: function stop() {
      stopped = true;
      return promise;
    }
  };
}

methods.eachLimit = function (arr, limit, iterator) {
  return eachLimit(this, arr, limit, iterator).promise;
};

methods.map = function (arr) {
  var _this = this;

  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var promises = arr.map(function (item, i) {
    return _this.then(function () {
      return item;
    }).then(function (value) {
      return iterator(value, i);
    });
  });
  return Promsync.all(promises);
};

methods.mapSeries = function (arr) {
  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var promise = this;
  var length = arr.length;
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
};

methods.forEachOf = function (obj) {
  var _this2 = this;

  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var result = {};
  var promises = Object.keys(obj).map(function (key) {
    return _this2.then(function () {
      return obj[key];
    }).then(function (value) {
      result[key] = value;
      return iterator(value, key);
    });
  });
  return Promsync.all(promises).then(function () {
    return result;
  });
};

methods.forEachOfSeries = function (obj) {
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
};

methods.forEachOfLimit = function (obj, limit) {
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
};

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
  var _this3 = this;

  var iterator = arguments[1] === undefined ? identity : arguments[1];

  var result = [];
  var promises = arr.map(function (item, i) {
    return filterItem(_this3, result, item, i, iterator);
  });
  return Promsync.all(promises).then(function () {
    return result;
  });
}

methods.filter = filter;

methods.filterSeries = function (arr, iterator) {
  var results = [];
  return arr.reduce(function (promise, item, i) {
    return filterItem(promise, results, item, i, iterator);
  }, this).then(function () {
    return results;
  });
};

methods.reduce = function (arr, memo, iterator) {
  return this.then(function () {
    return Promsync.all([memo, Promsync.all(arr)]);
  }).then(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2);

    var origin = _ref2[0];
    var values = _ref2[1];
    return values.reduce(iterator, origin);
  });
};

methods.reduceRight = function (arr, memo, iterator) {
  return this.then(function () {
    return Promsync.all([memo, Promsync.all(arr)]);
  }).then(function (_ref3) {
    var _ref32 = _slicedToArray(_ref3, 2);

    var origin = _ref32[0];
    var values = _ref32[1];
    return values.reduceRight(iterator, origin);
  });
};

function detect(arr, iterator) {
  var _this4 = this;

  return new Promsync(function (resolve, reject) {
    var resolved = false;
    var promises = arr.map(function (item, i) {
      return _this4.then(function () {
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

methods.detect = detect;

methods.detectSeries = function (arr) {
  var _this5 = this;

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
    }, _this5).then(function () {
      if (!resolved) resolve();
    })["catch"](reject);
  });
};

methods.sortBy = function (arr, iterator) {
  return Promsync.all(arr).then(function (values) {
    values.sort(iterator);
    return values;
  });
};

methods.some = function (arr, iterator) {
  return detect.call(this, arr, iterator).then(function (detected) {
    return !!detected;
  });
};

methods.every = function (arr, iterator) {
  return filter.call(this, arr, iterator).then(function (values) {
    return values.length === arr.length;
  });
};

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

methods.series = function (tasks) {
  return Array.isArray(tasks) ? seriesArray(this, tasks) : seriesObj(this, tasks);
};

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

methods.parallel = function (tasks) {
  return Array.isArray(tasks) ? parallelArray(this, tasks) : parallelObj(this, tasks);
};

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

methods.parallelLimit = function (tasks, limit) {
  return Array.isArray(tasks) ? parallelLimitArray(this, tasks, limit) : parallelLimitObj(this, tasks, limit);
};

function recurWhilst(promise, test, fn) {
  promise = promise.then(function () {
    return test();
  }).then(function (passed) {
    if (passed) return fn();else throw new BreakRecursion();
  });
  return promise.then(function () {
    return recurWhilst(promise, test, fn);
  });
}

function whilst(test, fn) {
  var _this6 = this;

  return this.then(function () {
    return recurWhilst(_this6, test, fn);
  })["catch"](function (err) {
    if (!(err instanceof BreakRecursion)) {
      throw err;
    }
  });
}

methods.whilst = whilst;

methods.doWhilst = function (fn, test) {
  var promise = this.then(function () {
    return fn();
  });
  return whilst.call(promise, test, fn);
};

function until(test, fn) {
  var _this7 = this;

  var negTest = function negTest() {
    return _this7.then(function () {
      return test();
    }).then(function (passed) {
      return !passed;
    });
  };
  return whilst.call(this, negTest, fn);
}

methods.until = until;

methods.doUntil = function (fn, test) {
  var promise = this.then(function () {
    return fn();
  });
  return until.call(promise, test, fn);
};

methods.forever = function (fn) {
  var _this8 = this;

  return this.then(function () {
    return recurWhilst(_this8, function () {
      return true;
    }, fn);
  });
};

function seq() {
  var _this9 = this;

  for (var _len = arguments.length, fns = Array(_len), _key = 0; _key < _len; _key++) {
    fns[_key] = arguments[_key];
  }

  return function (value) {
    return fns.reduce(function (p, fn) {
      return p.then(function (it) {
        return fn(it);
      });
    }, _this9.then(function () {
      return value;
    }));
  };
}

methods.seq = seq;

methods.compose = function () {
  for (var _len2 = arguments.length, fns = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    fns[_key2] = arguments[_key2];
  }

  fns = fns.slice();
  fns.reverse();
  return seq.apply(this, fns);
};

methods.applyEach = function (tasks) {
  for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
    args[_key3 - 1] = arguments[_key3];
  }

  return parallelArray(this, tasks, args);
};

methods.applyEachSeries = function (tasks) {
  for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
    args[_key4 - 1] = arguments[_key4];
  }

  return seriesArray(this, tasks, args);
};

methods.queue = function (worker) {
  var _this10 = this;

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
      processor = eachLimit(_this10, items, concurrency, worker, saturated);
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
};

Object.keys(methods).forEach(function (name) {
  var fn = methods[name];
  Promsync[name] = fn.bind(Promsync.resolve());
  Promsync.prototype[name] = function () {
    var _this11 = this;

    for (var _len5 = arguments.length, yargs = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      yargs[_key5] = arguments[_key5];
    }

    return this.then(function () {
      for (var _len6 = arguments.length, xargs = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
        xargs[_key6] = arguments[_key6];
      }

      return fn.call.apply(fn, [_this11].concat(xargs, yargs));
    });
  };
});
module.exports = exports["default"];

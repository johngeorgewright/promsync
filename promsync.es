class BreakRecursion extends Error {}

export default class Promsync extends Promise {}

function identity(it) {
  return it;
}

let methods = {};

methods.each = function (arr, iterator=identity) {
  let promise = this;
  let result = [];
  let promises = arr.map((item, i) => {
    return promise
      .then(() => item)
      .then(value => {
        result.push(value);
        return iterator(value, i);
      });
  });
  return Promsync.all(promises).then(() => result);
};

methods.eachSeries = function (arr, iterator=identity) {
  let result = [];
  return arr
    .reduce((promise, item, i) => {
      return promise
        .then(() => item)
        .then(value => {
          result.push(value);
          return iterator(value, i);
        });
    }, this)
    .then(() => result);
};

function eachLimit(promise, arr, limit, iterator=identity, onSaturate=identity) {
  let length = arr.length;
  let result = [];
  let stopped = false;
  function concat(value) {
    result = result.concat(value);
    onSaturate(value);
  }
  function chunkResolver(index) {
    let chunkPromise = promise;
    let chunkResult = [];
    let chunk = arr.slice(index, index + limit);
    let promises = chunk.map((item, chunkIndex) => {
      chunkIndex += index;
      return chunkPromise
        .then(() => item)
        .then(value => {
          chunkResult.push(value);
          return iterator(value, chunkIndex);
        });
    });
    return () => Promsync.all(promises).then(() => chunkResult);
  }
  for (let i = 0; i < length; i += limit) {
    if (stopped) break;
    promise = promise
      .then(chunkResolver(i))
      .then(concat);
  }
  return {
    promise: promise.then(() => result),
    stop: () => {
      stopped = true;
      return promise;
    }
  };
}

methods.eachLimit = function (arr, limit, iterator) {
  return eachLimit(this, arr, limit, iterator).promise;
};

methods.map = function (arr, iterator=identity) {
  let promises = arr.map((item, i) => {
    return this
      .then(() => item)
      .then(value => iterator(value, i));
  });
  return Promsync.all(promises);
};

methods.mapSeries = function (arr, iterator=identity) {
  let promise = this;
  let length = arr.length;
  let results = [];
  arr.forEach((item, i) => {
    promise = promise
    .then(() => item)
    .then(value => iterator(value, i))
    .then(value => results.push(value));
  });
  return promise.then(() => results);
};

methods.forEachOf = function (obj, iterator=identity) {
  let result = {};
  let promises = Object.keys(obj).map(key => {
    return this
      .then(() => obj[key])
      .then(value => {
        result[key] = value;
        return iterator(value, key);
      });
  });
  return Promsync.all(promises).then(() => result);
};

methods.forEachOfSeries = function (obj, iterator=identity) {
  let result = {};
  let promise = Object.keys(obj).reduce((p, key) => {
    return p
      .then(() => obj[key])
      .then(value => {
        result[key] = value;
        return iterator(value, key);
      });
  }, this);
  return promise.then(() => result);
};

methods.forEachOfLimit = function (obj, limit, iterator=identity) {
  let result = {};
  let assign = chunk => Object.assign(result, chunk);
  let keys = Object.keys(obj);
  let promise = this;
  let chunkPromise = (i) => {
    let chunkResult = {};
    let chunk = keys.slice(i, i + limit);
    let promises = chunk.map(key => promise
      .then(() => obj[key])
      .then(value => {
        result[key] = value;
        return iterator(value, key);
      })
    );
    return promise.then(() => Promsync
      .all(promises)
      .then(() => chunkResult)
    );
  };
  for (let i = 0; i < keys.length; i += limit) {
    promise = chunkPromise(i).then(assign);
  }
  return promise.then(() => result);
};

function filterItem(promise, arr, item, i, check) {
  let currentValue;
  return promise
    .then(() => item)
    .then(value => {
      currentValue = value;
      return check(value, i);
    })
    .then(filtered => {
      if (filtered) arr.push(currentValue);
    });
}

function filter(arr, iterator=identity) {
  let result = [];
  let promises = arr.map((item, i) => {
    return filterItem(this, result, item, i, iterator);
  });
  return Promsync.all(promises).then(() => result);
}

methods.filter = filter;

methods.filterSeries = function (arr, iterator) {
  let results = [];
  return arr
    .reduce((promise, item, i) => {
      return filterItem(promise, results, item, i, iterator);
    }, this)
    .then(() => results);
};

methods.reduce = function (arr, memo, iterator) {
  return this
    .then(() => Promsync.all([
      memo,
      Promsync.all(arr)
    ]))
    .then(([origin, values]) => values.reduce(iterator, origin));
};

methods.reduceRight = function (arr, memo, iterator) {
  return this
    .then(() => Promsync.all([
      memo,
      Promsync.all(arr)
    ]))
    .then(([origin, values]) => values.reduceRight(iterator, origin));
};

function detect(arr, iterator) {
  return new Promsync((resolve, reject) => {
    let resolved = false;
    let promises = arr.map((item, i) => this
      .then(() => item)
      .then(value => Promsync.all([
        value,
        iterator(value, i)
      ]))
      .then(([value, detected]) => {
        if (!resolved && detected) resolve(value);
      })
    );
    Promsync
      .all(promises)
      .then(() => {
        if (!resolved) resolve();
      })
      .catch(reject);
  });
}

methods.detect = detect;

methods.detectSeries = function (arr, iterator=identity) {
  return new Promsync((resolve, reject) => {
    let resolved = false;
    arr
      .reduce((promise, item, i) => {
        return promise
          .then(() => item)
          .then(value => Promsync.all([
            value,
            iterator(value, i)
          ]))
          .then(([value, passed]) => {
            if (!resolved && passed) resolve(value);
          });
      }, this)
      .then(() => {
        if (!resolved) resolve();
      })
      .catch(reject);
  });
};

methods.sortBy = function (arr, iterator) {
  return Promsync
    .all(arr)
    .then(values => {
      values.sort(iterator);
      return values;
    });
};

methods.some = function (arr, iterator) {
  return detect
    .call(this, arr, iterator)
    .then(detected => !!detected);
};

methods.every = function (arr, iterator) {
  return filter
    .call(this, arr, iterator)
    .then(values => values.length === arr.length);
};

function seriesArray(promise, tasks, args) {
  let result = [];
  return tasks
    .reduce((p, item) => {
      return p
        .then(() => item)
        .then(task => task.apply(null, args))
        .then(value => result.push(value));
    }, promise)
    .then(() => result);
}

function seriesObj(promise, tasks) {
  let result = {};
  return Object
    .keys(tasks)
    .reduce((p, key) => {
      let item = tasks[key];
      return p
        .then(() => item)
        .then(task => task())
        .then(value => result[key] = value);
    }, promise)
    .then(() => result);
}

methods.series = function (tasks) {
  return Array.isArray(tasks)
    ? seriesArray(this, tasks)
    : seriesObj(this, tasks);
};

function parallelArray(promise, tasks, args) {
  return Promsync.all(tasks.map(item => promise
      .then(() => item)
      .then(task => task.apply(null, args))
  ));
}

function parallelObj(promise, tasks) {
  let result = {};
  let promises = Object.keys(tasks).map(key => {
    let item = tasks[key];
    return promise
      .then(() => item)
      .then(task => task())
      .then(value => result[key] = value);
  });
  return Promsync.all(promises).then(() => result);
}

methods.parallel = function (tasks) {
  return Array.isArray(tasks)
    ? parallelArray(this, tasks)
    : parallelObj(this, tasks);
};

function parallelLimitArray(promise, tasks, limit, onSaturate=identity) {
  let length = tasks.length;
  let result = [];
  function concat(value) {
    result = result.concat(value);
    onSaturate(value);
  }
  for (let i = 0; i < length; i += limit) {
    let chunk = tasks.slice(i, i + limit);
    promise = parallelArray(promise, chunk).then(concat);
  }
  return promise.then(() => result);
}

function parallelLimitObj(promise, tasks, limit) {
  let keys = Object.keys(tasks);
  let result = {};
  function createChunk(i) {
    let chunk = {};
    let selection = keys.slice(i, i + limit);
    selection.forEach(key => chunk[key] = tasks[key]);
    return chunk;
  }
  function assign(value) {
    Object.assign(result, value);
  }
  for (let i = 0; i < keys.length; i += limit) {
    let chunk = createChunk(i);
    promise = parallelObj(promise, chunk).then(assign);
  }
  return promise.then(() => result);
}

methods.parallelLimit = function (tasks, limit) {
  return Array.isArray(tasks)
    ? parallelLimitArray(this, tasks, limit)
    : parallelLimitObj(this, tasks, limit);
};

function recurWhilst(promise, test, fn) {
  promise = promise
    .then(() => test())
    .then(passed => {
      if (passed) return fn();
      else throw new BreakRecursion();
    });
  return promise.then(() => recurWhilst(promise, test, fn));
}

function whilst(test, fn) {
  return this
    .then(() => recurWhilst(this, test, fn))
    .catch(err => {
      if (!(err instanceof BreakRecursion)) {
        throw err;
      }
    });
}

methods.whilst = whilst;

methods.doWhilst = function (fn, test) {
  let promise = this.then(() => fn());
  return whilst.call(promise, test, fn);
};

function until(test, fn) {
  let negTest = () => {
    return this.then(() => test()).then(passed => !passed);
  };
  return whilst.call(this, negTest, fn);
}

methods.until = until;

methods.doUntil = function (fn, test) {
  let promise = this.then(() => fn());
  return until.call(promise, test, fn);
};

methods.forever = function (fn) {
  return this.then(() => recurWhilst(this, () => true, fn));
};

function seq(...fns) {
  return value => {
    return fns.reduce((p, fn) => {
      return p.then(it => fn(it));
    }, this.then(() => value));
  };
}

methods.seq = seq;

methods.compose = function (...fns) {
  fns = fns.slice();
  fns.reverse();
  return seq.apply(this, fns);
};

methods.applyEach = function (tasks, ...args) {
  return parallelArray(this, tasks, args);
};

methods.applyEachSeries = function (tasks, ...args) {
  return seriesArray(this, tasks, args);
};

methods.queue = function (worker, concurrency=1) {
  let started = false;
  let running = false;
  let idle = true;
  let paused = false;
  let processor, items, saturated, empty, drain;
  saturated = empty = drain = identity;

  let reset = () => {
    items = [];
  };

  let kill = () => {
    reset();
    if (processor) return processor.stop();
  };

  let run = () => {
    if (paused) {
      return Promsync.resolve();
    } else {
      started = true;
      running = true;
      processor = eachLimit(this, items, concurrency, worker, saturated);
      return processor.promise
        .then(value => {
          running = false;
          items = [];
          return value;
        })
        .then(drain);
    }
  };

  let push = (...fns) => {
    items.push(...fns);
    return run();
  };

  let unshift = (...fns) => {
    items.unshift(...fns);
    return run();
  };

  let pause = () => {
    paused = true;
  };

  let resume = () => {
    paused = false;
    return run();
  };

  reset();

  return {
    get length() { return items.length; },
    get started() { return started; },
    get running() { return running; },
    get idle() { return !items.length; },
    get concurrency() { return concurrency; },
    set concurrency(value) { concurrency = value; },
    set saturated(fn) { saturated = fn; },
    set empty(fn) { empty = fn; },
    set drain(fn) { drain = fn; },
    push: push,
    unshift: unshift,
    pause: pause,
    resume: resume,
    kill: kill
  };
};

Object.keys(methods).forEach(name => {
  let fn = methods[name];
  Promsync[name] = fn.bind(Promsync.resolve());
  Promsync.prototype[name] = function (...yargs) {
    return this.then((...xargs) => fn.call(this, ...xargs, ...yargs));
  };
});

class Break extends Error {}

function stoppable(promise) {
  return promise.catch(e => {
    if (!(e instanceof Break)) {
      throw e;
    }
  });
}

export default class Promsync extends Promise {}

function identity(it) {
  return it;
}

function addFn(fn) {
  let {name} = fn;
  Promsync[name] = fn.bind(Promsync.resolve());
  Promsync.prototype[name] = function (...yargs) {
    return this.then((...xargs) => fn.call(this, ...xargs, ...yargs));
  };
}

addFn(function each(arr, iterator=identity) {
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
});

addFn(function eachSeries(arr, iterator=identity) {
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
});

function inChunks(promise, arr, limit, iterator=identity, onSaturate=identity) {
  let length = arr.length;
  let result = [];
  let stopped = false;
  let concat = value => {
    result = result.concat(value);
    onSaturate(value);
  };
  let chunkResolver = index => {
    let chunkPromise = promise;
    let chunkResult = [];
    let chunk = arr.slice(index, index + limit);
    return () => {
      if (stopped) throw new Break();
      let promises = chunk.map((item, chunkIndex) => {
        chunkIndex += index;
        return chunkPromise
          .then(() => item)
          .then(value => {
            if (stopped) throw new Break();
            chunkResult.push(value);
            return iterator(value, chunkIndex);
          });
      });
      return Promsync.all(promises).then(() => chunkResult);
    };
  };
  for (let i = 0; i < length; i += limit) {
    if (stopped) break;
    promise = promise
      .then(chunkResolver(i))
      .then(concat);
  }
  return {
    promise: stoppable(promise.then(() => result)),
    stop: () => {
      stopped = true;
      return promise;
    }
  };
}

addFn(function eachLimit(arr, limit, iterator) {
  return inChunks(this, arr, limit, iterator).promise;
});

addFn(function map(arr, iterator=identity) {
  let promises = arr.map((item, i) => {
    return this
      .then(() => item)
      .then(value => iterator(value, i));
  });
  return Promsync.all(promises);
});

addFn(function mapSeries(arr, iterator=identity) {
  let promise = this;
  let results = [];
  arr.forEach((item, i) => {
    promise = promise
    .then(() => item)
    .then(value => iterator(value, i))
    .then(value => results.push(value));
  });
  return promise.then(() => results);
});

addFn(function forEachOf(obj, iterator=identity) {
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
});

addFn(function forEachOfSeries(obj, iterator=identity) {
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
});

addFn(function forEachOfLimit(obj, limit, iterator=identity) {
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
});

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

addFn(filter);

addFn(function filterSeries(arr, iterator) {
  let results = [];
  return arr
    .reduce((promise, item, i) => {
      return filterItem(promise, results, item, i, iterator);
    }, this)
    .then(() => results);
});

addFn(function reduce(arr, memo, iterator) {
  return this
    .then(() => Promsync.all([
      memo,
      Promsync.all(arr)
    ]))
    .then(([origin, values]) => values.reduce(iterator, origin));
});

addFn(function reduceRight(arr, memo, iterator) {
  return this
    .then(() => Promsync.all([
      memo,
      Promsync.all(arr)
    ]))
    .then(([origin, values]) => values.reduceRight(iterator, origin));
});

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

addFn(detect);

addFn(function detectSeries(arr, iterator=identity) {
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
});

addFn(function sortBy(arr, iterator) {
  return Promsync
    .all(arr)
    .then(values => {
      values.sort(iterator);
      return values;
    });
});

addFn(function some(arr, iterator) {
  return detect
    .call(this, arr, iterator)
    .then(detected => !!detected);
});

addFn(function every(arr, iterator) {
  return filter
    .call(this, arr, iterator)
    .then(values => values.length === arr.length);
});

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

addFn(function series(tasks) {
  return Array.isArray(tasks)
    ? seriesArray(this, tasks)
    : seriesObj(this, tasks);
});

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

addFn(function parallel(tasks) {
  return Array.isArray(tasks)
    ? parallelArray(this, tasks)
    : parallelObj(this, tasks);
});

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

addFn(function parallelLimit(tasks, limit) {
  return Array.isArray(tasks)
    ? parallelLimitArray(this, tasks, limit)
    : parallelLimitObj(this, tasks, limit);
});

function recurWhilst(promise, test, fn) {
  promise = promise
    .then(() => test())
    .then(passed => {
      if (passed) return fn();
      else throw new Break();
    });
  return promise.then(() => recurWhilst(promise, test, fn));
}

function whilst(test, fn) {
  return stoppable(this.then(() => recurWhilst(this, test, fn)));
}

addFn(whilst);

addFn(function doWhilst(fn, test) {
  let promise = this.then(() => fn());
  return whilst.call(promise, test, fn);
});

function until(test, fn) {
  let negTest = () => {
    return this.then(() => test()).then(passed => !passed);
  };
  return whilst.call(this, negTest, fn);
}

addFn(until);

addFn(function doUntil(fn, test) {
  let promise = this.then(() => fn());
  return until.call(promise, test, fn);
});

addFn(function forever(fn) {
  return this.then(() => recurWhilst(this, () => true, fn));
});

function seq(...fns) {
  return value => {
    return fns.reduce((p, fn) => {
      return p.then(it => fn(it));
    }, this.then(() => value));
  };
}

addFn(seq);

addFn(function compose(...fns) {
  fns = fns.slice();
  fns.reverse();
  return seq.apply(this, fns);
});

addFn(function applyEach(tasks, ...args) {
  return parallelArray(this, tasks, args);
});

addFn(function applyEachSeries(tasks, ...args) {
  return seriesArray(this, tasks, args);
});

addFn(function queue(worker, concurrency=1) {
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
      processor = inChunks(this, items, concurrency, worker, saturated);
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
});

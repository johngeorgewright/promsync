class StopError extends Error {}

export default class Promsync extends Promise {}

function identity(it) {
  return it;
}

function each(arr, iterator=identity) {
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
}

function eachSeries(arr, iterator=identity) {
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
}

function eachLimit(arr, limit, iterator=identity) {
  let promise = this;
  let length = arr.length;
  let result = [];
  function concat(value) {
    result = result.concat(value);
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
    promise = promise
      .then(chunkResolver(i))
      .then(concat);
  }
  return promise.then(() => result);
}

function map(arr, iterator=identity) {
  let promises = arr.map((item, i) => {
    return this
      .then(() => item)
      .then(value => iterator(value, i));
  });
  return Promsync.all(promises);
}

function mapSeries(arr, iterator=identity) {
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
}

function forEachOf(obj, iterator=identity) {
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
}

function forEachOfSeries(obj, iterator=identity) {
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
}

function forEachOfLimit(obj, limit, iterator=identity) {
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
}

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

function filterSeries(arr, iterator) {
  let results = [];
  return arr
    .reduce((promise, item, i) => {
      return filterItem(promise, results, item, i, iterator);
    }, this)
    .then(() => results);
}

function reduce(arr, memo, iterator) {
  return this
    .then(() => Promsync.all([
      memo,
      Promsync.all(arr)
    ]))
    .then(([origin, values]) => values.reduce(iterator, origin));
}

function reduceRight(arr, memo, iterator) {
  return this
    .then(() => Promsync.all([
      memo,
      Promsync.all(arr)
    ]))
    .then(([origin, values]) => values.reduceRight(iterator, origin));
}

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

function detectSeries(arr, iterator=identity) {
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
}

function sortBy(arr, iterator) {
  return Promsync
    .all(arr)
    .then(values => {
      values.sort(iterator);
      return values;
    });
}

function some(arr, iterator) {
  return detect
    .call(this, arr, iterator)
    .then(detected => !!detected);
}

function every(arr, iterator) {
  return filter
    .call(this, arr, iterator)
    .then(values => values.length === arr.length);
}

function seriesArray(promise, tasks) {
  let result = [];
  return tasks
    .reduce((p, item) => {
      return p
        .then(() => item)
        .then(task => task())
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

function series(tasks) {
  return Array.isArray(tasks)
    ? seriesArray(this, tasks)
    : seriesObj(this, tasks);
}

function parallelArray(promise, tasks) {
  return Promsync.all(tasks.map(item => promise
      .then(() => item)
      .then(task => task())
  ));
}

function parallelObj(promise, tasks) {
  let result = {};
  let promises = [];
  Object.keys(tasks).forEach(key => {
    let task = tasks[key];
    let parallelPromise = promise.then(() => task());
    result[key] = promise;
    promises.push(parallelPromise);
  });
  return Promsync.all(promises).then(() => result);
}

function parallel(tasks) {
  return Array.isArray(tasks)
    ? parallelArray(this, tasks)
    : parallelObj(this, tasks);
}

function parallelLimitArray(promise, tasks, limit) {
  let length = tasks.length;
  let result = [];
  function concat(value) {
    result.concat(value);
  }
  for (let i = 0; i < length; i += limit) {
    let chunk = tasks.slice(i, i + limit);
    promise = promise
      .then(parallelArray(promise, chunk))
      .then(concat);
  }
  return promise.then(() => result);
}

function parallelLimitObj(promise, tasks, limit) {
  let keys = Object.keys(tasks);
  let length = keys.length;
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
  for (let i = 0; i < length; i += limit) {
    let chunk = createChunk(i);
    promise = promise
      .then(parallelObj(promise, chunk))
      .then(assign);
  }
  return promise.then(() => result);
}

function parallelLimit(tasks, limit) {
  return Array.isArray(tasks)
    ? parallelLimitArray(this, tasks, limit)
    : parallelLimitObj(this, tasks, limit);
}

function recurWhilst(promise, test, fn) {
  promise = promise
    .then(() => test())
    .then(passed => passed ? fn() : new StopError());
  return promise.then(() => recurWhilst(promise, test, fn));
}

function whilst(test, fn) {
  return this
    .then(() => recurWhilst(this, test, fn))
    .catch(err => {
      if (!(err instanceof StopError)) {
        return err;
      }
    });
}

function doWhilst(fn, test) {
  let promise = this.then(() => fn());
  return whilst.call(this, test, fn);
}

let methods = {
  each: each,
  eachSeries: eachSeries,
  eachLimit: eachLimit,
  map: map,
  mapSeries: mapSeries,
  mapLimit: eachLimit,
  forEachOf: forEachOf,
  forEachOfSeries: forEachOfSeries,
  forEachOfLimit: forEachOfLimit,
  filter: filter,
  select: filter,
  filterSeries: filterSeries,
  selectSeries: filterSeries,
  reduce: reduce,
  inject: reduce,
  foldl: reduce,
  reduceRight: reduceRight,
  foldr: reduceRight,
  detect: detect,
  detectSeries: detectSeries,
  sortBy: sortBy,
  some: some,
  every: every,
  series: series,
  parallel: parallel,
  parallelLimit: parallelLimit,
  whilst: whilst
};

Object.keys(methods).forEach(name => {
  let fn = methods[name];
  Promsync[name] = fn.bind(Promsync.resolve(null));
  Promsync.prototype[name] = function (...yargs) {
    return this.then((...xargs) => fn.call(this, ...xargs, ...yargs));
  };
});

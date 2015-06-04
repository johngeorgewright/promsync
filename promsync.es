export default class Promsync extends Promise {}

function each(arr, iterator) {
    return Promsync.all(arr.map(iterator));
}

function eachSeries(arr, iterator) {
    let promise = this;
    arr.forEach((item, i) => {
        promise = promise.then(() => iterator(item, i));
    });
    return promise;
}

function eachLimit(arr, limit, iterator) {
    let promise = this;
    let length = arr.length;
    for (let i = 0; i < length; i += limit) {
        let chunk = arr.slice(i, i + limit);
        promise = promise.then(each.call(this, chunk, iterator));
    }
    return promise;
}

function mapSeries(arr, iterator) {
    let promise = this;
    let length = arr.length;
    let results = [];
    arr.forEach((item, i) => {
        promise = promise
            .then(() => promise)
            .then(value => iterator(value, i))
            .then(value => results.push(value));
    });
    return promise.then(() => results);
}

function forEachOf(obj, iterator) {
    let promises = Object.keys(obj).map(function (key) {
        return iterator(obj[key], key);
    });
    return Promsync.all(promises);
}

function forEachOfSeries(obj, iterator) {
    let promise = this;
    Object.keys(obj).forEach(key => {
        promise = promise.then(() => iterator(obj[key], key));
    });
    return promise;
}

function forEachOfLimit(obj, limit, iterator) {
    let keys = Object.keys(obj);
    let length = keys.length;
    let promise = this;
    function iterate(key) {
        return iterator(obj[key], key);
    }
    for (let i = 0; i < length; i += limit) {
        let chunk = keys.slice(i, i + limit);
        let promises = chunk.map(iterate);
        promise = promise.then(Promsync.all(promises));
    }
    return promise;
}

function filter(arr, iterator) {
    return Promsync
        .all(arr)
        .then(values => Promsync.all(values.filter(iterator)));
}

function filterSeries(arr, iterator) {
    let promise = this;
    let results = [];
    arr.forEach((item, i) => {
        let currentValue;
        promise = promise
            .then(() => item)
            .then(value => {
                currentValue = value;
                return iterator(value, i);
            })
            .then(filtered => {
                if (filtered) results.push(currentValue);
            });
    });
    return promise.then(() => results);
}

function reduce(arr, memo, iterator) {
    return Promsync
        .all(arr)
        .then(values => values.reduce(iterator, memo));
}

function reduceRight(arr, memo, iterator) {
    return Promsync
        .all(arr)
        .then(values => values.reduceRight(iterator, memo));
}

function detect(arr, iterator) {
    return new Promsync((resolve, reject) => {
        let resolved = false;
        let promises = arr.map((item, i) => this
            .then(() => item)
            .then(value => iterator(value, i))
            .then(value => {
                if (!resolved && value) resolve(value);
            }));
        Promsync
            .all(promises)
            .then(() => {
                if (!resolved) resolve();
            })
            .catch(reject);
    });
}

function detectSeries(arr, iterator) {
    return new Promsync((resolve, reject) => {
        let promise = this;
        arr.forEach((item, i) => {
            promise = promise
                .then(() => item)
                .then(value => iterator(value, i))
                .then(value => {
                    if (value) resolve(value);
                });
        });
        promise.catch(reject);
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
    tasks.forEach(task => {
        promise = promise
            .then(task)
            .then(value => result.push(value));
    });
    return promise.then(() => result);
}

function seriesObj(promise, tasks) {
    let result = {};
    let promises = [];
    Object.keys(tasks).forEach(key => {
        let task = tasks[key];
        result[key] = promise = promise.then(() => task());
        promises.push(promise);
    });
    return Promsync.all(promises).then(() => result);
}

function series(tasks) {
    return Array.isArray(tasks)
        ? seriesArray(this, tasks)
        : seriesObj(this, tasks);
}

function parallelArray(tasks) {
    return Promsync.all(tasks.map(task => task()));
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
        ? parallelArray(tasks)
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
    function createChunk(selection) {
        let chunk = {};
        selection.forEach(key => chunk[key] = tasks[key]);
        return chunk;
    }
    function assign(value) {
        Object.assign(result, value);
    }
    for (let i = 0; i < length; i += limit) {
        let chunk = createChunk(keys.slice(i, i + limit));
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

let methods = {
    each: each,
    eachSeries: eachSeries,
    eachLimit: eachLimit,
    map: each,
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
    parallelLimit: parallelLimit
};

Object.keys(methods).forEach(name => {
    let fn = methods[name];
    Promsync[name] = fn.bind(Promsync.resolve(null));
    Promsync.prototype[name] = function (...yargs) {
        return this.then((...xargs) => fn.call(this, ...xargs, ...yargs));
    };
});

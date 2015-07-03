Promsync
========

> Async.js style utility belt for the promise pattern

Todo
----

### Collections

- [x] each
- [x] eachSeries
- [x] eachLimit
- [x] forEachOf
- [x] forEachOfSeries
- [x] forEachOfLimit
- [x] map
- [x] mapSeries
- [x] mapLimit
- [x] filter
- [x] filterSeries
- [x] reject
- [x] rejectSeries
- [x] reduce
- [x] reduceRight
- [x] detect
- [x] detectSeries
- [ ] sortBy
- [x] some
- [x] every
- [x] concat
- [x] concatSeries

### Control Flow

- [x] series
- [x] parallel
- [x] parallelLimit
- [x] whilst
- [x] doWhilst
- [x] until
- [x] doUntil
- [x] forever
- [x] waterfall
- [x] compose
- [x] seq
- [x] applyEach
- [x] applyEachSeries
- [x] queue
- [ ] priorityQueue
- [ ] cargo
- [ ] auto
- [ ] retry
- [ ] iterator
- [ ] apply
- [ ] nextTick
- [ ] times
- [ ] timesSeries
- [ ] timesLimit

### Utils

- [ ] memoize
- [ ] unmemoize
- [ ] ensureAsync
- [ ] log
- [ ] dir
- [ ] noConflict

Collections
-----------

### `each(arr, [iterator])`

Applies the function iterator to each item in arr, in parallel.
The iterator is called with an item from the list and the index.

If you return any promises from your iterator, it will wait until
all promises have been resolved before resolving.

It will return the originally **resolved** values passed as `arr`.

The function can be used by calling it statically (`Promsync.each(arr, [iterator])`)
or on an instance (`promsync.each([iterator])`). Notice, when using
the instance approach, the `arr` argument is expected to be resolved
previously.

**Note**, that since this function applies iterator to each item in parallel,
there is no guarantee that the iterator functions will complete in order.

#### Arguments

- `arr` - An array to iterate over.
- `iterator(item, index)` - A function to apply to each item in arr.

#### Examples

```js
// assuming openFiles is an array of file names or promises of file names
// and saveFile is a function, or a promise of a function, to save the
// modified contents of that file:

Promsync
  .each(openFiles, saveFile)
  .then(openFiles => {})
  .catch(err => {})
```

```js
// assuming openFiles is an array of file names or promises of file names

let promise = new Promsync(resolve => resolve(openFiles));

promise.each(file => {
  // Perform operation on file here.
  console.log('Processing file ' + file);

  if (file.length > 32) {
    throw new Error('File name too long');
  } else {
    // Do work to process file here
    console.log('File processed');
  }
});
```

### `eachSeries(arr, [iterator])`

The same as `each`, only iterator is applied to each item in arr in series.
The next iterator is only called once the current one has completed.
This means the iterator functions will complete in order.

### `eachLimit(arr, limit, [iterator])`

The same as each, only no more than `limit` iterators will be simultaneously running at any time.

**Note** that the items in `arr` are not processed in series, so there is no guarantee that the
first limit iterator functions will complete before any others are started.

#### Arguments

- `arr` - An array to iterate over.
- `limit` - The maximum number of iterators to run at any time.
- `iterator(item, index)` - A function to apply to each item in arr.

#### Example

```js
// Assume documents is an array of promisable JSON objects and requestApi is a
// function that interacts with a rate-limited REST api.

Promsync
  .eachLimit(document, 20, requestApi)
  .done(documents => {})
  .catch(err => {});
```

### `forEachOf(obj, [iterator])`

Like each, except that it iterates over objects, and passes the key as the second argument to the iterator.

#### Arguments

- `obj` - An object or array to iterate over.
- `iterator(item, key)` - A function to apply to each item in obj. The key is the item's key,
  or index in the case of an array.

#### Example

```js
let obj = {dev: "/dev.json", test: "/test.json", prod: "/prod.json"};
let configs = {};

Promsync
  .forEachOf(obj, (value, key) => {
    return new Promsync((resolve, reject) => {
      fs.readFile(`${dirname}value`, 'utf8', (err, data) => {
        if (err) return reject(err);
        configs[key] = JSON.parse(data);
      });
    });
  })
  .then(() => doSomethingWith(configs))
  .catch(err => console.error(err.message));
```

#### Related

- `forEachOfSeries(obj, [iterator])`
- `forEachOfLimit(obj, limit, [iterator])`

### map(arr, [iterator])

Produces a new array of values by mapping each value in arr through the iterator function. The iterator is called with an item from arr and it's key.

Note, that since this function applies the iterator to each item in parallel, there is no guarantee that the iterator functions will complete in order. However, the results array will be in the same order as the original arr.

#### Arguments

arr - An array to iterate over.
iterator(item, key) - A function to apply to each item in arr. The iterator is passed a callback(err, transformed) which must be called once it has completed with an error (which can be null) and a transformed item.

#### Example

```js
Promsync.map(['file1','file2','file3'], fs.stat).then(function (results) {
    // results is now an array of stats for each file
});
```

#### Related

- `mapSeries(arr, [iterator])
- `mapLimit(arr, limit, [iterator])

### filter(arr, [iterator])

Promises a new array of all the values in `arr` which resolve a truth test. This operation is performed in parallel, but the results array will be in the same order as the original.

#### Arguments

- `arr` - An array (or promise of an array) to iterator over.
- `iterator(item, key)` - A truth test to apply to each item in `arr`.

#### Example

```js
Promsync.filter(['file1', 'file2', 'file3'], fs.exists).then(results => {
  // results no equals an array of the existing files
});
```

***

#### Related
- `filterSeries(arr, [iterator])`

### `reject(arr, [iterator])`

The opposite of [`filter`](#filterarr-iterator). Removes values that resolve a
truth test.

***

#### Related

- `rejectSeries(arr, [iterator])`

***

### `reduce(arr, memo, [iterator])`

Resolved `arr` into a single value using an iterator to return each successive step. memo is the initial state of the reduction. This function only operates in series.

#### Arguments

- `arr` - An array to iterate over.
- `memo` - The initial state of the reduction.
- `iterator(memo, item, key)` - A function applied to each item in the array to produce the next step in the reduction.

#### Example

```js
Promsync.reduce([1,2,3], 0, (memo, item) => {
    // pointless async:
    return new Promise((resolve) => {
      process.nextTick(() => {
          resolve(memo + item);
      });
    });
}).then(result => {
    // result is now equal to the last value of memo, which is 6
});
```

#### Related

- `reduceRight(arr, memo, [iterator])`

### `detect(arr, [iterator])`

Returns the first value in `arr` that resolves a truth test. The iterator is applied in parallel, meaning the first iterator to return true will fire the detect callback with that result. That means the result might not be the first item in the original arr (in terms of order) that passes the test.

If order within the original `arr` is important, then look at `detectSeries`.

#### Arguments

- `arr` - An array to iterate over.
- `iterator(item, callback)` - A truth test to apply to each item in arr.

#### Example

```js
Promsync.detect(['file1','file2','file3'], fs.exists).then(result => {
  // result now equals the first file in the list that exists
});
```

#### Related

- `detectSeries(arr, [iterator])`

### `sortBy(arr, [iterator])`

Sorts a list by the results of running each `arr` value through an async iterator.

#### Arguments

- `arr` - An array to iterate over.
- `iterator(item, key)` - A function to apply to each item in arr.

#### Example

```js
Promsync.sortBy(['file1','file2','file3'], file => {
    return new Promsync(resolve => {
      fs.stat(file, (err, stats) => {
        resolve(stats.mtime);
      });
    });
}).then(results => {
    // results is now the original array of files sorted by
    // modified date
});
```

*... To Be Continued*

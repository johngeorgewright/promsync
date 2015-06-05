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
- [x] sortBy
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
- [ ] until
- [ ] doUntil
- [ ] forever
- [ ] waterfall
- [ ] compose
- [ ] seq
- [ ] applyEach
- [ ] applyEachSeries
- [ ] queue
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

*... To Be Continued*

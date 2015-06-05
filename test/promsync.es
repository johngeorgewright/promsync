/*eslint-env node, mocha*/

import Promsync from '../promsync.es';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.should();

function resolve(value, timeout=0) {
  return new Promsync(res => {
    setTimeout(() => res(value), timeout);
  });
}

describe('Promsync', () => {

  describe('Collections', () => {

    describe('.each()', () => {
      it('will call the iterator for each value', () => {
        let results = [];
        return resolve(['foo', 'bar'])
          .each((v, i) => results.push(v + i))
          .then(() => results).should.eventually.eql(['foo0', 'bar1']);
      });

      it('will resolve the original value', () => {
        return resolve(['foo', 'bar'])
          .each((v, i) => v + i)
          .should.eventually.eql(['foo', 'bar']);
      });

      it('will resolve the iterators in parallel', () => {
        let arr = [
          resolve(2, 10),
          resolve(1)
        ];
        return Promsync
          .each(arr)
          .should.eventually.eql([1, 2]);
      });

      it('will call the iterators in parallel', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let arr = [
          resolve(second, 10),
          resolve(first)
        ];
        return Promsync
          .each(arr, spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.eachSeries()', () => {
      it('will call the iterator for each value', () => {
        let result = [];
        return resolve(['foo', 'bar'])
          .eachSeries((value, i) => result.push(value + i))
          .then(() => result).should.eventually.eql(['foo0', 'bar1']);
      });

      it('will resolve the original value', () => {
        return resolve(['foo', 'bar'])
          .eachSeries((value, i) => value + i)
          .should.eventually.eql(['foo', 'bar']);
      });

      it('will resolve the values in series', () => {
        let arr = [
          resolve(1, 10),
          resolve(2)
        ];
        return resolve(arr)
          .eachSeries()
          .should.eventually.eql([1, 2]);
      });

      it('will call the iterator in series', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let arr = [
          resolve(first, 10),
          resolve(second)
        ];
        return resolve(arr)
          .eachSeries(spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });

      it('will work as a class method', () => {
        let arr = [
          resolve(1, 10),
          resolve(2)
        ];
        return Promsync
          .eachSeries(arr)
          .should.eventually.eql([1, 2]);
      });
    });

    describe('.eachLimit()', () => {
      it('will call each iterator', () => {
        let result = [];
        return resolve(['foo', 'bar'])
          .eachLimit(1, (v, i) => result.push(v + i))
          .then(() => result).should.eventually.eql(['foo0', 'bar1']);
      });

      it('will resolve the original results', () => {
        return resolve(['foo', 'bar'])
          .eachLimit(1, (v, i) => v + i)
          .should.eventually.eql(['foo', 'bar']);
      });

      it('call chunks in series', () => {
        let arr = [
          resolve(2, 20),
          resolve(1, 10),
          resolve(3)
        ];
        return Promsync
          .eachLimit(arr, 2)
          .should.eventually.eql([1, 2, 3]);
      });
    });

    describe('.map()', () => {
      it('will call each iterator resolving new values', () => {
        return resolve(['foo', 'bar'])
          .map((v, i) => v + i)
          .should.eventually.eql(['foo0', 'bar1']);
      });

      it('can be used as a class method', () => {
        return resolve(['foo', 'bar'])
          .map((v, i) => v + (i + 1))
          .should.eventually.eql(['foo1', 'bar2']);
      });

      it('will always return the values in the correct order', () => {
        let arr = [
          resolve(1, 10),
          resolve(2)
        ];
        return resolve(arr)
          .map()
          .should.eventually.eql([1, 2]);
      });

      it('will resolve the values in parallel', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let arr = [
          resolve(second, 10),
          resolve(first, 0)
        ];
        return resolve(arr)
          .map(spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.mapSeries()', () => {
      it('will call each iterator resolving new values', () => {
        return resolve(['foo', 'bar'])
          .mapSeries((v, i) => v + (i + 1))
          .should.eventually.eql(['foo1', 'bar2']);
      });

      it('will always return the values in the correct order', () => {
        let arr = [
          resolve(1, 10),
          resolve(2)
        ];
        return resolve(arr)
          .mapSeries()
          .should.eventually.eql([1, 2]);
      });

      it('will resolve the values in series', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let arr = [
          resolve(first, 10),
          resolve(second)
        ];
        return resolve(arr)
          .mapSeries(spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.forEachOf()', () => {
      it('will call the iterator for each value', () => {
        let result = {};
        return resolve({foo: 'bar', lorem: 'ipsum'})
          .forEachOf((v, k) => result[v] = k)
          .then(() => result)
          .should.eventually.eql({bar: 'foo', ipsum: 'lorem'});
      });

      it('will always resolve the original values', () => {
        return resolve({foo: 'bar', lorem: 'ipsum'})
          .forEachOf((v, k) => v + k)
          .should.eventually.eql({foo: 'bar', lorem: 'ipsum'});
      });

      it('will resolve the values in parallel', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let obj = {
          second: resolve(second, 10),
          first: resolve(first)
        };
        return resolve(obj)
          .forEachOf(spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.forEachOfSeries()', () => {
      it('will call the iterator for each value', () => {
        let result = {};
        return resolve({foo: 'bar', lorem: 'ipsum'})
          .forEachOfSeries((v, k) => result[v] = k)
          .then(() => result)
          .should.eventually.eql({bar: 'foo', ipsum: 'lorem'});
      });

      it('will always resolve the original values', () => {
        return resolve({foo: 'bar', lorem: 'ipsum'})
          .forEachOfSeries((v, k) => v + k)
          .should.eventually.eql({foo: 'bar', lorem: 'ipsum'});
      });

      it('will iterate in series', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let obj = {
          first: resolve(first, 10),
          second: resolve(second)
        };
        return resolve(obj)
          .forEachOfSeries(spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.forEachOfLimit()', () => {
      it('will call the iterator for each value', () => {
        let result = [];
        return resolve({foo: 'bar', lorem: 'ipsum'})
          .forEachOfLimit(1, (v, k) => result.push(v + k))
          .then(() => result).should.eventually.eql(['barfoo', 'ipsumlorem']);
      });

      it('will resolve the original results', () => {
        return resolve({foo: 'bar', lorem: 'ipsum'})
          .forEachOfLimit(1, (v, k) => k + v)
          .should.eventually.eql({foo: 'bar', lorem: 'ipsum'});
      });

      it('call chunks in series', () => {
        let first = sinon.spy(function first() {});
        let second = sinon.spy(function second() {});
        let third = sinon.spy(function third() {});
        let obj = {
          second: resolve(second, 20),
          first: resolve(first, 10),
          third: resolve(third)
        };
        return Promsync
          .forEachOfLimit(obj, 2, spy => spy())
          .then(() => first.should.have.been.calledBefore(second))
          .then(() => third
            .should.have.been.calledAfter(first)
            .and.have.been.calledAfter(second)
          );
      });
    });

    describe('.filter()', () => {
      it('will use the method to filter out unwanted values', () => {
        return resolve([3, 4, 5, 6])
          .filter(v => v > 4)
          .should.eventually.eql([5, 6]);
      });

      it('will call the iterator in parallel', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let arr = [
          resolve(second, 20),
          resolve(first)
        ];
        return resolve(arr)
          .filter(spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.filterSeries()', () => {
      it('will use the method to filter out unwanted values', () => {
        return resolve([3, 4, 5, 6])
          .filterSeries(v => v > 4)
          .should.eventually.eql([5, 6]);
      });

      it('will call the iterator in series', () => {
        let first = sinon.spy(function first() {});
        let second = sinon.spy(function second() {});
        let arr = [
          resolve(first, 20),
          resolve(second)
        ];
        return resolve(arr)
          .filterSeries(spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.reduce()', () => {
      it('will use the method to reduce to a single value', () => {
        return resolve([1, 2, 3, 4])
          .reduce(0, (prev, curr) => prev + curr)
          .should.eventually.equal(10);
      });

      it('can handle promises', () => {
        let arr = [
          resolve(1), resolve(2), resolve(3), resolve(4)
        ];
        return resolve(arr)
          .reduce(resolve(0), (prev, curr) => prev + curr)
          .should.eventually.equal(10);
      });
    });

    describe('.reduceRight()', () => {
      it('will reduce the array to a single value', () => {
        return resolve(['foo', 'bar'])
          .reduceRight('', (prev, curr) => prev + curr)
          .should.eventually.equal('barfoo');
      });

      it('can handle promises', () => {
        let arr = [
          resolve('foo', 10), resolve('bar')
        ];
        return resolve(arr)
          .reduceRight(resolve(''), (prev, curr) => prev + curr)
          .should.eventually.equal('barfoo');
      });
    });

    describe('.detect()', () => {
      it('will detect the first truthy value', () => {
        return resolve([1, 2, 3])
          .detect(v => v > 1)
          .should.eventually.equal(2);
      });

      it('will resolve in parallel', () => {
        let first = sinon.stub().returns(false);
        let second = sinon.stub().returns(false);
        return resolve([
          resolve(second, 10),
          resolve(first)
        ])
          .detect(spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });

      it('will return undefined if nothing\'s found', () => {
        return resolve([1, 2, 3])
          .detect(v => v > 3)
          .should.eventually.be.undefined;
      });
    });

    describe('.detectSeries()', () => {
      it('will detect the first truthy value', () => {
        return resolve([1, 2, 3])
          .detectSeries(v => v > 1)
          .should.eventually.equal(2);
      });

      it('will resolve in series', () => {
        let first = sinon.stub().returns(false);
        let second = sinon.stub().returns(false);
        return resolve([
          resolve(first, 10),
          resolve(second)
        ])
          .detectSeries(spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });

      it('will return undefined if nothing\'s found', () => {
        return resolve([1, 2, 3])
          .detectSeries(v => v > 3)
          .should.eventually.be.undefined;
      });
    });

    describe('.sortBy()', () => {
      it('sorts an array of values', () => {
        resolve([
          resolve(10),
          resolve(4),
          8, 3
        ])
          .sortBy().should.eventually.eql([3, 4, 8, 10]);
      });

      it('can use a custom compare function', () => {
        resolve([
          {foo: 4},
          {foo: 3}
        ])
          .sortBy((a, b) => {
            if (a.foo === b.foo) return 0;
            return a.foo < b.foo ? -1 : 1;
          })
          .should.eventually.eql([
            {foo: 3},
            {foo: 4}
          ]);
      });
    });

    describe('.some()', () => {
      it('will resolve true if any values are truthy', () => {
        return resolve([
          resolve('mung'),
          'face'
        ])
          .some(v => v === 'mung')
          .should.eventually.be.true;
      });

      it('will resolve false if no values are truthy', () => {
        return resolve([
          resolve('mung'),
          'face'
        ])
          .some(v => v === 'foo')
          .should.eventually.be.false;
      });
    });

    describe('.every()', () => {
      it('will resolve true if all values are truthy', () => {
        return resolve([
          resolve('mung'),
          'face'
        ])
          .every(v => v.length === 4)
          .should.eventually.be.true;
      });

      it('will resolve false if all values are not truthy', () => {
        return resolve([
          resolve('foo'),
          'face'
        ])
          .every(v => v.length === 4)
          .should.eventually.be.false;
      });
    });

  });

  describe('Control Flow', () => {

    describe('.series()', () => {
      let first, second, promise;

      beforeEach(() => {
        first = sinon.stub().returns(1);
        second = sinon.stub().returns(2);
        promise = Promsync.series([
          resolve(first, 10),
          resolve(second)
        ]);
      });

      it('will call every task', () => {
        return promise
          .then(() => first.should.have.been.calledOnce)
          .then(() => second.should.have.been.calledOnce);
      });

      it('will call each task in series', () => {
        return promise.then(() => first.should.have.been.calledBefore(second));
      });

      it('will return the results in the correct order', () => {
        return promise.should.eventually.eql([1, 2]);
      });

      it('can return key/value pairs', () => {
        return Promsync
          .series({
            foo: first,
            bar: second
          })
          .should.eventually.eql({
            foo: 1,
            bar: 2
          });
      });
    });

    describe('.parallel()', () => {
      let first, second, promise;

      beforeEach(() => {
        first = sinon.stub().returns(1);
        second = sinon.stub().returns(2);
        promise = Promsync.parallel([
          resolve(second, 10),
          resolve(first)
        ]);
      });

      it('will call every task', () => {
        return promise
          .then(() => first.should.have.been.calledOnce)
          .then(() => second.should.have.been.calledOnce);
      });

      it('will call each task in parallel', () => {
        return promise.then(() => first.should.have.been.calledBefore(second));
      });

      it('will return the results in the correct order', () => {
        return promise.should.eventually.eql([2, 1]);
      });

      it('can return key/value pairs', () => {
        return Promsync
          .parallel({
            foo: first,
            bar: second
          })
          .should.eventually.eql({
            foo: 1,
            bar: 2
          });
      });
    });

    describe('parallelLimit()', () => {
      let first, second, third, promise;

      beforeEach(() => {
        let methods = {
          first: function () {},
          second: function () {},
          third: function () {}
        };
        sinon.stub(methods);
        first = methods.first.returns(1);
        second = methods.second.returns(2);
        third = methods.third.returns(3);
        promise = Promsync.parallelLimit([
          resolve(second, 10),
          resolve(first, 5),
          resolve(third)
        ], 2);
      });

      it('will call every task', () => {
        return promise
          .then(() => first.should.have.been.calledOnce)
          .then(() => second.should.have.been.calledOnce)
          .then(() => third.should.have.been.calledOnce);
      });

      it('will call the methods in parallel chunks', () => {
        return promise
          .then(() => third.should.have.been.calledAfter(first))
          .then(() => third.should.have.been.calledAfter(second))
          .then(() => first.should.have.been.calledBefore(second));
      });

      it('will return the results in the correct order', () => {
        return promise.should.eventually.eql([2, 1, 3]);
      });

      it('can return key/value pairs', () => {
        return Promsync
          .parallelLimit({
            foo: first,
            bar: second,
            lorem: third
          }, 2)
          .should.eventually.eql({
            foo: 1,
            bar: 2,
            lorem: 3
          });
      });
    });

    describe('.whilst()', () => {
      it('will call a function until told otherwise', () => {
        let called = 0;
        return Promsync.whilst(
          () => resolve(called < 100),
          () => resolve(called++)
        )
          .then(() => called.should.equal(100));
      });
    });

    describe('.doWhilst()', () => {
      it('will call a function until told otherwise', () => {
        let called = 0;
        return Promsync.doWhilst(
          () => resolve(called++),
          () => resolve(called < 100)
        )
          .then(() => called.should.equal(100));
      });

      it('always calls the fn first', () => {
        let test = sinon.stub().returns(false);
        let fn = sinon.spy();
        return Promsync
          .doWhilst(fn, test)
          .then(() => fn.should.have.been.calledBefore(test));
      });
    });

  });

});

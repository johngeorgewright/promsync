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

  describe('collections', () => {
    let promise;

    beforeEach(() => {
      promise = resolve();
    });

    describe('.each()', () => {
      it('will call the iterator for each value', () => {
        let results = [];
        return promise
          .each(['foo', 'bar'], (v, i) => results.push(v + i))
          .then(() => results).should.eventually.eql(['foo0', 'bar1']);
      });

      it('will resolve the original value', () => {
        return promise
          .each(['foo', 'bar'], (v, i) => v + i)
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
        return promise
          .eachSeries(['foo', 'bar'], (value, i) => result.push(value + i))
          .then(() => result).should.eventually.eql(['foo0', 'bar1']);
      });

      it('will resolve the original value', () => {
        return promise
          .eachSeries(['foo', 'bar'], (value, i) => value + i)
          .should.eventually.eql(['foo', 'bar']);
      });

      it('will resolve the values in series', () => {
        let arr = [
          resolve(1, 10),
          resolve(2)
        ];
        return promise
          .eachSeries(arr)
          .should.eventually.eql([1, 2]);
      });

      it('will call the iterator in series', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let arr = [
          resolve(first, 10),
          resolve(second)
        ];
        return promise
          .eachSeries(arr, spy => spy())
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
        return promise
          .eachLimit(['foo', 'bar'], 1, (v, i) => result.push(v + i))
          .then(() => result).should.eventually.eql(['foo0', 'bar1']);
      });

      it('will resolve the original results', () => {
        return promise
          .eachLimit(['foo', 'bar'], 1, (v, i) => v + i)
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
        return promise
          .map(['foo', 'bar'], (v, i) => v + i)
          .should.eventually.eql(['foo0', 'bar1']);
      });

      it('can be used as a class method', () => {
        return Promsync
          .map(['foo', 'bar'], (v, i) => v + (i + 1))
          .should.eventually.eql(['foo1', 'bar2']);
      });

      it('will always return the values in the correct order', () => {
        let arr = [
          resolve(1, 10),
          resolve(2)
        ];
        return promise
          .map(arr)
          .should.eventually.eql([1, 2]);
      });

      it('will resolve the values in parallel', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let arr = [
          resolve(second, 10),
          resolve(first, 0)
        ];
        return promise
          .map(arr, spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.mapSeries()', () => {
      it('will call each iterator resolving new values', () => {
        return promise
          .mapSeries(['foo', 'bar'], (v, i) => v + (i + 1))
          .should.eventually.eql(['foo1', 'bar2']);
      });

      it('will always return the values in the correct order', () => {
        let arr = [
          resolve(1, 10),
          resolve(2)
        ];
        return promise
          .mapSeries(arr)
          .should.eventually.eql([1, 2]);
      });

      it('will resolve the values in series', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let arr = [
          resolve(first, 10),
          resolve(second)
        ];
        return promise
          .mapSeries(arr, spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.forEachOf()', () => {
      it('will call the iterator for each value', () => {
        let result = {};
        return promise
          .forEachOf({foo: 'bar', lorem: 'ipsum'}, (v, k) => result[v] = k)
          .then(() => result)
          .should.eventually.eql({bar: 'foo', ipsum: 'lorem'});
      });

      it('will always resolve the original values', () => {
        return promise
          .forEachOf({foo: 'bar', lorem: 'ipsum'}, (v, k) => v + k)
          .should.eventually.eql({foo: 'bar', lorem: 'ipsum'});
      });

      it('will resolve the values in parallel', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let obj = {
          second: resolve(second, 10),
          first: resolve(first)
        };
        return promise
          .forEachOf(obj, spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.forEachOfSeries()', () => {
      it('will call the iterator for each value', () => {
        let result = {};
        return promise
          .forEachOfSeries({foo: 'bar', lorem: 'ipsum'}, (v, k) => result[v] = k)
          .then(() => result)
          .should.eventually.eql({bar: 'foo', ipsum: 'lorem'});
      });

      it('will always resolve the original values', () => {
        return promise
          .forEachOfSeries({foo: 'bar', lorem: 'ipsum'}, (v, k) => v + k)
          .should.eventually.eql({foo: 'bar', lorem: 'ipsum'});
      });

      it('will iterate in series', () => {
        let first = sinon.spy();
        let second = sinon.spy();
        let obj = {
          first: resolve(first, 10),
          second: resolve(second)
        };
        return promise
          .forEachOfSeries(obj, spy => spy())
          .then(() => first.should.have.been.calledBefore(second));
      });
    });

    describe('.forEachOfLimit()', () => {
      it('will call the iterator for each value', () => {
        let result = [];
        return promise
          .forEachOfLimit({foo: 'bar', lorem: 'ipsum'}, 1, (v, k) => result.push(v + k))
          .then(() => result).should.eventually.eql(['barfoo', 'ipsumlorem']);
      });

      it('will resolve the original results', () => {
        return promise
          .forEachOfLimit({foo: 'bar', lorem: 'ipsum'}, 1, (v, k) => k + v)
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

  });

});

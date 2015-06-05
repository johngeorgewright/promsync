/*eslint-env node, mocha*/

import Promsync from '../promsync.es';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
chai.should();

describe('Promsync', () => {

  describe('collections', () => {
    let promise;

    beforeEach(() => {
      promise = new Promsync(resolve => resolve());
    });

    describe('.each()', () => {
      it('will call the iterator for each value resolving the original value', () => {
        return promise
          .each(['foo', 'bar'], (v, i) => v + i)
          .should.eventually.eql(['foo', 'bar']);
      });

      it('will call the iterators in parallel', () => {
        let arr = [
          new Promsync(resolve => {
            setTimeout(() => resolve(1), 0);
          }),
          new Promsync(resolve => {
            setTimeout(() => resolve(2), 10);
          })
        ];
        return promise
          .each(arr)
          .should.eventually.eql([1, 2]);
      });

      it('works as a class function', () => {
        return Promsync
          .each(['foo', 'bar'], (v, i) => v + i)
          .should.eventually.eql(['foo', 'bar']);
      });
    });

    describe('.eachSeries()', () => {
      it('will call the iterator for each value resolving the original value', () => {
        return promise
          .eachSeries(['foo', 'bar'], (value, i) => value + i)
          .should.eventually.eql(['foo', 'bar']);
      });

      it('will call the iterator in series', () => {
        let arr = [
          new Promise(resolve => {
            setTimeout(() => resolve(1), 10);
          }),
          new Promise(resolve => {
            setTimeout(() => resolve(2), 0);
          })
        ];
        return promise
          .eachSeries(arr)
          .should.eventually.eql([1, 2]);
      });

      it('will work as a class method', () => {
        let arr = [
          new Promise(resolve => {
            setTimeout(() => resolve(1), 10);
          }),
          new Promise(resolve => {
            setTimeout(() => resolve(2), 0);
          })
        ];
        return Promsync
          .eachSeries(arr)
          .should.eventually.eql([1, 2]);
      });
    });

    describe('.eachLimit()', () => {
      it('will call each iterator resolving the original results', () => {
        return promise
          .eachLimit(['foo', 'bar'], 1, (v, i) => v + i)
          .should.eventually.eql(['foo', 'bar']);
      });

      it('call chunks in series', () => {
        let arr = [
          new Promise(resolve => {
            setTimeout(() => resolve(2), 20);
          }),
          new Promise(resolve => {
            setTimeout(() => resolve(1), 10);
          }),
          new Promise(resolve => {
            setTimeout(() => resolve(3), 0);
          })
        ];
        return Promsync
          .eachLimit(arr, 2)
          .should.eventually.eql([1, 2, 3]);
      });
    });

    describe('.map()', () => {
      it('will call each iterator', () => {
        return promise
          .map(['foo', 'bar'], (v, i) => v + i)
          .should.eventually.eql(['foo0', 'bar1']);
      });
    });
  });

});

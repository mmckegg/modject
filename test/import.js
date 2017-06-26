var test = require('tape')
var Modject = require('../')
var MockFs = require('./lib/mock-fs')

test('import single with root override', t => {
  var sub = Modject({
    root: '/sub',
    gives: ['get', 'a', 'b']
  })

  var root = Modject({
    root: '/root',
    gives: ['entry'],
    imports: [sub]
  })

  var need = root({
    fs: MockFs({
      root: {
        'entry.js': () => {
          module.exports = {
            a: module.need('a'),
            b: module.need('b'),
            subValue: module.need('get')
          }
        },
        'a.js': () => { module.exports = 'root-a' }
      },
      sub: {
        'get.js': () => {
          module.exports = {
            a: module.need('a'), b: module.need('b')
          }
        },
        'a.js': () => { module.exports = 'sub-a' },
        'b.js': () => { module.exports = 'sub-b' }
      }
    })
  })

  t.deepEqual(need('entry'), {
    a: 'root-a',
    b: 'sub-b',
    subValue: {
      a: 'sub-a',
      b: 'sub-b'
    }
  })
  t.end()
})

test('partial import', t => {
  var sub = Modject({
    root: '/sub',
    gives: ['a', 'b']
  })

  var rootOnly = Modject({
    root: '/root',
    gives: ['a', 'b'],
    imports: [
      [sub, {
        only: ['a']
      }]
    ]
  })

  var rootExcept = Modject({
    root: '/root',
    gives: ['a', 'b'],
    imports: [
      [sub, {
        except: ['a']
      }]
    ]
  })

  var fs = MockFs({
    root: {},
    sub: {
      'a.js': () => { module.exports = 'sub-a' },
      'b.js': () => { module.exports = 'sub-b' }
    }
  })

  var needWithOnly = rootOnly({ fs })

  t.deepEqual(needWithOnly('a'), 'sub-a')
  t.throws(() => {
    needWithOnly('b')
  })

  var needWithExcept = rootExcept({ fs })
  t.deepEqual(needWithExcept('b'), 'sub-b')
  t.throws(() => {
    needWithExcept('a')
  })

  t.end()
})

test('import many with root merge', t => {
  var sub = Modject({
    root: '/sub',
    gives: ['many/']
  })

  var root = Modject({
    root: '/root',
    gives: ['entry'],
    imports: [sub]
  })

  var need = root({
    fs: MockFs({
      root: {
        'entry.js': () => {
          module.exports = module.need('many/')
        },
        'many': {
          'b.js': () => { module.exports = 'root-b' },
          'c.js': () => { module.exports = 'root-c' }
        }
      },
      sub: {
        'many': {
          'a.js': () => { module.exports = 'sub-a' },
          'b.js': () => { module.exports = 'sub-b' }
        }
      }
    })
  })

  t.deepEqual(need('entry'), ['sub-a', 'root-b', 'root-c'])
  t.end()
})

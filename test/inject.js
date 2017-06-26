var test = require('tape')
var Modject = require('../')
var MockFs = require('./lib/mock-fs')

test('inject single', t => {
  var sub = Modject({
    root: '/sub',
    gives: ['get', 'a', 'b']
  })

  var root = Modject({
    root: '/root',
    gives: ['entry', 'b'],
    imports: [
      // only inject a
      [sub, {inject: ['a']}]
    ]
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
        'a.js': () => { module.exports = 'root-a' },
        'b.js': () => { module.exports = 'root-b' }
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
    b: 'root-b',
    subValue: {
      a: 'root-a',
      b: 'sub-b'
    }
  })
  t.end()
})

test('import many with inject', t => {
  var sub = Modject({
    root: '/sub',
    gives: ['sub-value']
  })

  var root = Modject({
    root: '/root',
    gives: ['entry'],
    imports: [
      // remove from inner by injecting non-existent file
      [sub, {inject: ['many/', 'many/excluded']}]
    ]
  })

  var need = root({
    fs: MockFs({
      root: {
        'entry.js': () => {
          module.exports = {
            root: module.need('many/'),
            sub: module.need('sub-value')
          }
        },
        'many': {
          'c.js': () => { module.exports = 'root-c' },
          'd.js': () => { module.exports = 'root-d' }
        }
      },
      sub: {
        'sub-value.js': () => {
          module.exports = module.need('many/')
        },
        'many': {
          'a.js': () => { module.exports = 'sub-a' },
          'b.js': () => { module.exports = 'sub-b' },
          'excluded.js': () => { module.exports = 'not included' }
        }
      }
    })
  })

  t.deepEqual(need('entry'), {
    root: ['root-c', 'root-d'],
    sub: ['sub-a', 'sub-b', 'root-c', 'root-d']
  })
  t.end()
})

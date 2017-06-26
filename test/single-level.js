var test = require('tape')
var Modject = require('../')
var MockFs = require('./lib/mock-fs')

test('give single / many', t => {
  var root = Modject({
    root: '/root',
    gives: ['entry', 'many']
  })

  var need = root({
    fs: MockFs({
      root: {
        'entry.js': () => { module.exports = 'you found me' },
        'many': {
          'a.js': () => { module.exports = 'a' },
          'b.js': () => { module.exports = 'b' },
          'c.js': () => { module.exports = 'c' }
        }
      }
    })
  })

  t.deepEqual(need('entry'), 'you found me')
  t.deepEqual(need('many/'), ['a', 'b', 'c'])
  t.end()
})

test('local need', t => {
  var root = Modject({
    root: '/root',
    gives: ['entry']
  })

  var need = root({
    fs: MockFs({
      root: {
        'entry.js': () => {
          var single = module.need('single')
          var many = module.need('many/')
          module.exports = { single, many }
        },
        'single.js': () => { module.exports = 'value' },
        'many': {
          'a.js': () => { module.exports = 'a' },
          'b.js': () => { module.exports = 'b' },
          'c.js': () => { module.exports = 'c' }
        }
      }
    })
  })

  t.deepEqual(need('entry'), {
    single: 'value',
    many: ['a', 'b', 'c']
  })
  t.end()
})

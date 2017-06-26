var extend = require('xtend')
var nodeFs = require('fs')
var Path = require('path')
var requireFromString = require('./lib/require-from-string-with-need')

module.exports = function (meta) {
  var fn = function ({
    fs = nodeFs,
    inject = {}
  } = {}) {
    var injected = inject
    var given = {}
    var cache = {}

    if (Object.keys(inject).length) {
      console.log(inject)
    }

    if (Array.isArray(meta.imports)) {
      meta.imports.forEach((item) => {
        if (!Array.isArray(item)) {
          item = [item, {}]
        }

        var factory = item[0]
        var importOpts = item[1]
        var inject = extend(injected)
        var except = {}
        if (Array.isArray(importOpts.inject)) {
          importOpts.inject.forEach(path => {
            inject[path] = need
          })
        }
        if (Array.isArray(importOpts.except)) {
          importOpts.except.forEach(path => {
            except[path] = true
          })
        }
        var remoteNeed = factory({inject, fs})
        var only = importOpts.only
        if (Array.isArray(factory.meta.gives)) {
          factory.meta.gives.forEach(give => {
            if (!inject[give] && !except[give] && (!only || only.includes(give))) {
              given[give] = remoteNeed
            }
          })
        }
      })
    }

    need.meta = meta
    need.root = meta.root
    need.resolve = resolve

    return need

    function need (path) {
      if (path.endsWith('/')) {
        return requireFromLayer(path)
      } else {
        if (injected[path]) {
          return injected[path](path)
        } else if (existsInLayer(path)) {
          return requireFromLayer(path)
        } else if (given[path]) {
          return given[path](path)
        } else {
          throw new NotFoundError(`No packages in scope give "${path}"`)
        }
      }
    }

    function resolve (path) {
      if (path.endsWith('/')) {
        var result = {}

        for (var key in given) {
          if (key === path) {
            result = extend(result, given[path].resolve(path))
          } else if (isDirectSub(path, key)) {
            result[key] = given[key]
          }
        }

        result = extend(result, resolveFromLayer(path))

        for (var key in injected) {
          if (key === path) {
            result = extend(result, injected[path].resolve(path))
          } else if (isDirectSub(path, key)) {
            result[key] = injected[key]
          }
        }

        return result
        // handle bulk/inject
      } else {
        if (injected[path]) {
          return injected[path]
        } else if (existsInLayer(path)) {
          return requireFromLayer
        } else if (given[path]) {
          return given[path]
        }
      }
    }

    function existsInLayer (path) {
      if (path in cache) {
        return true
      }
      if (!path.endsWith('/')) {
        path += '.js'
      }
      var resolvedPath = Path.join(meta.root, path)
      try {
        var stat = fs.statSync(resolvedPath)
      } catch (ex) {
        return false
      }
      // TODO: handle ensuring is a directory
      return true
    }

    function requireFromLayer (path) {
      if (path in cache) {
        return cache[path]
      }

      if (path.endsWith('/')) {
        if (!cache[path]) {
          var modules = resolve(path)
          var result = cache[path] = []
          for (var key in modules) {
            try {
              result.push(modules[key](key))
            } catch (ex) {
              // ignore not found
              if (!(ex instanceof NotFoundError)) {
                throw ex
              }
            }
          }
        }
        return cache[path]
      } else {
        var resolvedPath = Path.join(meta.root, path) + '.js'
        var code = fs.readFileSync(resolvedPath, 'utf8')
        var exports = requireFromString(code, resolvedPath, { need })
        cache[path] = exports
        return exports
      }
    }

    function resolveFromLayer (path) {
      if (path.endsWith('/')) {
        try {
          var entries = fs.readdirSync(Path.join(meta.root, path))
        } catch (ex) {
          return {}
        }
        return entries.reduce((result, entry) => {
          var key = `${path}${entry.slice(0, -3)}`
          if (entry.toLowerCase().endsWith('.js')) {
            result[key] = requireFromLayer
          }
          return result
        }, {})
      } else if (existsInLayer(path)) {
        return requireFromLayer
      }
    }
  }

  fn.meta = meta
  return fn
}

function isDirectSub (path, key) {
  if (key.startsWith(path)) {
    return !key.slice(path.length).includes('/')
  }
}

class NotFoundError extends Error {}

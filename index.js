'use strict'

const resolve = require('path').resolve
const bankai = require('bankai')
const gzipMaybe = require('http-gzip-maybe')
const pump = require('pump')
const fp = require('fastify-plugin')

function assetsCompiler (fastify, opts, next) {
  if (!opts.entry) {
    return next(new Error('Missing entry file!'))
  }
  if (typeof opts.entry !== 'string') {
    return next(new Error('entry must be a string'))
  }

  var ssr
  delete opts.prefix
  const compiler = bankai(resolve(opts.entry || ''), opts)
  compiler.on('error', function (topic, sub, err) {
    fastify.setErrorHandler((error, reply) => {
      error = err
      if (err.pretty) reply.send(err.pretty)
      else reply.send(`${topic}:${sub} ${err.message}\n${err.stack}`)
    })
  })
  compiler.on('ssr', function (result) {
    ssr = result
  })

  fastify.get('/', (req, reply) => {
    var url = req.req.url

    if (ssr && ssr.renderRoute) {
      ssr.renderRoute(url, function (err, buffer) {
        if (err) {
          ssr.success = false
          ssr.error = err
          return sendDocument(url, req.req, reply.res, next)
        }

        reply.header('content-type', 'text/html')
        gzip(buffer, req.req, reply.res)
      })
    } else {
      return sendDocument(url, req.req, reply.res, next)
    }

    function sendDocument (url, req, res, next) {
      compiler.documents(url, function (err, node) {
        if (err) {
          return compiler.documents('/404', function (err, node) {
            if (err) return next() // No matches found, call next
            res.statusCode = 404
            res.setHeader('content-type', 'text/html')
            gzip(node.buffer, req, res)
          })
        }
        res.setHeader('content-type', 'text/html')
        gzip(node.buffer, req, res)
      })
    }
  })

  fastify.get('/:file', (req, reply) => {
    var filename = req.params.file

    var extension = req.params.file.split('.').pop()
    if (extension === 'js') {
      compiler.scripts(filename, (err, node) => {
        if (err) {
          return reply
            .code(404)
            .send(err.message)
        }
        reply.header('content-type', 'application/javascript')
        gzip(node.buffer, req.req, reply.res)
      })
    } else if (extension === 'html') {
      compiler.documents(filename, (err, node) => {
        if (err) {
          return reply
            .code(404)
            .send(err.message)
        }
        reply.header('content-type', 'text/html')
        gzip(node.buffer, req.req, reply.res)
      })
    } else {
      reply.redirect(404, '/')
    }
  })

  next()
}

module.exports = fp(assetsCompiler, '>= 0.37.0')

function gzip (buffer, req, res) {
  var zipper = gzipMaybe(req, res)
  pump(zipper, res)
  zipper.end(buffer)
}

'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')

test('Should expose a route with the assets', t => {
  t.plan(6)

  const fastify = Fastify()
  fastify.register(
    require('./index'),
    { entry: './client.js', watch: false, reload: false }
  )

  fastify.inject({
    url: '/',
    method: 'GET'
  }, res => {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/html')
  })
  fastify.inject({
    url: '/index.html',
    method: 'GET'
  }, res => {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/html')
  })
  fastify.inject({
    url: '/bundle.js',
    method: 'GET'
  }, res => {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/javascript')
  })
})

test('should return 404 if an assets is not found', t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.register(
    require('./index'),
    { entry: './client.js', watch: false, reload: false }
  )

  fastify.inject({
    url: '/file.php',
    method: 'GET'
  }, res => {
    t.equal(res.statusCode, 404)
  })
})

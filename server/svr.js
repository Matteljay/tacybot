const express = require('express')
const cors = require('cors')
const slowDown = require('express-slow-down')
const app = express()
require('express-ws')(app)
const log = (msg) => console.log(new Date().toISOString(), msg.toString().substring(0, 100));

// Middleware
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors())
app.set('trust proxy', true) // for rate limiting (req.ip)
const speedLimiter = slowDown({ windowMs: 3000, delayAfter: 2, delayMs: 500 })
app.use(speedLimiter)

// Dynamic routes
const permit = require('./api/permit')
permit.openDB()
app.use('/api/permit', permit.router)
const content = require('./api/content')
app.use('/api/content', content.router)

// Static route
app.use(express.static('public'))
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})

// Finish server config
const port = process.env.EXPRESS_PORT || 5000
const server = app.listen(port, () => log(`Tacybot server started on http://localhost:${port}`))
const shutdown = async () => {
  console.log('caught shutdown signal')
  await permit.closeDB()
  server.close(log('express closed'))
  process.exit(0)
}
process.on('SIGUSR2', shutdown) // nodemon
process.on('SIGINT', shutdown) // ctrl+c
process.on('SIGTERM', shutdown) // normal kill

// EOF

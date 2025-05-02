const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('./services/authService')
const { authRouter, classifiedsRouter } = require('./routes')
const path = require('path')

const app = express()

app.use(cors())

app.use(express.json())
app.use(
	session({
		secret: process.env.SESSION_SECRET || 'your-session-secret',
		resave: false,
		saveUninitialized: false,
	})
)
app.use(passport.initialize())
app.use(passport.session())

app.use('/public', express.static(path.join(__dirname, 'public')))

// Routes
app.use('/', authRouter)
app.use('/', classifiedsRouter)

module.exports = app

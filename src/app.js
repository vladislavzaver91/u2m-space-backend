const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('./services/authService')
const { authRouter } = require('./routes')

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

// Routes
app.use('/', authRouter)

module.exports = app

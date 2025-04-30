const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('./services/authService')
const { authRouter } = require('./routes')

const app = express()

app.use(
	cors({
		origin: process.env.FRONTEND_URL || 'http://localhost:3001',
		credentials: true,
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	})
)

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

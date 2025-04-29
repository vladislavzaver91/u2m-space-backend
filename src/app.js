const express = require('express')
const cors = require('cors')
const session = require('express-session')
const cookieParser = require('cookie-parser')
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
		secret: 'your-session-secret',
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.NODE_ENV === 'production',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000,
		} /* !!В продакшен установить secure: true для HTTPS!! */,
	})
)
app.use(cookieParser())
app.use(passport.initialize())
app.use(passport.session())

// Routes
app.use('/', authRouter)

module.exports = app

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('./services/authService')
const { authRouter } = require('./routes')

const app = express()

const allowedOrigins = [
	process.env.FRONTEND_URL,
	'https://u2m-space-frontend-gf1tarlz4-vladislavzaver91s-projects.vercel.app',
	'http://localhost:3001',
]

app.use(
	cors({
		origin: (origin, callback) => {
			// Разрешить запросы без origin (например, от серверных приложений)
			if (!origin) return callback(null, true)
			if (allowedOrigins.includes(origin)) {
				callback(null, true)
			} else {
				callback(new Error('Not allowed by CORS'))
			}
		},
		credentials: true,
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	})
)
app.options('*', cors())
app.use(express.json())
app.use(
	session({
		secret: process.env.SESSION_SECRET || 'your-session-secret',
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.NODE_ENV === 'production', // HTTPS в продакшене
			httpOnly: true,
			sameSite: 'lax', // Для кросс-доменных запросов
		},
	})
)
app.use(passport.initialize())
app.use(passport.session())

// Routes
app.use('/', authRouter)

module.exports = app

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('./services/authService')
const {
	authRouter,
	classifiedsRouter,
	tagsRouter,
	userRouter,
	currencyRouter,
} = require('./routes')
const path = require('path')

const app = express()

app.use(cors())

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

app.use(
	session({
		secret: process.env.SESSION_SECRET || 'your-session-secret',
		resave: false,
		saveUninitialized: false,
		cookie: {
			sameSite: 'none',
			secure: true,
		},
	})
)
app.use(passport.initialize())
app.use(passport.session())

app.use('/public', express.static(path.join(__dirname, 'public')))

// Routes
app.use('/', authRouter)
app.use('/', classifiedsRouter)
app.use('/', tagsRouter)
app.use('/', userRouter)
app.use('/', currencyRouter)

module.exports = app

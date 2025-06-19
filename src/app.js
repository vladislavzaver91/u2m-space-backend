const express = require('express')
const cors = require('cors')
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

// Настройка CORS для поддержки кросс-доменных запросов
app.use(
	cors({
		origin: process.env.FRONTEND_URL,
		credentials: true,
	})
)

// Парсинг JSON и URL-encoded данных с ограничением размера
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Инициализация Passport.js без сессий
app.use(passport.initialize())

// Статические файлы
app.use('/public', express.static(path.join(__dirname, 'public')))

// Маршруты
app.use('/', authRouter)
app.use('/', classifiedsRouter)
app.use('/', tagsRouter)
app.use('/', userRouter)
app.use('/', currencyRouter)

module.exports = app

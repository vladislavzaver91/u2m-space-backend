const express = require('express')
const authController = require('../controllers/auth/authorization')
const refreshController = require('../controllers/auth/refresh')
const loginController = require('../controllers/auth/loginForDevelop')

const router = express.Router()

// Google Auth Routes
router.get('/api/auth/google', authController.googleAuth)
router.get('/api/auth/callback/google', authController.googleCallback)

// Facebook Auth Routes
router.get('/api/auth/facebook', authController.facebookAuth)
router.get('/api/auth/callback/facebook', authController.facebookCallback)

// Apple Auth Routes
router.get('/api/auth/apple', authController.appleAuth)
router.get('/api/auth/callback/apple', authController.appleCallback)

// Success and Failure Routes
router.get('/api/auth/success', authController.authSuccess)
router.get('/api/auth/failure', authController.authFailure)

// Обмен state на данные
router.get('/api/auth/exchange', authController.exchangeState)

// Refresh Token Route
router.post('/api/auth/refresh', refreshController.refreshToken)

// Тестовый ендпоинт для разработки
router.post('/api/auth/login', loginController.loginForDevelop)

module.exports = router

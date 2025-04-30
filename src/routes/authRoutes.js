const express = require('express')
const authController = require('../controllers/auth/authorization')
const refreshController = require('../controllers/auth/refresh')

const router = express.Router()

// Google Auth Routes
router.get('/api/auth/google', authController.googleAuth)
router.get('/api/auth/callback/google', authController.googleCallback)

// Facebook Auth Routes
router.get('/api/auth/facebook', authController.facebookAuth)
router.get('/api/auth/callback/facebook', authController.facebookCallback)

// Success and Failure Routes
router.get('/api/auth/success', authController.authSuccess)
router.get('/api/auth/failure', authController.authFailure)

// Обмен state на данные
router.get('/api/auth/exchange', authController.exchangeState)

// Refresh Token Route
router.post('/api/auth/refresh', refreshController.refreshToken)

module.exports = router

const express = require('express')
const authController = require('../controllers/auth/authorization')
const refreshController = require('../controllers/auth/refresh')
const clearCookies = require('../middleware/clearCookies')

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

// получения данных из cookie
router.get('/api/auth/data', authController.getData, clearCookies)

// Refresh Token Route
router.post('/api/auth/refresh', refreshController.refreshToken)

module.exports = router

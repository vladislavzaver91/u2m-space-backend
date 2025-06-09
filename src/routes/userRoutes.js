const express = require('express')
const multer = require('multer')
const authMiddleware = require('../middleware/auth')
const { updateCurrency } = require('../controllers/user/updateCurrency')
const { getUserProfile } = require('../controllers/user/getUserProfile')
const { updateUserProfile } = require('../controllers/user/updateUserProfile')
const { deleteUserProfile } = require('../controllers/user/deleteUserProfile')

const router = express.Router()

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // Лимит 5 МБ
})

// Публичные маршруты
router.put('/api/users/:id/currency', updateCurrency)

// Защищенные маршруты (требуют авторизации)
router.get('/api/users/:id', authMiddleware, getUserProfile)
router.post(
	'/api/users/:id/update',
	authMiddleware,
	upload.single('avatar'),
	updateUserProfile
)
router.delete('/api/user/:id', authMiddleware, deleteUserProfile)

module.exports = router

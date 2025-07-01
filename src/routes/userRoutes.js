const express = require('express')
const multer = require('multer')
const authMiddleware = require('../middleware/auth')
const { updateCurrency } = require('../controllers/user/updateCurrency')
const { getUserProfile } = require('../controllers/user/getUserProfile')
const { updateUserProfile } = require('../controllers/user/updateUserProfile')
const { deleteUserProfile } = require('../controllers/user/deleteUserProfile')
const {
	updateGuestSettings,
} = require('../controllers/user/updateGuestSettings')
const { updateRules } = require('../controllers/user/updateRules')
const {
	deleteUserNotification,
} = require('../controllers/user/deleteUserNotifications')
const {
	getUserNotifications,
} = require('../controllers/user/getUserNotifications')

const router = express.Router()

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // Лимит 5 МБ
})

// Публичные маршруты
router.put('/api/users/:id/currency', updateCurrency)
router.post('/api/users/guest/settings', updateGuestSettings)

// Защищенные маршруты (требуют авторизации)
router.get('/api/users/:id', authMiddleware, getUserProfile)
router.post(
	'/api/users/:id/update',
	authMiddleware,
	upload.single('avatar'),
	updateUserProfile
)
router.delete('/api/user/:id', authMiddleware, deleteUserProfile)

router.post('/api/rules/update', authMiddleware, updateRules)
router.get('/api/users/:id/notifications', authMiddleware, getUserNotifications)
router.delete(
	'/api/users/:id/notifications/:notificationId',
	authMiddleware,
	deleteUserNotification
)

module.exports = router

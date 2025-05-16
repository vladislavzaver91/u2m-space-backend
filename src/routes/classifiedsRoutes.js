const express = require('express')
const multer = require('multer')
const authMiddleware = require('../middleware/auth')
const {
	getAllClassifieds,
} = require('../controllers/classifieds/getAllClassifieds')
const {
	getClassifiedById,
} = require('../controllers/classifieds/getClassifiedById')
const {
	createClassified,
} = require('../controllers/classifieds/createClassified')
const {
	updateClassified,
} = require('../controllers/classifieds/updateClassified')
const {
	deleteClassified,
} = require('../controllers/classifieds/deleteClassified')
const {
	getUserClassifieds,
} = require('../controllers/classifieds/getUserClassifieds')
const formDataMiddleware = require('../middleware/formDataMiddleware')
const {
	toggleClassifiedActive,
} = require('../controllers/classifieds/toggleClassifiedActive')
const { toggleFavorite } = require('../controllers/classifieds/toggleFavorite')

const router = express.Router()

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // Лимит 5 МБ на файл
})

// Публичные маршруты
router.get('/api/classifieds', getAllClassifieds)
router.get('/api/classifieds/user', authMiddleware, getUserClassifieds)
router.get('/api/classifieds/:id', getClassifiedById)

// Защищенные маршруты (требуют авторизации)
router.post(
	'/api/classifieds',
	authMiddleware,
	upload.array('images', 8),
	createClassified
)
router.put(
	'/api/classifieds/:id',
	authMiddleware,
	upload.array('images', 8),
	formDataMiddleware,
	updateClassified
)
router.patch(
	'/api/classifieds/:id/toggle-active',
	authMiddleware,
	toggleClassifiedActive
)
router.patch(
	'/api/classifieds/:id/toggle-favorite',
	authMiddleware,
	toggleFavorite
)
router.delete('/api/classifieds/:id', authMiddleware, deleteClassified)

module.exports = router

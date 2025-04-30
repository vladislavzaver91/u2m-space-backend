const express = require('express')
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

const router = express.Router()

// Публичные маршруты
router.get('/api/classifieds', getAllClassifieds)
router.get('/api/classifieds/:id', getClassifiedById)

// Защищенные маршруты (требуют авторизации)
router.post('/api/classifieds', authMiddleware, createClassified)
router.put('/api/classifieds/:id', authMiddleware, updateClassified)
router.delete('/api/classifieds/:id', authMiddleware, deleteClassified)

module.exports = router

const express = require('express')
const authMiddleware = require('../middleware/auth')
const { createTag } = require('../controllers/tags/createTag')
const { deleteTag } = require('../controllers/tags/deleteTag')
const { getTags } = require('../controllers/tags/getTags')

const router = express.Router()

router.get('/api/tags', authMiddleware, getTags)
router.post('/api/tags', authMiddleware, createTag)
router.delete('/api/tags/:id', authMiddleware, deleteTag)

module.exports = router

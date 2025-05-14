const express = require('express')
const authMiddleware = require('../middleware/auth')
const { createTag } = require('../controllers/tags/createTag')
const { deleteTag } = require('../controllers/tags/deleteTag')

const router = express.Router()

router.post('/api/tags', authMiddleware, createTag)
router.delete('/api/tags/:id', authMiddleware, deleteTag)

module.exports = router

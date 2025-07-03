const express = require('express')
const { purchasePlan } = require('../controllers/plan/purchasePlan')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

router.post('/api/classifieds/purchase-plan', authMiddleware, purchasePlan) // для покупки плана

module.exports = router

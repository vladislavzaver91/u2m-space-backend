const express = require('express')
const { updateCurrency } = require('../controllers/user/updateCurrency')

const router = express.Router()

router.put('/api/users/:id/currency', updateCurrency)

module.exports = router

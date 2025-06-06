const express = require('express')
const { convertCurrency } = require('../controllers/currency/convertCurrency')

const router = express.Router()

router.post('/api/currency/convert', convertCurrency)

module.exports = router

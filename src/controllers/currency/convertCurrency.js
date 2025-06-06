const { getExchangeRate } = require('../../services/exchangeRateService')
const jwt = require('jsonwebtoken')

const convertCurrency = async (req, res) => {
	const { amount, fromCurrency } = req.body

	// Проверка авторизации (опционально, если требуется)
	const authHeader = req.headers.authorization
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const token = authHeader.split(' ')[1]
	try {
		jwt.verify(token, process.env.JWT_SECRET)
	} catch (error) {
		return res.status(401).json({ error: 'Invalid token' })
	}

	// Валидация входных данных
	if (!amount || isNaN(amount) || amount <= 0) {
		return res.status(400).json({ error: 'Invalid amount' })
	}
	if (!['USD', 'UAH', 'EUR'].includes(fromCurrency)) {
		return res.status(400).json({ error: 'Invalid currency' })
	}

	try {
		// Получение курсов валют с базовой валютой fromCurrency
		const rates = await getExchangeRate(fromCurrency)
		const convertedPrices = {
			USD: Number((amount * (rates.USD || 1)).toFixed(2)),
			UAH: Number((amount * (rates.UAH || 1)).toFixed(2)),
			EUR: Number((amount * (rates.EUR || 1)).toFixed(2)),
		}
		res.json(convertedPrices)
	} catch (error) {
		console.error('Error converting currency:', error.message)
		res.status(500).json({ error: 'Unable to convert currency' })
	}
}

module.exports = { convertCurrency }

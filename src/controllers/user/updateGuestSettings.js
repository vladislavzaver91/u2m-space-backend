const prisma = require('../../lib/prisma')
const jwt = require('jsonwebtoken')

const updateGuestSettings = async (req, res) => {
	const { language, currency, city } = req.body
	// Валидация
	if (!['en', 'uk', 'pl'].includes(language)) {
		return res.status(400).json({ error: 'Invalid language' })
	}
	if (!['USD', 'UAH', 'EUR'].includes(currency)) {
		return res.status(400).json({ error: 'Invalid currency' })
	}
	if (city && typeof city !== 'string') {
		return res.status(400).json({ error: 'Invalid city' })
	}

	try {
		res.json({ language, currency, city: city || null })
	} catch (error) {
		res.status(500).json({ error: 'Error processing settings' })
	}
}

module.exports = { updateGuestSettings }

const prisma = require('../../lib/prisma')
const jwt = require('jsonwebtoken')

const updateCurrency = async (req, res) => {
	const { id } = req.params
	const { currency } = req.body

	const authHeader = req.headers.authorization
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const token = authHeader.split(' ')[1]
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET)
		if (decoded.id !== id) {
			return res.status(403).json({ error: 'Forbidden' })
		}
	} catch (error) {
		return res.status(401).json({ error: 'Invalid token' })
	}

	if (!['USD', 'UAH', 'EUR'].includes(currency)) {
		return res.status(400).json({ error: 'Invalid currency' })
	}

	try {
		const updatedUser = await prisma.user.update({
			where: { id },
			data: { currency },
		})
		res.json(updatedUser)
	} catch (error) {
		res.status(500).json({ error: 'Error updating currency' })
	}
}

module.exports = { updateCurrency }

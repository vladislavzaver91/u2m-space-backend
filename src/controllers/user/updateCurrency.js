const prisma = require('../../lib/prisma')
const jwt = require('jsonwebtoken')

const updateCurrency = async (req, res) => {
	const { id } = req.params
	const { currency } = req.body

	if (!['USD', 'UAH', 'EUR'].includes(currency)) {
		return res.status(400).json({ error: 'Invalid currency' })
	}

	try {
		// Для авторизованных пользователей обновляем в базе
		if (req.headers.authorization) {
			const authHeader = req.headers.authorization

			if (authHeader.startsWith('Bearer ')) {
				const token = authHeader.split(' ')[1]
				const decoded = jwt.verify(token, process.env.JWT_SECRET)

				if (decoded.id === id) {
					const updatedUser = await prisma.user.update({
						where: { id },
						data: { currency },
					})
					return res.json(updatedUser)
				}
			}
		}
		// Для неавторизованных возвращаем только подтверждение
		res.json({ currency })
	} catch (error) {
		console.error('Error updating currency:', error)
		res.status(500).json({ error: 'Error updating currency' })
	}
}

module.exports = { updateCurrency }

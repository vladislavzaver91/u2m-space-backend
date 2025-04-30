const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

const authMiddleware = async (req, res, next) => {
	const authHeader = req.headers.authorization

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Unauthorized: No token provided' })
	}

	const token = authHeader.split(' ')[1]

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET)
		const user = await prisma.user.findUnique({
			where: { id: decoded.id },
		})

		if (!user) {
			return res.status(401).json({ error: 'Unauthorized: User not found' })
		}

		req.user = user
		next()
	} catch (error) {
		console.error('Auth middleware error:', error)
		return res.status(401).json({ error: 'Unauthorized: Invalid token' })
	}
}

module.exports = authMiddleware

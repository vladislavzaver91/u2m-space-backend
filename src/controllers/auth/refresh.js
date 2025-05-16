const jwt = require('jsonwebtoken')
const prisma = require('../../lib/prisma')
const crypto = require('crypto')

exports.refreshToken = async (req, res) => {
	const { refreshToken } = req.body

	if (!refreshToken) {
		console.log('No refresh token provided in request')
		return res.status(401).json({ message: 'Refresh token required' })
	}

	try {
		console.log('Searching for refresh token:', refreshToken)
		// Проверяем рефрешв бд
		const storedToken = await prisma.refreshToken.findUnique({
			where: { token: refreshToken },
			include: { user: true },
		})

		if (!storedToken) {
			console.log('Refresh token not found in database')
			return res.status(401).json({ message: 'Invalid refresh token' })
		}

		if (storedToken.expiresAt < new Date()) {
			console.log('Refresh token expired:', storedToken.expiresAt)
			await prisma.refreshToken.delete({ where: { token: refreshToken } })
			return res.status(401).json({ message: 'Expired refresh token' })
		}

		// Генерируем новый access token
		const accessToken = jwt.sign(
			{
				id: storedToken.user.id,
				email: storedToken.user.email,
				name: storedToken.user.name,
			},
			process.env.JWT_SECRET,
			{ expiresIn: '1h' }
		)

		// Генерируем новый рефреш
		const newRefreshToken = crypto.randomBytes(32).toString('hex')
		const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

		// Обновляем рефреш в бд
		await prisma.refreshToken.update({
			where: { token: refreshToken },
			data: {
				token: newRefreshToken,
				expiresAt: refreshTokenExpires,
			},
		})

		console.log('Refresh token updated successfully')
		res.json({
			accessToken,
			refreshToken: newRefreshToken,
		})
	} catch (error) {
		console.error('Error in refreshToken:', error)
		if (error.code === 'P2025') {
			// Ошибка "Record to update not found"
			return res.status(401).json({ message: 'Invalid refresh token' })
		}
		res.status(500).json({ message: 'Server error' })
	}
}

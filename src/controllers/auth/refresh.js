const jwt = require('jsonwebtoken')
const prisma = require('../../lib/prisma')

exports.refreshToken = async (req, res) => {
	const { refreshToken } = req.body

	if (!refreshToken) {
		return res.status(401).json({ message: 'Refresh token required' })
	}

	try {
		// Проверяем рефрешв бд
		const storedToken = await prisma.refreshToken.findUnique({
			where: { token: refreshToken },
			include: { user: true },
		})

		if (!storedToken || storedToken.expiresAt < new Date()) {
			return res
				.status(401)
				.json({ message: 'Invalid or expired refresh token' })
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

		res.json({
			accessToken,
			refreshToken: newRefreshToken,
		})
	} catch (error) {
		res.status(500).json({ message: 'Server error' })
	}
}

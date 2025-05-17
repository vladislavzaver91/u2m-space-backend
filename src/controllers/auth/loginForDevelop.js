const prisma = require('../../lib/prisma')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const DEFAULT_AVATAR_URL =
	process.env.NODE_ENV === 'development'
		? 'http://localhost:3000/public/avatar-lg.png'
		: 'https://u2m-space-frontend.vercel.app/public/avatar-lg.png'

exports.loginForDevelop = async (req, res) => {
	const { email, password } = req.body

	if (!email || !password) {
		return res.status(400).json({ error: 'Email and password are required' })
	}

	try {
		const user = await prisma.user.findUnique({ where: { email } })
		if (!user || password !== '1234qwer') {
			return res.status(401).json({ error: 'Invalid credentials' })
		}

		const accessToken = jwt.sign(
			{ id: user.id, email: user.email, name: user.name },
			process.env.JWT_SECRET,
			{ expiresIn: '1h' }
		)
		const refreshToken = crypto.randomBytes(32).toString('hex')
		const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

		await prisma.refreshToken.create({
			data: {
				token: refreshToken,
				userId: user.id,
				expiresAt: refreshTokenExpires,
			},
		})

		const userResponse = {
			id: user.id,
			email: user.email,
			name: user.name || '',
			provider: user.provider,
			avatarUrl: user.avatarUrl || DEFAULT_AVATAR_URL,
		}

		return res.json({ user: userResponse, accessToken, refreshToken })
	} catch (error) {
		console.error('Error in login:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

const passport = require('../../services/authService')
const jwt = require('jsonwebtoken')
const prisma = require('../../lib/prisma')
const crypto = require('crypto')

exports.googleAuth = passport.authenticate('google', {
	scope: ['profile', 'email'],
})

exports.googleCallback = passport.authenticate('google', {
	failureRedirect: `${process.env.FRONTEND_URL}/login?error=Authentication failed`,
	successRedirect: `${process.env.FRONTEND_URL}/`,
})

exports.facebookAuth = passport.authenticate('facebook', { scope: ['email'] })

exports.facebookCallback = passport.authenticate('facebook', {
	failureRedirect: `${process.env.FRONTEND_URL}/login?error=Authentication failed`,
	successRedirect: `${process.env.FRONTEND_URL}/`,
})

exports.authSuccess = async (req, res) => {
	if (!req.user) {
		console.error('No user found in authSuccess')
		return res.redirect(`${process.env.FRONTEND_URL}/login?error=No user found`)
	}

	try {
		const accessToken = jwt.sign(
			{ id: req.user.id, email: req.user.email, name: req.user.name },
			process.env.JWT_SECRET,
			{ expiresIn: '1h' }
		)

		const refreshToken = crypto.randomBytes(32).toString('hex')
		const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

		await prisma.refreshToken.create({
			data: {
				token: refreshToken,
				userId: req.user.id,
				expiresAt: refreshTokenExpires,
			},
		})

		const user = {
			id: req.user.id,
			email: req.user.email,
			name: req.user.name || '',
			provider: req.user.provider,
		}

		// Устанавливаем HTTP-only cookie
		res.cookie('accessToken', accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 60 * 60 * 1000, // 1 час
		})

		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
		})

		res.cookie('user', JSON.stringify(user), {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
		})

		// Перенаправляем на фронтенд
		return res.redirect(`${process.env.FRONTEND_URL}/`)
	} catch (error) {
		console.error('Error in authSuccess:', error)
		return res.redirect(`${process.env.FRONTEND_URL}/login?error=Server error`)
	}
}

exports.authFailure = (req, res) => {
	console.error('Authentication failed')
	return res.redirect(
		`${process.env.FRONTEND_URL}/login?error=Authentication failed`
	)
}

exports.getData = (req, res, next) => {
	try {
		const accessToken = req.cookies.accessToken
		const refreshToken = req.cookies.refreshToken
		const userRaw = req.cookies.user

		if (!accessToken || !refreshToken || !userRaw) {
			return res.status(401).json({ error: 'No authentication data found' })
		}

		let user
		try {
			user = JSON.parse(userRaw)
		} catch (error) {
			console.error('Failed to parse user cookie:', error)
			return res.status(400).json({ error: 'Invalid user data' })
		}

		if (!user.id || !user.email || !user.provider) {
			return res.status(400).json({ error: 'Incomplete user data' })
		}

		res.json({ user, accessToken, refreshToken })
		next()
	} catch (error) {
		console.error('Error in auth data route:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

const passport = require('../../services/authService')
const jwt = require('jsonwebtoken')
const prisma = require('../../lib/prisma')
const crypto = require('crypto')

const DEFAULT_AVATAR_URL =
	process.env.NODE_ENV === 'development'
		? 'http://localhost:3000/public/avatar-lg.png'
		: `${process.env.FRONTEND_URL}public/avatar-lg.png`

exports.googleAuth = (req, res, next) => {
	// Получаем локаль и сохраняем его в сессии
	const locale =
		req.query.locale ||
		req.headers['accept-language']?.split(',')[0]?.split('-')[0] ||
		'en'
	req.session.locale = locale

	const prompt = req.query.prompt || 'select_account'

	const state = JSON.stringify({ locale })

	console.log('Google auth request', {
		prompt,
		state,
		locale,
	})

	passport.authenticate('google', {
		scope: ['profile', 'email'],
		prompt,
		state,
	})(req, res, next)
}

exports.googleCallback = passport.authenticate('google', {
	failureRedirect: `${process.env.FRONTEND_URL}/login?error=Authentication failed`,
	successRedirect: '/api/auth/success',
})

exports.facebookAuth = (req, res, next) => {
	const locale =
		req.query.locale ||
		req.headers['accept-language']?.split(',')[0]?.split('-')[0] ||
		'en'
	req.session.locale = locale
	const state = JSON.stringify({ locale })
	passport.authenticate('facebook', { scope: ['email'], state })(req, res, next)
}

exports.facebookCallback = passport.authenticate('facebook', {
	failureRedirect: `${process.env.FRONTEND_URL}/login?error=Authentication failed`,
	successRedirect: '/api/auth/success',
})

exports.appleAuth = (req, res, next) => {
	const locale =
		req.query.locale ||
		req.headers['accept-language']?.split(',')[0]?.split('-')[0] ||
		'en'
	req.session.locale = locale
	const state = JSON.stringify({ locale })
	passport.authenticate('apple', { scope: ['name', 'email'], state })(
		req,
		res,
		next
	)
}

exports.appleCallback = passport.authenticate('apple', {
	failureRedirect: `${process.env.FRONTEND_URL}/login?error=Authentication failed`,
	successRedirect: '/api/auth/success',
})

exports.authSuccess = async (req, res) => {
	if (!req.user) {
		console.error('No user found in authSuccess')
		return res.status(401).json({ error: 'No user found' })
	}

	try {
		// Очищаем старые refresh-токены для пользователя
		await prisma.refreshToken.deleteMany({
			where: { userId: req.user.id },
		})

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
			avatarUrl: req.user.avatarUrl || DEFAULT_AVATAR_URL,
		}

		await prisma.authState.deleteMany({
			where: { user: JSON.stringify(user) },
		})

		const state = crypto.randomBytes(16).toString('hex')
		const stateExpires = new Date(Date.now() + 5 * 60 * 1000) // 5 мин

		await prisma.authState.create({
			data: {
				state,
				user: JSON.stringify(user),
				accessToken,
				refreshToken,
				expiresAt: stateExpires,
			},
		})

		let locale = 'en'
		try {
			const oauthState = req.query.state ? JSON.parse(req.query.state) : {}
			locale = oauthState.locale || req.session.locale || 'en'
		} catch (error) {
			console.error('Error parsing OAuth state:', error)
		}

		console.log('Redirecting with locale:', locale)
		return res.redirect(
			`${process.env.FRONTEND_URL}/${locale}/selling-classifieds?state=${state}`
		)
	} catch (error) {
		console.error('Error in authSuccess:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

exports.authFailure = (req, res) => {
	console.error('Authentication failed')
	const locale = req.session.locale || 'en'
	return res.redirect(
		`${process.env.FRONTEND_URL}/${locale}/login?error=Authentication failed`
	)
}

exports.exchangeState = async (req, res) => {
	const { state } = req.query

	if (!state) {
		return res.status(400).json({ error: 'State parameter is required' })
	}

	try {
		const authState = await prisma.authState.findUnique({
			where: { state },
		})

		if (!authState || authState.expiresAt < new Date()) {
			return res.status(401).json({ error: 'Invalid or expired state' })
		}

		const { user, accessToken, refreshToken } = authState
		const userData = JSON.parse(user)

		await prisma.authState.delete({
			where: { state },
		})

		return res.json({ user: userData, accessToken, refreshToken })
	} catch (error) {
		console.error('Error in exchangeState:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

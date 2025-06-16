const prisma = require('../../lib/prisma')
const jwt = require('jsonwebtoken')
const { getExchangeRate } = require('../../services/exchangeRateService')

const getClassifiedById = async (req, res) => {
	const { id } = req.params
	const { currency } = req.query

	let userId = null
	let userFavorites = []
	let userCurrency =
		currency && ['USD', 'UAH', 'EUR'].includes(currency) ? currency : 'USD'

	const authHeader = req.headers.authorization
	if (authHeader && authHeader.startsWith('Bearer ')) {
		const token = authHeader.split(' ')[1]
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET)
			const user = await prisma.user.findUnique({
				where: { id: decoded.id },
				select: { id: true, favorites: true, currency: true },
			})
			if (user) {
				userId = user.id
				userFavorites = user.favorites || []
				userCurrency = user.currency
			}
		} catch (error) {
			console.error(
				'Error verifying token in getAllClassifieds:',
				error.message
			)
		}
	}

	try {
		console.log(`Fetching classified with ID: ${id}, userId: ${userId}`)

		const classified = await prisma.classified.findUnique({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						nickname: true,
						trustRating: true,
						bonuses: true,
						avatarUrl: true,
						phoneNumber: true,
						successfulDeals: true,
						showPhone: true,
					},
				},
				tags: {
					include: {
						tag: { select: { name: true } },
					},
				},
			},
		})

		if (!classified || !classified.isActive) {
			return res.status(404).json({ error: 'Classified not found' })
		}

		await prisma.classified.update({
			where: { id },
			data: { views: { increment: 1 } },
		})

		const rates = await getExchangeRate('USD')

		let convertedPrice = classified.price
		if (classified.currency !== userCurrency) {
			convertedPrice =
				(classified.price * rates[userCurrency]) / rates[classified.currency]
			convertedPrice = Math.round(convertedPrice * 100) / 100 // Округление до 2 знаков
		}

		const favoritesBool = userId ? userFavorites.includes(id) : false
		console.log(
			'favoritesBool:',
			favoritesBool,
			'userFavorites:',
			userFavorites
		)

		return res.json({
			id: classified.id,
			title: classified.title,
			description: classified.description,
			price: classified.price,
			currency: classified.currency, // Оригинальная валюта
			convertedPrice, // Конвертированная цена
			convertedCurrency: userCurrency, // Валюта юзера
			images: classified.images,
			isActive: classified.isActive,
			createdAt: classified.createdAt,
			views: classified.views,
			messages: classified.messages,
			favorites: classified.favorites,
			favoritesBool,
			user: {
				id: classified.user.id,
				name: classified.user.name || 'Аноним',
				nickname: classified.user.nickname,
				trustRating: classified.user.trustRating,
				bonuses: classified.user.bonuses,
				avatarUrl:
					classified.user.avatarUrl ||
					`${process.env.CALLBACK_URL}/public/avatar.png`,
				phoneNumber: classified.user.phoneNumber,
				successfulDeals: classified.user.successfulDeals,
				showPhone: classified.user.showPhone,
			},
			tags: classified.tags.map(t => t.tag.name),
		})
	} catch (error) {
		console.error('Error fetching classified:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getClassifiedById }

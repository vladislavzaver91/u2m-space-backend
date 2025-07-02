const prisma = require('../../lib/prisma')
const { getExchangeRate } = require('../../services/exchangeRateService')
const jwt = require('jsonwebtoken')

const searchClassifieds = async (req, res) => {
	try {
		const { query, category, limit = 10 } = req.body

		if (!query || query.trim().length < 2) {
			return res
				.status(400)
				.json({ error: 'Query must be at least 2 characters long' })
		}

		let userId = null
		let userFavorites = []
		let userCurrency = ['USD', 'UAH', 'EUR'].includes(req.body.currency)
			? req.body.currency
			: 'USD'

		// Проверка авторизации
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
					'Error verifying token in searchClassifieds:',
					error.message
				)
			}
		}

		// Валидация параметров
		const parsedLimit = parseInt(limit, 10)
		if (isNaN(parsedLimit) || parsedLimit < 1) {
			return res.status(400).json({ error: 'Invalid limit' })
		}

		// Формирование условий поиска
		const where = { isActive: true }
		if (query) {
			where.OR = [
				{ title: { contains: query, mode: 'insensitive' } },
				{ description: { contains: query, mode: 'insensitive' } },
				{
					tags: {
						some: { tag: { name: { contains: query, mode: 'insensitive' } } },
					},
				},
			]
			// Добавляем поиск по цене, только если запрос является числом
			if (!isNaN(parsedPrice)) {
				where.OR.push({
					price: { gte: parsedPrice * 0.9, lte: parsedPrice * 1.1 },
				})
			}
		}
		if (category) {
			where.category = { equals: category, mode: 'insensitive' }
		}

		// Получение объявлений
		const classifieds = await prisma.classified.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			include: {
				user: {
					select: {
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
			take: parsedLimit,
		})

		const rates = await getExchangeRate('USD')

		// Конвертация цен
		const convertedClassifieds = classifieds.map(classified => {
			let convertedPrice = classified.price
			if (classified.currency !== userCurrency) {
				convertedPrice =
					(classified.price * rates[userCurrency]) / rates[classified.currency]
				convertedPrice = Math.round(convertedPrice * 100) / 100
			}

			return {
				id: classified.id,
				title: classified.title,
				description: classified.description,
				price: classified.price,
				currency: classified.currency,
				convertedPrice,
				convertedCurrency: userCurrency,
				images: classified.images,
				isActive: classified.isActive,
				createdAt: classified.createdAt,
				views: classified.views,
				messages: classified.messages,
				favorites: classified.favorites,
				favoritesBool: userId ? userFavorites.includes(classified.id) : false,
				user: {
					name: classified.user.name || 'Аноним',
					nickname: classified.user.nickname,
					trustRating: classified.user.trustRating,
					bonuses: classified.user.bonuses,
					avatarUrl:
						classified.user.avatarUrl ||
						`${process.env.CALLBACK_URL}/public/avatar.png`,
					phoneNumber: classified.user.phoneNumber,
					showPhone: classified.user.showPhone,
					successfulDeals: classified.user.successfulDeals,
				},
				tags:
					classified.tags && Array.isArray(classified.tags)
						? classified.tags.map(t => t.tag?.name || '')
						: [],
				category: classified.category,
			}
		})

		const total = await prisma.classified.count({ where })
		const hasMore = classifieds.length < total

		return res.json({
			classifieds: convertedClassifieds,
			total,
			hasMore,
		})
	} catch (error) {
		console.error('Error searching classifieds:', {
			message: error.message,
			stack: error.stack,
			body: req.body,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { searchClassifieds }

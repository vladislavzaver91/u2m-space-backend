const prisma = require('../../lib/prisma')
const { getExchangeRate } = require('../../services/exchangeRateService')

const getUserFavorites = async (req, res) => {
	try {
		const userId = req.user.id
		const { limit = 20, offset = 0, tags } = req.query
		const parsedLimit = parseInt(limit, 10)
		const parsedOffset = parseInt(offset, 10)

		if (
			isNaN(parsedLimit) ||
			isNaN(parsedOffset) ||
			parsedLimit < 1 ||
			parsedOffset < 0
		) {
			return res
				.status(400)
				.json({ error: 'Invalid limit or offset parameters' })
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { currency: true, favorites: true },
		})
		const userCurrency = user.currency || 'USD'
		const favoriteIds = user.favorites || []

		// Если нет избранных объявлений, возвращаем пустой результат
		if (favoriteIds.length === 0) {
			return res.json({
				classifieds: [],
				total: 0,
				hasMore: false,
			})
		}

		//  Запрашиваем избранные объявления
		const classifieds = await prisma.classified.findMany({
			where: {
				id: { in: favoriteIds },
				isActive: true,
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						avatarUrl: true,
						phoneNumber: true,
						successfulDeals: true,
					},
				},
				tags: {
					include: {
						tag: { select: { name: true } },
					},
				},
			},
			orderBy: { createdAt: 'desc' },
			take: parsedLimit,
			skip: parsedOffset,
		})

		// Конвертация цен
		const rates = await getExchangeRate('USD')
		const convertedClassifieds = classifieds.map(classified => {
			let convertedPrice = classified.price
			if (classified.currency !== userCurrency) {
				convertedPrice =
					(classified.price * rates[userCurrency]) / rates[classified.currency]
				convertedPrice = Math.round(convertedPrice * 100) / 100 // Округление до 2 знаков
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
				favoritesBool: true, // Все объявления в избранном
				user: {
					id: classified.user.id,
					name: classified.user.name || 'Аноним',
					avatarUrl:
						classified.user.avatarUrl ||
						`${process.env.CALLBACK_URL}/public/avatar.png`,
					phoneNumber: classified.user.phoneNumber,
					successfulDeals: classified.user.successfulDeals,
				},
				tags:
					classified.tags && Array.isArray(classified.tags)
						? classified.tags.map(t => t.tag?.name || '')
						: [],
			}
		})

		// Подсчет общего количества избранных объявлений
		const total = await prisma.classified.count({
			where: {
				id: { in: favoriteIds },
				isActive: true,
			},
		})
		const hasMore = parsedOffset + classifieds.length < total

		return res.json({
			classifieds: convertedClassifieds,
			total,
			hasMore,
		})
	} catch (error) {
		console.error('Error retrieving user favorites:', {
			message: error.message,
			stack: error.stack,
			queryParams: req.query,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getUserFavorites }

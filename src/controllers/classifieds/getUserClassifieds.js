const prisma = require('../../lib/prisma')
const { getExchangeRate } = require('../../services/exchangeRateService')

const getUserClassifieds = async (req, res) => {
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
			select: { currency: true },
		})
		const userCurrency = user.currency || 'USD'

		const where = { userId }
		if (tags) {
			const tagArray = Array.isArray(tags) ? tags : [tags]
			where.tags = {
				some: {
					tag: {
						name: { in: tagArray },
					},
				},
			}
		}

		const classifieds = await prisma.classified.findMany({
			where,
			include: {
				user: {
					select: {
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
				currency: classified.currency, // Оригинальная валюта
				convertedPrice, // Конвертированная цена
				convertedCurrency: userCurrency, // Валюта юзера
				images: classified.images,
				isActive: classified.isActive,
				createdAt: classified.createdAt,
				views: classified.views,
				messages: classified.messages,
				favorites: classified.favorites,
				user: {
					name: classified.user.name || '',
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

		const total = await prisma.classified.count({ where })
		const hasMore = parsedOffset + classifieds.length < total

		return res.json({
			classifieds: convertedClassifieds,
			total,
			hasMore,
		})
	} catch (error) {
		console.error('Error retrieving user classifieds:', {
			message: error.message,
			stack: error.stack,
			queryParams: req.query,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getUserClassifieds }

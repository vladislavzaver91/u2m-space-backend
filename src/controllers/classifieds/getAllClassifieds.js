const prisma = require('../../lib/prisma')
const { getExchangeRate } = require('../../services/exchangeRateService')
const jwt = require('jsonwebtoken')

const getAllClassifieds = async (req, res) => {
	try {
		const { limit = 20, offset = 0, tags, currency, city } = req.query

		let userId = null
		let userFavorites = []
		let userCurrency =
			currency && ['USD', 'UAH', 'EUR'].includes(currency) ? currency : 'USD'
		let userCity = city || null

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
					userCity = user.city
				}
			} catch (error) {
				console.error(
					'Error verifying token in getAllClassifieds:',
					error.message
				)
			}
		}

		const parsedLimit = parseInt(limit, 10)
		const parsedOffset = parseInt(offset, 10)

		if (
			isNaN(parsedLimit) ||
			isNaN(parsedOffset) ||
			parsedLimit < 1 ||
			parsedOffset < 0
		) {
			return res.status(400).json({ error: 'Invalid limit or offset' })
		}

		if (parsedOffset > 100000) {
			return res.status(400).json({ error: 'Offset too large' })
		}

		const where = { isActive: true }
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

		if (userCity) {
			where.user = { city: userCity }
		}

		console.log('Executing Prisma query with params:', {
			where,
			parsedLimit,
			parsedOffset,
			tags,
			userId,
			userCurrency,
		})

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
				promotionQueues: true,
			},
			take: parsedLimit,
			skip: parsedOffset,
		})

		const rates = await getExchangeRate('USD')

		// Конвертируем цены
		const convertedClassifieds = classifieds
			.map(classified => {
				let convertedPrice = classified.price
				if (classified.currency !== userCurrency) {
					convertedPrice =
						(classified.price * rates[userCurrency]) /
						rates[classified.currency]
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
					favoritesBool: userId ? userFavorites.includes(classified.id) : false,
					plan: classified.plan,
					lastPromoted:
						classified.promotionQueues[0]?.lastPromoted || classified.createdAt,
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
				}
			})
			.sort((a, b) => {
				if (
					a.plan === 'light' &&
					a.lastPromoted > new Date(Date.now() - 5 * 60 * 1000)
				) {
					return -1
				}
				if (
					b.plan === 'light' &&
					b.lastPromoted > new Date(Date.now() - 5 * 60 * 1000)
				) {
					return 1
				}
				if (a.plan === 'extremum' && b.plan !== 'extremum') return -1
				if (b.plan === 'extremum' && a.plan !== 'extremum') return 1
				if (a.plan === 'smart' && b.plan === 'light') return -1
				if (b.plan === 'smart' && a.plan === 'light') return 1
				return b.lastPromoted - a.lastPromoted
			})

		// Ротация для Smart и Extremum
		const now = new Date()
		for (const classified of convertedClassifieds) {
			if (
				classified.plan === 'smart' &&
				now - classified.lastPromoted >= 3 * 24 * 60 * 60 * 1000
			) {
				await prisma.promotionQueue.updateMany({
					where: { classifiedId: classified.id },
					data: { lastPromoted: now },
				})
			} else if (
				classified.plan === 'extremum' &&
				now - classified.lastPromoted >= 8 * 60 * 60 * 1000
			) {
				await prisma.promotionQueue.updateMany({
					where: { classifiedId: classified.id },
					data: { lastPromoted: now },
				})
			}
		}

		const total = await prisma.classified.count({ where })
		const hasMore = parsedOffset + classifieds.length < total

		const largeFirstAds = convertedClassifieds.slice(0, 4)
		const largeSecondAds = convertedClassifieds.slice(4, 8)
		const smallAds = convertedClassifieds.slice(8)

		return res.json({
			classifieds: {
				largeFirst: largeFirstAds,
				largeSecond: largeSecondAds,
				small: smallAds,
			},
			total,
			hasMore,
		})
	} catch (error) {
		console.error('Error fetching classifieds:', {
			message: error.message,
			stack: error.stack,
			queryParams: req.query,
			userId: req.user?.id,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getAllClassifieds }

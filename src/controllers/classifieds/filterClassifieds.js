const prisma = require('../../lib/prisma')
const { getExchangeRate } = require('../../services/exchangeRateService')
const jwt = require('jsonwebtoken')

const filterClassifieds = async (req, res) => {
	try {
		const {
			limit = 20,
			offset = 0,
			search,
			tags,
			minPrice,
			maxPrice,
			currency,
			sortBy = 'createdAt',
			sortOrder = 'desc',
		} = req.query

		let userId = null
		let userFavorites = []
		let userCurrency =
			currency && ['USD', 'UAH', 'EUR'].includes(currency) ? currency : 'USD'

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
					'Error verifying token in filterClassifieds:',
					error.message
				)
			}
		}

		// Валидация параметров
		const parsedLimit = parseInt(limit, 10)
		const parsedOffset = parseInt(offset, 10)
		const parsedMinPrice = minPrice ? parseFloat(minPrice) : null
		const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : null

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

		if (
			(parsedMinPrice !== null && isNaN(parsedMinPrice)) ||
			(parsedMaxPrice !== null && isNaN(parsedMaxPrice))
		) {
			return res.status(400).json({ error: 'Invalid price range' })
		}

		// Формирование условий поиска
		const where = { isActive: true }

		// Поиск по ключевому слову
		if (search) {
			where.OR = [
				{ title: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
			]
		}

		// Фильтрация по тегам
		if (tags) {
			const tagArray = Array.isArray(tags) ? tags : [tags]
			where.tags = {
				some: {
					tag: {
						name: { in: tagArray, mode: 'insensitive' },
					},
				},
			}
		}

		// Получение минимальной и максимальной цены для слайдера
		const priceRange = await prisma.classified.aggregate({
			_min: { price: true },
			_max: { price: true },
			where: { isActive: true },
		})

		// Фильтрация по цене (в валюте USD, конвертация будет позже)
		if (parsedMinPrice !== null || parsedMaxPrice !== null) {
			const rates = await getExchangeRate('USD')
			const usdMinPrice =
				parsedMinPrice !== null && userCurrency !== 'USD'
					? parsedMinPrice * (rates['USD'] / rates[userCurrency])
					: parsedMinPrice
			const usdMaxPrice =
				parsedMaxPrice !== null && userCurrency !== 'USD'
					? parsedMaxPrice * (rates['USD'] / rates[userCurrency])
					: parsedMaxPrice

			where.price = {}
			if (usdMinPrice !== null) where.price.gte = usdMinPrice
			if (usdMaxPrice !== null) where.price.lte = usdMaxPrice
		}

		// Определение сортировки
		const orderBy = []
		if (sortBy === 'price') {
			orderBy.push({ price: sortOrder })
		} else if (sortBy === 'createdAt') {
			orderBy.push({ createdAt: sortOrder })
		} else {
			return res.status(400).json({ error: 'Invalid sortBy parameter' })
		}

		// Получение объявлений
		const classifieds = await prisma.classified.findMany({
			where,
			orderBy,
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
			skip: parsedOffset,
		})

		// Получение всех тегов для найденных объявлений
		const relatedTags = await prisma.tag.findMany({
			where: {
				classifieds: {
					some: {
						classified: where,
					},
				},
			},
			select: { name: true },
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
			}
		})

		const total = await prisma.classified.count({ where })
		const hasMore = parsedOffset + classifieds.length < total

		return res.json({
			classifieds: convertedClassifieds,
			total,
			hasMore,
			priceRange: {
				min: priceRange._min.price,
				max: priceRange._max.price,
				currency: 'USD',
				convertedMin:
					userCurrency !== 'USD'
						? Math.round(
								((priceRange._min.price * rates[userCurrency]) / rates['USD']) *
									100
						  ) / 100
						: priceRange._min.price,
				convertedMax:
					userCurrency !== 'USD'
						? Math.round(
								((priceRange._max.price * rates[userCurrency]) / rates['USD']) *
									100
						  ) / 100
						: priceRange._max.price,
				convertedCurrency: userCurrency,
			},
			availableTags: relatedTags.map(t => t.name),
		})
	} catch (error) {
		console.error('Error filtering classifieds:', {
			message: error.message,
			stack: error.stack,
			queryParams: req.query,
			userId: req.user?.id,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { filterClassifieds }

const prisma = require('../../lib/prisma')
const jwt = require('jsonwebtoken')

const getAllClassifieds = async (req, res) => {
	try {
		const { limit = 20, offset = 0, tags } = req.query

		let userId = null
		const authHeader = req.headers.authorization
		if (authHeader && authHeader.startsWith('Bearer ')) {
			const token = authHeader.split(' ')[1]
			try {
				const decoded = jwt.verify(token, process.env.JWT_SECRET)
				const user = await prisma.user.findUnique({
					where: { id: decoded.id },
				})
				if (user) {
					userId = user.id
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

		console.log('Executing Prisma query with params:', {
			where,
			parsedLimit,
			parsedOffset,
			tags,
			userId: userId || 'No user',
		})

		const classifieds = await prisma.classified.findMany({
			where,
			orderBy: { createdAt: 'desc' },
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
				favoritesBy: userId
					? {
							where: { userId },
							select: { id: true },
					  }
					: false,
			},
			take: parsedLimit,
			skip: parsedOffset,
		})

		const total = await prisma.classified.count({ where })
		const hasMore = parsedOffset + classifieds.length < total

		classifieds.forEach(classified => {
			console.log(
				`Classified ${classified.id}: favoritesBy length = ${
					classified.favoritesBy?.length || 0
				}, isFavorite = ${userId ? classified.favoritesBy?.length > 0 : false}`
			)
		})

		return res.json({
			classifieds: classifieds.map(classified => ({
				id: classified.id,
				title: classified.title,
				description: classified.description,
				price: classified.price,
				images: classified.images,
				isActive: classified.isActive,
				createdAt: classified.createdAt,
				views: classified.views,
				messages: classified.messages,
				favorites: classified.favorites,
				isFavorite: userId ? classified.favoritesBy.length > 0 : false,
				user: {
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
			})),
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

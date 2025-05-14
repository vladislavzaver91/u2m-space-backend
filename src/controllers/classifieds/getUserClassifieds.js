const prisma = require('../../lib/prisma')

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

		const total = await prisma.classified.count({ where })
		const hasMore = parsedOffset + classifieds.length < total

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
			})),
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

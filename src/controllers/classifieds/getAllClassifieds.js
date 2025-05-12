const prisma = require('../../lib/prisma')

const getAllClassifieds = async (req, res) => {
	try {
		const { limit = 20, offset = 0 } = req.query

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

		const classifieds = await prisma.classified.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			include: {
				user: { select: { name: true } },
			},
			tags: {
				include: {
					tag: { select: { name: true } },
				},
			},
			take: parsedLimit,
			skip: parsedOffset,
		})

		const total = await prisma.classified.count({ where: { isActive: true } })

		return res.json({
			classifieds: classifieds.map(c => ({
				...c,
				tags: c.tags.map(t => t.tag.name),
			})),
			total,
			hasMore: parsedOffset + classifieds.length < total,
		})
	} catch (error) {
		console.error('Error fetching classifieds:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getAllClassifieds }

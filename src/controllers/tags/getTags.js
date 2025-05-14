const prisma = require('../../lib/prisma')

const getTags = async (req, res) => {
	try {
		const { name } = req.query

		if (name) {
			const tag = await prisma.tag.findUnique({
				where: { name },
			})

			if (!tag) {
				return res.status(404).json({ error: 'Tag not found' })
			}

			return res.json(tag)
		}

		const tags = await prisma.tag.findMany({
			select: {
				id: true,
				name: true,
				createdAt: true,
				updatedAt: true,
			},
		})
		return res.json(tags)
	} catch (error) {
		console.error('Error fetching tags:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getTags }

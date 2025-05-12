const prisma = require('../../lib/prisma')

const getClassifiedById = async (req, res) => {
	const { id } = req.params

	try {
		const classified = await prisma.classified.findUnique({
			where: { id },
			include: {
				user: { select: { name: true } },
			},
			tags: {
				include: {
					tag: { select: { name: true } },
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

		return res.json({
			...classified,
			tags: classified.tags.map(t => t.tag.name),
		})
	} catch (error) {
		console.error('Error fetching classified:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getClassifiedById }

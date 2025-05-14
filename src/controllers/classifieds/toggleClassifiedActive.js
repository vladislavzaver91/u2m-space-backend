const prisma = require('../../lib/prisma')

const toggleClassifiedActive = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { id } = req.params
	const { isActive } = req.body

	try {
		const classified = await prisma.classified.findUnique({
			where: { id },
		})

		if (!classified || classified.userId !== req.user.id) {
			return res.status(403).json({ error: 'Forbidden' })
		}

		if (typeof isActive !== 'boolean') {
			return res.status(400).json({ error: 'isActive must be a boolean' })
		}

		const updatedClassified = await prisma.classified.update({
			where: { id },
			data: { isActive },
			include: {
				tags: {
					include: {
						tag: { select: { name: true } },
					},
				},
			},
		})

		return res.json({
			...updatedClassified,
			tags: updatedClassified.tags.map(t => t.tag.name),
		})
	} catch (error) {
		console.error('Error toggling classified active:', {
			message: error.message,
			stack: error.stack,
			classifiedId: id,
			requestBody: req.body,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { toggleClassifiedActive }

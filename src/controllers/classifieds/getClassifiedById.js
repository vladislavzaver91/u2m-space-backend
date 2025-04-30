const prisma = require('../../lib/prisma')

const getClassifiedById = async (req, res) => {
	const { id } = req.params

	try {
		const classified = await prisma.classified.findUnique({
			where: { id },
			include: { user: { select: { name: true } } },
		})

		if (!classified || !classified.isActive) {
			return res.status(404).json({ error: 'Classified not found' })
		}

		return res.json(classified)
	} catch (error) {
		console.error('Error fetching classified:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getClassifiedById }

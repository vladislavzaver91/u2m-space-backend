const prisma = require('../../lib/prisma')

const getAllClassifieds = async (req, res) => {
	try {
		const classifieds = await prisma.classified.findMany({
			where: { isActive: true },
			orderBy: { createdAt: 'desc' },
			include: { user: { select: { name: true } } },
		})
		return res.json(classifieds)
	} catch (error) {
		console.error('Error fetching classifieds:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getAllClassifieds }

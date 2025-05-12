const prisma = require('../../lib/prisma')

const createTag = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { name } = req.body

	if (!name || typeof name !== 'string' || name.length > 50) {
		return res
			.status(400)
			.json({ error: 'Tag name is required and must be up to 50 characters' })
	}

	try {
		const tag = await prisma.tag.upsert({
			where: { name },
			update: {},
			create: { name },
		})

		return res.status(201).json(tag)
	} catch (error) {
		console.error('Error creating tag:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { createTag }

const prisma = require('../../lib/prisma')

const deleteTag = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { id } = req.params

	try {
		const tag = await prisma.tag.findUnique({
			where: { id },
		})

		if (!tag) {
			return res.status(404).json({ error: 'Tag not found' })
		}

		await prisma.tag.delete({
			where: { id },
		})

		return res.status(204).send()
	} catch (error) {
		console.error('Error deleting tag:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { deleteTag }

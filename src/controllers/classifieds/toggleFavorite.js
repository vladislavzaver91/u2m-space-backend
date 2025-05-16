const prisma = require('../../lib/prisma')

const toggleFavorite = async (req, res) => {
	const { id } = req.params
	const userId = req.user.id

	try {
		const classified = await prisma.classified.findUnique({
			where: { id },
		})

		if (!classified || !classified.isActive) {
			return res.status(404).json({ error: 'Classified not found' })
		}

		const existingFavorite = await prisma.favorite.findFirst({
			where: {
				userId,
				classifiedId: id,
			},
		})

		if (existingFavorite) {
			await prisma.favorite.delete({
				where: { id: existingFavorite.id },
			})
			await prisma.classified.update({
				where: { id },
				data: {
					favorites: { decrement: 1 },
				},
			})
			return res.json({
				isFavorite: false,
				favorites: classified.favorites - 1,
			})
		} else {
			await prisma.favorite.create({
				data: {
					userId,
					classifiedId: id,
				},
			})
			await prisma.classified.update({
				where: { id },
				data: {
					favorites: { increment: 1 },
				},
			})
			return res.json({ isFavorite: true, favorites: classified.favorites + 1 })
		}
	} catch (error) {
		console.error('Error toggling favorite:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { toggleFavorite }

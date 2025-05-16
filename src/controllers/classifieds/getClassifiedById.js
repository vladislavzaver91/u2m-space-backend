const prisma = require('../../lib/prisma')

const getClassifiedById = async (req, res) => {
	const { id } = req.params
	const userId = req.user?.id

	try {
		console.log(`Fetching classified with ID: ${id}`)

		const classified = await prisma.classified.findUnique({
			where: { id },
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
				favoritesBy: userId
					? {
							where: { userId },
							select: { id: true },
					  }
					: false,
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
			isFavorite: userId ? classified.favoritesBy.length > 0 : false,
			user: {
				name: classified.user.name || 'Аноним',
				avatarUrl:
					classified.user.avatarUrl ||
					`${process.env.CALLBACK_URL}/public/avatar.png`,
				phoneNumber: classified.user.phoneNumber,
				successfulDeals: classified.user.successfulDeals,
			},
			tags: classified.tags.map(t => t.tag.name),
		})
	} catch (error) {
		console.error('Error fetching classified:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getClassifiedById }

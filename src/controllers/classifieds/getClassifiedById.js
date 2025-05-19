const prisma = require('../../lib/prisma')
const jwt = require('jsonwebtoken')

const getClassifiedById = async (req, res) => {
	const { id } = req.params

	let userId = null
	let userFavorites = []
	const authHeader = req.headers.authorization
	if (authHeader && authHeader.startsWith('Bearer ')) {
		const token = authHeader.split(' ')[1]
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET)
			const user = await prisma.user.findUnique({
				where: { id: decoded.id },
				select: { id: true, favorites: true },
			})
			if (user) {
				userId = user.id
				userFavorites = user.favorites || []
			}
		} catch (error) {
			console.error(
				'Error verifying token in getAllClassifieds:',
				error.message
			)
		}
	}

	try {
		console.log(`Fetching classified with ID: ${id}, userId: ${userId}`)

		const classified = await prisma.classified.findUnique({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
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
			},
		})

		if (!classified || !classified.isActive) {
			return res.status(404).json({ error: 'Classified not found' })
		}

		await prisma.classified.update({
			where: { id },
			data: { views: { increment: 1 } },
		})

		const favoritesBool = userId ? userFavorites.includes(id) : false
		console.log(
			'favoritesBool:',
			favoritesBool,
			'userFavorites:',
			userFavorites
		)

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
			favoritesBool,
			user: {
				id: classified.user.id,
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

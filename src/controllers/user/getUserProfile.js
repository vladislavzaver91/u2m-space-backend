const prisma = require('../../lib/prisma')

const getUserProfile = async (req, res) => {
	try {
		const { id } = req.params
		if (req.user.id !== id) {
			return res.status(401).json({ error: 'Unauthorized: Access denied' })
		}

		const user = await prisma.user.findUnique({
			where: { id, deletedAt: null },
			select: {
				id: true,
				favorites: true,
				email: true,
				name: true,
				legalSurname: true,
				nickname: true,
				avatarUrl: true,
				phoneNumber: true,
				extraPhoneNumber: true,
				gender: true,
				birthday: true,
				trustRating: true,
				bonuses: true,
				language: true,
				currency: true,
				city: true,
				notifications: true,
				showPhone: true,
				advancedUser: true,
				deleteReason: true,
				createdAt: true,
				updatedAt: true,
			},
		})

		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		res.json({
			user: {
				...user,
				avatarUrl:
					user.avatarUrl || `${process.env.CALLBACK_URL}/public/avatar.png`,
			},
		})
	} catch (error) {
		console.error('Error retrieving user profile:', {
			message: error.message,
			stack: error.stack,
			params: req.params,
		})
		res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getUserProfile }

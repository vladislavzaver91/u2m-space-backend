const prisma = require('../../lib/prisma')

const getUserNotifications = async (req, res) => {
	try {
		const { id } = req.params
		if (req.user.id !== id) {
			return res.status(401).json({ error: 'Unauthorized: Access denied' })
		}

		const notifications = await prisma.notification.findMany({
			where: { userId: id },
			orderBy: { createdAt: 'desc' },
			take: 20,
			select: {
				id: true,
				type: true,
				message: true,
				isRead: true,
				createdAt: true,
			},
		})

		return res.json({ notifications })
	} catch (error) {
		console.error('Error retrieving notifications:', {
			message: error.message,
			stack: error.stack,
			params: req.params,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { getUserNotifications }

const prisma = require('../../lib/prisma')

const deleteUserNotification = async (req, res) => {
	try {
		const { id, notificationId } = req.params
		if (req.user.id !== id) {
			return res.status(401).json({ error: 'Unauthorized: Access denied' })
		}

		const notification = await prisma.notification.findUnique({
			where: { id: notificationId },
		})

		if (!notification || notification.userId !== id) {
			return res.status(404).json({ error: 'Notification not found' })
		}

		await prisma.notification.delete({
			where: { id: notificationId },
		})

		return res.status(204).json({})
	} catch (error) {
		console.error('Error deleting notification:', {
			message: error.message,
			stack: error.stack,
			params: req.params,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { deleteUserNotification }

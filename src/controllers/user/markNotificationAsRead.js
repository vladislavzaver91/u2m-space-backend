const prisma = require('../../lib/prisma')

const markNotificationAsRead = async (req, res) => {
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

		const updatedNotification = await prisma.notification.update({
			where: { id: notificationId },
			data: { isRead: true },
		})

		return res.status(200).json({
			...updatedNotification,
			messageData: JSON.parse(updatedNotification.messageData || '{}'),
		})
	} catch (error) {
		console.error('Error marking notification as read:', {
			message: error.message,
			stack: error.stack,
			params: req.params,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { markNotificationAsRead }

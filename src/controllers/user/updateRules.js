const prisma = require('../../lib/prisma')
const { createNotification } = require('../../services/notificationService')

const updateRules = async (req, res) => {
	try {
		// Уточнить у Дениса кто может обновлять правила. Админ?
		const userId = req.user.id
		const user = await prisma.user.findUnique({
			where: { id: userId, deletedAt: null },
			select: { advancedUser: true },
		})

		if (!user || !user.advancedUser) {
			return res.status(403).json({ error: 'Forbidden: Admin access required' })
		}

		// Уведомляем всех пользователей
		const users = await prisma.user.findMany({
			where: { deletedAt: null },
			select: { id: true },
		})

		for (const u of users) {
			await createNotification(u.id, 'RULES_CHANGED', {})
		}

		return res.status(200).json({ message: 'Rules updated and users notified' })
	} catch (error) {
		console.error('Error updating rules:', {
			message: error.message,
			stack: error.stack,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { updateRules }

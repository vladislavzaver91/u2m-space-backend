const prisma = require('../../lib/prisma')
const { createNotification } = require('../../services/notificationService')

const sendMessage = async (req, res) => {
	try {
		const { id } = req.params // classifiedId
		const { content } = req.body
		const senderId = req.user.id

		if (!content) {
			return res.status(400).json({ error: 'Message content is required' })
		}

		const classified = await prisma.classified.findUnique({
			where: { id, isActive: true },
			include: { user: { select: { id: true } } },
		})

		if (!classified) {
			return res.status(404).json({ error: 'Classified not found' })
		}

		if (classified.userId === senderId) {
			return res.status(400).json({ error: 'Cannot send message to yourself' })
		}

		const message = await prisma.message.create({
			data: {
				senderId,
				receiverId: classified.userId,
				classifiedId: id,
				content,
			},
		})

		// Увеличиваем счетчик сообщений в объявлении
		await prisma.classified.update({
			where: { id },
			data: { messages: { increment: 1 } },
		})

		// Создаем уведомление для получателя
		await createNotification(classified.userId, 'MESSAGE_RECEIVED', {
			title: classified.title,
		})

		return res.status(201).json({
			id: message.id,
			senderId: message.senderId,
			receiverId: message.receiverId,
			classifiedId: message.classifiedId,
			content: message.content,
			createdAt: message.createdAt,
		})
	} catch (error) {
		console.error('Error sending message:', {
			message: error.message,
			stack: error.stack,
			params: req.params,
			body: req.body,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { sendMessage }

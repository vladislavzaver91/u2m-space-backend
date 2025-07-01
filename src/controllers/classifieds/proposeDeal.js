const prisma = require('../../lib/prisma')
const { createNotification } = require('../../services/notificationService')

const proposeDeal = async (req, res) => {
	try {
		const { id } = req.params // classifiedId
		const { proposedPrice } = req.body
		const proposerId = req.user.id

		const classified = await prisma.classified.findUnique({
			where: { id, isActive: true },
			include: { user: { select: { id: true } } },
		})

		if (!classified) {
			return res.status(404).json({ error: 'Classified not found' })
		}

		if (classified.userId === proposerId) {
			return res.status(400).json({ error: 'Cannot propose deal to yourself' })
		}

		const deal = await prisma.deal.create({
			data: {
				classifiedId: id,
				proposerId,
				proposedPrice: proposedPrice ? parseFloat(proposedPrice) : null,
				status: 'PENDING',
			},
		})

		// Создаем уведомление для владельца объявления
		await createNotification(classified.userId, 'DEAL_PROPOSED', {
			title: classified.title,
		})

		return res.status(201).json({
			id: deal.id,
			classifiedId: deal.classifiedId,
			proposerId: deal.proposerId,
			proposedPrice: deal.proposedPrice,
			status: deal.status,
			createdAt: deal.createdAt,
		})
	} catch (error) {
		console.error('Error proposing deal:', {
			message: error.message,
			stack: error.stack,
			params: req.params,
			body: req.body,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { proposeDeal }

const prisma = require('../../lib/prisma')
// const Stripe = require('stripe')
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const promoteClassified = async (req, res) => {
	try {
		const { id } = req.params
		const userId = req.user.id

		const classified = await prisma.classified.findUnique({
			where: { id, userId },
			include: { user: { select: { currency: true, city: true } } },
		})

		if (!classified) {
			return res
				.status(404)
				.json({ error: 'Classified not found or not owned by user' })
		}

		if (classified.plan !== 'light') {
			return res.status(400).json({
				error: 'Only Light plan classifieds can be promoted individually',
			})
		}

		// Создаем платеж за поднятие
		// const paymentIntent = await stripe.paymentIntents.create({
		// 	amount: 1000, // 10 грн в копейках
		// 	currency: classified.user.currency.toLowerCase(),
		// 	description: `Promotion for classified ${classified.id}`,
		// 	metadata: { userId, classifiedId: id },
		// })

		// Фиктивный paymentIntent для разработки
		const paymentIntent = { id: `test_payment_${id}`, status: 'succeeded' }

		// Сохраняем платеж
		// await prisma.paymentHistory.create({
		// 	data: {
		// 		userId,
		// 		plan: 'light',
		// 		amount: 10,
		// 		currency: classified.user.currency,
		// 		stripePaymentId: paymentIntent.id,
		// 	},
		// })

		// Сохраняем платеж в истории (для теста без stripe)
		await prisma.paymentHistory.create({
			data: {
				userId,
				plan: 'light',
				amount: 10,
				currency: classified.user.currency,
				stripePaymentId: paymentIntent.id, // рандомный ID
			},
		})

		// Обновляем очередь поднятия
		await prisma.promotionQueue.upsert({
			where: { classifiedId: id },
			update: { lastPromoted: new Date() },
			create: {
				classifiedId: id,
				userId,
				plan: 'light',
				city: classified.user.city,
				lastPromoted: new Date(),
			},
		})

		return res.json({ paymentIntent })
	} catch (error) {
		console.error('Error promoting classified:', {
			message: error.message,
			stack: error.stack,
			userId: req.user?.id,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { promoteClassified }

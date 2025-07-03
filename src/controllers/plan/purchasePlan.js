const prisma = require('../../lib/prisma')
const { getExchangeRate } = require('../../services/exchangeRateService')
// const Stripe = require('stripe')
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const purchasePlan = async (req, res) => {
	try {
		const { plan } = req.body
		const userId = req.user.id

		if (!['light', 'smart', 'extremum'].includes(plan)) {
			return res.status(400).json({ error: 'Invalid plan selected' })
		}

		// Получаем пользователя
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { currency: true, city: true },
		})

		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		const userCurrency = user.currency || 'USD'
		const userCity = user.city

		// Определяем стоимость плана (примерные значения, так как реальные цены не указаны)
		const planPrices = {
			light: { amount: 10, description: 'Light plan - per ad promotion' },
			smart: {
				amount: 100,
				description: 'Smart plan - 16 ads, auto-promotion every 3 days',
			},
			extremum: {
				amount: 300,
				description:
					'Extremum plan - unlimited ads, auto-promotion every 8 hours',
			},
		}

		// Создаем платеж в Stripe
		// const paymentIntent = await stripe.paymentIntents.create({
		// 	amount: planPrices[plan].amount * 100, // Stripe принимает сумму в копейках/центах
		// 	currency: userCurrency.toLowerCase(),
		// 	description: planPrices[plan].description,
		// 	metadata: { userId, plan },
		// })

		// Фиктивный paymentIntent для разработки
		const paymentIntent = {
			id: `test_payment_plan_${plan}_${userId}`,
			status: 'succeeded',
		}

		// Сохраняем платеж в истории
		// await prisma.paymentHistory.create({
		// 	data: {
		// 		userId,
		// 		plan,
		// 		amount: planPrices[plan].amount,
		// 		currency: userCurrency,
		// 		stripePaymentId: paymentIntent.id,
		// 	},
		// })

		// Сохраняем платеж в истории (для теста без stripe)
		await prisma.paymentHistory.create({
			data: {
				userId,
				plan,
				amount: planPrices[plan].amount,
				currency: userCurrency,
				stripePaymentId: paymentIntent.id, // рандомный ID
			},
		})

		// Обновляем план пользователя
		await prisma.user.update({
			where: { id: userId },
			data: { plan },
		})

		// Обновляем план для всех активных объявлений пользователя
		const userClassifieds = await prisma.classified.findMany({
			where: { userId, isActive: true },
			select: { id: true },
		})

		await prisma.classified.updateMany({
			where: { userId, isActive: true },
			data: { plan },
		})

		// Создаем или обновляем очередь поднятия для каждого объявления
		const promotionData = userClassifieds.map(classified => ({
			classifiedId: classified.id,
			userId,
			plan,
			city: userCity,
			lastPromoted: new Date(),
		}))

		await prisma.promotionQueue.deleteMany({
			where: { userId, classifiedId: { in: userClassifieds.map(c => c.id) } },
		})

		await prisma.promotionQueue.createMany({
			data: promotionData,
		})

		// Получаем все активные объявления с учетом города и плана
		const classifieds = await prisma.classified.findMany({
			where: { isActive: true, user: { city: userCity } },
			include: {
				user: {
					select: {
						name: true,
						nickname: true,
						trustRating: true,
						bonuses: true,
						avatarUrl: true,
						phoneNumber: true,
						successfulDeals: true,
						showPhone: true,
					},
				},
				tags: {
					include: {
						tag: { select: { name: true } },
					},
				},
				promotionQueues: true,
			},
		})

		// Получаем курс валют
		const rates = await getExchangeRate('USD')

		// Конвертируем цены и добавляем флаг избранного
		const userFavorites =
			(
				await prisma.user.findUnique({
					where: { id: userId },
					select: { favorites: true },
				})
			).favorites || []

		// Реализуем иерархию и ротацию
		const sortedClassifieds = classifieds
			.map(classified => {
				let convertedPrice = classified.price
				if (classified.currency !== userCurrency) {
					convertedPrice =
						(classified.price * rates[userCurrency]) /
						rates[classified.currency]
					convertedPrice = Math.round(convertedPrice * 100) / 100
				}

				return {
					id: classified.id,
					title: classified.title,
					description: classified.description,
					price: classified.price,
					currency: classified.currency,
					convertedPrice,
					convertedCurrency: userCurrency,
					images: classified.images,
					isActive: classified.isActive,
					createdAt: classified.createdAt,
					views: classified.views,
					messages: classified.messages,
					favorites: classified.favorites,
					favoritesBool: userFavorites.includes(classified.id),
					plan: classified.plan,
					lastPromoted:
						classified.promotionQueues[0]?.lastPromoted || classified.createdAt,
					user: {
						name: classified.user.name || 'Аноним',
						nickname: classified.user.nickname,
						trustRating: classified.user.trustRating,
						bonuses: classified.user.bonuses,
						avatarUrl:
							classified.user.avatarUrl ||
							`${process.env.CALLBACK_URL}/public/avatar.png`,
						phoneNumber: classified.user.phoneNumber,
						showPhone: classified.user.showPhone,
						successfulDeals: classified.user.successfulDeals,
					},
					tags: classified.tags.map(t => t.tag?.name || ''),
				}
			})
			.sort((a, b) => {
				// Иерархия: Light (поднятое) > Extremum > Smart > Light (неподнятое)
				if (
					a.plan === 'light' &&
					a.lastPromoted > new Date(Date.now() - 5 * 60 * 1000)
				) {
					return -1 // Недавно поднятое Light имеет высший приоритет
				}
				if (
					b.plan === 'light' &&
					b.lastPromoted > new Date(Date.now() - 5 * 60 * 1000)
				) {
					return 1
				}
				if (a.plan === 'extremum' && b.plan !== 'extremum') return -1
				if (b.plan === 'extremum' && a.plan !== 'extremum') return 1
				if (a.plan === 'smart' && b.plan === 'light') return -1
				if (b.plan === 'smart' && a.plan === 'light') return 1
				return b.lastPromoted - a.lastPromoted // Сортировка по времени последнего поднятия
			})

		// Ротация для Smart и Extremum
		const now = new Date()
		for (const classified of sortedClassifieds) {
			if (
				classified.plan === 'smart' &&
				now - classified.lastPromoted >= 3 * 24 * 60 * 60 * 1000
			) {
				await prisma.promotionQueue.updateMany({
					where: { classifiedId: classified.id },
					data: { lastPromoted: now },
				})
			} else if (
				classified.plan === 'extremum' &&
				now - classified.lastPromoted >= 8 * 60 * 60 * 1000
			) {
				await prisma.promotionQueue.updateMany({
					where: { classifiedId: classified.id },
					data: { lastPromoted: now },
				})
			}
		}

		// Разделяем на большие и малые объявления
		const largeAds = sortedClassifieds.slice(0, 4) // Первые 4 для 1-й и 2-й строки
		const smallAds = sortedClassifieds.slice(4) // Остальные для 3-й строки и ниже

		return res.json({
			classifieds: { large: largeAds, small: smallAds },
			paymentIntent,
		})
	} catch (error) {
		console.error('Error processing plan purchase:', {
			message: error.message,
			stack: error.stack,
			userId: req.user?.id,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { purchasePlan }

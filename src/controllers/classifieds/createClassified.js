const prisma = require('../../lib/prisma')
const supabase = require('../../lib/supabase')
const sharp = require('sharp')
const { v4: uuidv4 } = require('uuid')
const { createNotification } = require('../../services/notificationService')

const createClassified = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { title, description, price, currency, tags, category, city } = req.body
	const files = req.files || []

	console.log('Request body:', req.body)
	console.log('Request files:', files)
	console.log('Tags type:', Array.isArray(tags) ? 'Array' : typeof tags)
	console.log('Tags content:', tags)

	// Валидация полей
	if (!title || typeof title !== 'string' || title.length > 60) {
		return res
			.status(400)
			.json({ error: 'Title is required and must be up to 60 characters' })
	}
	if (
		!description ||
		typeof description !== 'string' ||
		description.length > 300
	) {
		return res.status(400).json({
			error: 'Description is required and must be up to 300 characters',
		})
	}
	if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
		return res
			.status(400)
			.json({ error: 'Price is required and must be a positive number' })
	}
	if (!files || files.length < 1 || files.length > 8) {
		return res
			.status(400)
			.json({ error: 'At least 1 and up to 8 images are required' })
	}
	if (tags && !Array.isArray(tags)) {
		return res.status(400).json({ error: 'Tags must be an array' })
	}
	if (currency && !['USD', 'UAH', 'EUR'].includes(currency)) {
		return res
			.status(400)
			.json({ error: 'Invalid currency. Must be USD, UAH, or EUR' })
	}

	try {
		// Получаем валюту пользователя, если не указана в запросе
		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
			select: {
				currency: true,
				city: true,
				plan: true,
				name: true,
				nickname: true,
				trustRating: true,
				bonuses: true,
				avatarUrl: true,
				phoneNumber: true,
				successfulDeals: true,
				showPhone: true,
			},
		})

		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		const finalCurrency = currency || user.currency || 'USD'
		const finalCity = city || user.city || null
		const userPlan = user.plan || 'light'

		// Обработка и загрузка изображений
		const imageUrls = []
		for (const file of files) {
			let buffer = file.buffer

			// Дополнительное сжатие, если размер > 5 МБ
			if (buffer.length > 5 * 1024 * 1024) {
				buffer = await sharp(buffer)
					.resize({ width: 1024, withoutEnlargement: true })
					.jpeg({ quality: 80 })
					.toBuffer()
			}

			// Проверка размера после сжатия
			if (buffer.length > 5 * 1024 * 1024) {
				return res.status(400).json({
					error: `Image ${file.originalname} exceeds 5MB after compression`,
				})
			}

			const fileName = `${uuidv4()}-${Date.now()}.jpg`
			const { error } = await supabase.storage
				.from('classified-images')
				.upload(fileName, buffer, {
					contentType: 'image/jpeg',
					upsert: true,
				})

			if (error) {
				console.error('Error uploading image:', error)
				return res.status(500).json({ error: 'Failed to upload image' })
			}

			const { data: publicUrlData } = supabase.storage
				.from('classified-images')
				.getPublicUrl(fileName)

			imageUrls.push(publicUrlData.publicUrl)
		}

		// Создание или привязка тегов
		const tagConnections = []
		if (tags && tags.length > 0) {
			for (const tagName of tags) {
				const tag = await prisma.tag.upsert({
					where: { name: tagName },
					update: {},
					create: { name: tagName },
				})
				tagConnections.push({ tagId: tag.id })
			}
		}

		// Создание объявления
		const classified = await prisma.classified.create({
			data: {
				title,
				description,
				price: parseFloat(price),
				currency: finalCurrency,
				images: imageUrls,
				userId: req.user.id,
				isActive: true,
				plan: userPlan,
				category: category || null,
				city: finalCity,
				tags: {
					create: tagConnections,
				},
			},
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

		// Создание записи в promotionQueue
		await prisma.promotionQueue.create({
			data: {
				classifiedId: classified.id,
				userId: req.user.id,
				plan: userPlan,
				city: finalCity,
				lastPromoted: new Date(),
			},
		})

		// Создание уведомления
		await createNotification(req.user.id, 'CLASSIFIED_ADDED', {
			title: classified.title,
		})

		const response = {
			id: classified.id,
			title: classified.title,
			description: classified.description,
			price: classified.price,
			currency: classified.currency,
			convertedPrice: classified.price,
			convertedCurrency: finalCurrency,
			images: classified.images,
			isActive: classified.isActive,
			createdAt: classified.createdAt,
			views: classified.views || 0,
			messages: classified.messages || 0,
			favorites: classified.favorites || 0,
			favoritesBool: false,
			plan: classified.plan,
			lastPromoted:
				classified.promotionQueues?.[0]?.lastPromoted || classified.createdAt,
			user: {
				id: req.user.id,
				name: classified.user?.name || 'Аноним',
				nickname: classified.user?.nickname || '',
				trustRating: classified.user?.trustRating || 0,
				bonuses: classified.user?.bonuses || 0,
				avatarUrl:
					classified.user?.avatarUrl ||
					`${process.env.CALLBACK_URL}/public/avatar.png`,
				phoneNumber: classified.user?.phoneNumber || '',
				showPhone: classified.user?.showPhone || false,
				successfulDeals: classified.user?.successfulDeals || 0,
			},
			tags: classified.tags.map(t => t.tag.name),
			category: classified.category,
			city: classified.city,
		}

		return res.status(201).json({
			classified: response,
		})
	} catch (error) {
		console.error('Error creating classified:', {
			message: error.message,
			stack: error.stack,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { createClassified }

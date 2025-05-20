const prisma = require('../../lib/prisma')
const supabase = require('../../lib/supabase')
const sharp = require('sharp')
const { v4: uuidv4 } = require('uuid')

const createClassified = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { title, description, price, tags } = req.body
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

	try {
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
				images: imageUrls,
				userId: req.user.id,
				isActive: true,
				tags: {
					create: tagConnections,
				},
			},
			include: {
				tags: {
					include: {
						tag: { select: { name: true } },
					},
				},
			},
		})

		return res.status(201).json({
			...classified,
			tags: classified.tags.map(t => t.tag.name),
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

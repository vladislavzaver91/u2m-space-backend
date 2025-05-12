const prisma = require('../../lib/prisma')
const supabase = require('../../lib/supabase')
const sharp = require('sharp')
const { v4: uuidv4 } = require('uuid')

const createClassified = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { title, description, price, images, tags } = req.body

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
	if (
		!images ||
		!Array.isArray(images) ||
		images.length < 1 ||
		images.length > 8
	) {
		return res
			.status(400)
			.json({ error: 'At least 1 and up to 8 images are required' })
	}
	if (!tags || !Array.isArray(tags)) {
		return res.status(400).json({ error: 'Tags must be an array' })
	}

	try {
		// Валидация и сжатие изображений
		const imageUrls = []
		for (const image of images) {
			if (!image.startsWith('data:image/')) {
				return res.status(400).json({ error: 'Invalid image format' })
			}

			const base64Data = image.split(',')[1]
			const buffer = Buffer.from(base64Data, 'base64')

			// Проверка размера файла (макс. 5 МБ)
			if (buffer.length > 5 * 1024 * 1024) {
				return res.status(400).json({ error: 'Image size exceeds 5MB' })
			}

			// Сжатие изображения
			const compressedImage = await sharp(buffer)
				.resize({ width: 1024, withoutEnlargement: true })
				.jpeg({ quality: 80 })
				.toBuffer()

			const fileName = `${uuidv4()}-${Date.now()}.jpg`
			const { error } = await supabase.storage
				.from('classified-images')
				.upload(fileName, compressedImage, {
					contentType: 'image/jpeg',
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
		for (const tagName of tags) {
			const tag = await prisma.tag.upsert({
				where: { name: tagName },
				update: {},
				create: { name: tagName },
			})
			tagConnections.push({ tagId: tag.id })
		}

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
		console.error('Error creating classified:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { createClassified }

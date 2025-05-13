const prisma = require('../../lib/prisma')
const supabase = require('../../lib/supabase')
const sharp = require('sharp')
const { v4: uuidv4 } = require('uuid')

const updateClassified = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { id } = req.params
	const { title, description, price, images, tags, isActive } = req.body

	try {
		const classified = await prisma.classified.findUnique({
			where: { id },
			include: { tags: true },
		})

		if (!classified || classified.userId !== req.user.id) {
			return res.status(403).json({ error: 'Forbidden' })
		}

		// Валидация полей
		if (title && (typeof title !== 'string' || title.length > 60)) {
			return res
				.status(400)
				.json({ error: 'Title must be up to 60 characters' })
		}
		if (
			description &&
			(typeof description !== 'string' || description.length > 300)
		) {
			return res
				.status(400)
				.json({ error: 'Description must be up to 300 characters' })
		}
		if (price && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
			return res.status(400).json({ error: 'Price must be a positive number' })
		}
		if (
			images &&
			(!Array.isArray(images) || images.length < 1 || images.length > 8)
		) {
			return res
				.status(400)
				.json({ error: 'At least 1 and up to 8 images are required' })
		}
		if (tags && !Array.isArray(tags)) {
			return res.status(400).json({ error: 'Tags must be an array' })
		}
		if (isActive !== undefined && typeof isActive !== 'boolean') {
			return res.status(400).json({ error: 'isActive must be a boolean' })
		}

		// Обработка изображений
		let imageUrls = classified.images
		if (images && Array.isArray(images)) {
			// Удаляем старые изображения из Supabase
			const oldImagePaths = classified.images.map(url => url.split('/').pop())
			await supabase.storage.from('classified-images').remove(oldImagePaths)

			imageUrls = []
			for (const image of images) {
				if (!image.startsWith('data:image/')) {
					return res.status(400).json({ error: 'Invalid image format' })
				}

				const base64Data = image.split(',')[1]
				const buffer = Buffer.from(base64Data, 'base64')

				if (buffer.length > 5 * 1024 * 1024) {
					return res.status(400).json({ error: 'Image size exceeds 5MB' })
				}

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
		}

		// Обработка тегов
		let = tagConnections = []
		if (tags && Array.isArray(tags)) {
			// Удаляем старые связи
			await prisma.classifiedTag.deleteMany({
				where: { classifiedId: id },
			})

			// Создаём новые связи
			for (const tagName of tags) {
				const tag = await prisma.tag.upsert({
					where: { name: tagName },
					update: {},
					create: { name: tagName },
				})
				tagConnections.push({ tagId: tag.id })
			}
		}

		// Обновление объявления
		const updateData = {
			title: title || classified.title,
			description: description || classified.description,
			price: price ? parseFloat(price) : classified.price,
			images: imageUrls,
			isActive: isActive !== undefined ? isActive : classified.isActive,
		}

		if (tagConnections.length > 0) {
			updateData.tags = {
				create: tagConnections,
			}
		}

		const updatedClassified = await prisma.classified.update({
			where: { id },
			data: updateData,
			include: {
				tags: {
					include: {
						tag: { select: { name: true } },
					},
				},
			},
		})

		return res.json({
			...updatedClassified,
			tags: updatedClassified.tags.map(t => t.tag.name),
		})
	} catch (error) {
		console.error('Error updating classified:', {
			message: error.message,
			stack: error.stack,
			classifiedId: id,
			requestBody: req.body,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { updateClassified }

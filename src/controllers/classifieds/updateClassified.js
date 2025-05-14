const prisma = require('../../lib/prisma')
const supabase = require('../../lib/supabase')
const sharp = require('sharp')
const { v4: uuidv4 } = require('uuid')

const updateClassified = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { id } = req.params
	const title = req.body.title || undefined
	const description = req.body.description || undefined
	const price = req.body.price || undefined
	const tags = req.body['tags[]']
		? Array.isArray(req.body['tags[]'])
			? req.body['tags[]']
			: [req.body['tags[]']]
		: undefined
	const isActive =
		req.body.isActive !== undefined ? req.body.isActive : undefined
	const existingImages = req.body['existingImages[]']
		? Array.isArray(req.body['existingImages[]'])
			? req.body['existingImages[]']
			: [req.body['existingImages[]']]
		: undefined // Изменено с [] на undefined
	const newImages = req.files || []

	console.log('Request Body:', req.body)
	console.log('Request Files:', req.files)

	try {
		const classified = await prisma.classified.findUnique({
			where: { id },
			include: { tags: true },
		})

		if (!classified || classified.userId !== req.user.id) {
			return res.status(403).json({ error: 'Forbidden' })
		}

		// Валидация текстовых полей
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
		if (isActive !== undefined && typeof isActive !== 'string') {
			return res
				.status(400)
				.json({ error: 'isActive must be a string ("true" or "false")' })
		}

		// Обработка тегов
		if (tags !== undefined) {
			await prisma.classifiedTag.deleteMany({
				where: { classifiedId: id },
			})
			let tagConnections = []
			if (tags && tags.length > 0) {
				console.log('Processing tags:', tags)
				const uniqueTags = [
					...new Set(
						tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0)
					),
				]
				for (const tagName of uniqueTags) {
					const tag = await prisma.tag.upsert({
						where: { name: tagName.trim() },
						update: {},
						create: { name: tagName.trim() },
					})
					tagConnections.push({ tagId: tag.id })
					console.log('Created/Updated tag:', tagName)
				}
			}
		}

		// Обработка изображений
		let imageUrls = classified.images // Используем существующие изображения из базы
		if (existingImages !== undefined) {
			// Если переданы existingImages, используем их порядок
			imageUrls = existingImages.filter(url => url.startsWith('https://'))
		}
		if (newImages.length > 0) {
			const totalImages = imageUrls.length + newImages.length
			if (totalImages > 8) {
				return res.status(400).json({ error: 'Maximum 8 images allowed' })
			}

			for (const image of newImages) {
				const buffer = image.buffer
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

		// Валидация общего количества изображений
		if (imageUrls.length < 1 || imageUrls.length > 8) {
			return res
				.status(400)
				.json({ error: 'At least 1 and up to 8 images are required' })
		}

		// Обновление объявления
		const updateData = {
			title: title || classified.title,
			description: description || classified.description,
			price: price ? parseFloat(price) : classified.price,
			images: imageUrls,
			isActive:
				isActive !== undefined ? isActive === 'true' : classified.isActive,
		}

		if (tags !== undefined) {
			updateData.tags = {
				create: tagConnections || [],
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
			requestFiles: req.files,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { updateClassified }

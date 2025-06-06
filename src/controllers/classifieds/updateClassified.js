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
	const currency = req.body.currency || undefined

	const tags = req.body.tags || []
	const isActive = req.body.isActive
	const existingImages = req.body.existingImages || []
	const newImages = req.files || []

	console.log('Request Body:', req.body)
	console.log('Request Files:', req.files)
	console.log('All keys in req.body:', Object.keys(req.body))
	console.log('Parsed tags:', tags)
	console.log('Parsed existingImages:', existingImages)

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
		if (currency && !['USD', 'UAH', 'EUR'].includes(currency)) {
			return res
				.status(400)
				.json({ error: 'Invalid currency. Must be USD, UAH, or EUR' })
		}
		if (isActive !== undefined && !['true', 'false'].includes(isActive)) {
			return res
				.status(400)
				.json({ error: 'isActive must be "true" or "false"' })
		}

		// Обработка тегов
		if (tags.length > 0) {
			await prisma.classifiedTag.deleteMany({
				where: { classifiedId: id },
			})
			let tagConnections = []
			const uniqueTags = [...new Set(tags.map(tag => tag.trim()))]
			for (const tagName of uniqueTags) {
				const tag = await prisma.tag.upsert({
					where: { name: tagName },
					update: {},
					create: { name: tagName },
				})
				tagConnections.push({ tagId: tag.id })
				console.log('Created/Updated tag:', tagName)
			}
			if (tagConnections.length > 0) {
				await prisma.classified.update({
					where: { id },
					data: {
						tags: {
							create: tagConnections,
						},
					},
				})
			}
		}

		// Обработка изображений
		let imageUrls = existingImages.length > 0 ? [...existingImages] : []
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
			currency: currency || classified.currency,
			images: imageUrls,
			isActive:
				isActive !== undefined ? isActive === 'true' : classified.isActive,
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

const multerErrorHandler = handler => async (req, res, next) => {
	try {
		await handler(req, res, next)
	} catch (error) {
		if (error instanceof multer.MulterError) {
			console.error('Multer error:', error)
			return res
				.status(400)
				.json({ error: 'Invalid form data: ' + error.message })
		}
		next(error)
	}
}

module.exports = {
	updateClassified: multerErrorHandler(updateClassified),
}

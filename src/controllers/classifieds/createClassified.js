const prisma = require('../../lib/prisma')
const supabase = require('../../lib/supabase')
const { v4: uuidv4 } = require('uuid')

const createClassified = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { title, description, price, images } = req.body

	if (!title || !description || !price || !images || !Array.isArray(images)) {
		return res.status(400).json({ error: 'Missing required fields' })
	}

	try {
		// Загружаем изображения в Supabase Storage
		const imageUrls = []
		for (const image of images) {
			const fileName = `${uuidv4()}-${Date.now()}.jpg`
			const { data, error } = await supabase.storage
				.from('classified-images')
				.upload(fileName, Buffer.from(image, 'base64'), {
					contentType: 'image/jpeg',
				})

			if (error) {
				console.error('Error uploading image:', error)
				return res.status(500).json({ error: 'Failed to upload image' })
			}

			// Получаем публичный URL изображения
			const { data: publicUrlData } = supabase.storage
				.from('classified-images')
				.getPublicUrl(fileName)

			imageUrls.push(publicUrlData.publicUrl)
		}

		const classified = await prisma.classified.create({
			data: {
				title,
				description,
				price: parseFloat(price),
				images: imageUrls,
				userId: req.user.id,
				isActive: true,
			},
		})

		return res.status(201).json(classified)
	} catch (error) {
		console.error('Error creating classified:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { createClassified }

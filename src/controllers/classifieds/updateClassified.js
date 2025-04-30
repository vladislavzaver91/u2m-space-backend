const prisma = require('../../lib/prisma')
const supabase = require('../../lib/supabase')
const { v4: uuidv4 } = require('uuid')

const updateClassified = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { id } = req.params
	const { title, description, price, images, isActive } = req.body

	try {
		const classified = await prisma.classified.findUnique({
			where: { id },
		})

		if (!classified || classified.userId !== req.user.id) {
			return res.status(403).json({ error: 'Forbidden' })
		}

		// Загружаем новые изображения, если они есть
		let imageUrls = classified.images
		if (images && Array.isArray(images)) {
			imageUrls = []
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

				const { data: publicUrlData } = supabase.storage
					.from('classified-images')
					.getPublicUrl(fileName)

				imageUrls.push(publicUrlData.publicUrl)
			}
		}

		const updatedClassified = await prisma.classified.update({
			where: { id },
			data: {
				title: title || classified.title,
				description: description || classified.description,
				price: price ? parseFloat(price) : classified.price,
				images: imageUrls,
				isActive: isActive !== undefined ? isActive : classified.isActive,
			},
		})

		return res.json(updatedClassified)
	} catch (error) {
		console.error('Error updating classified:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { updateClassified }

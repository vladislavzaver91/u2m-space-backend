const prisma = require('../../lib/prisma')
const supabase = require('../../lib/supabase')
const { createNotification } = require('../../services/notificationService')

const deleteClassified = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const { id } = req.params

	try {
		const classified = await prisma.classified.findUnique({
			where: { id },
		})

		if (!classified || classified.userId !== req.user.id) {
			return res.status(403).json({ error: 'Forbidden' })
		}

		// Удаляем изображения из Supabase
		const imagePaths = classified.images.map(url => url.split('/').pop())
		await supabase.storage.from('classified-images').remove(imagePaths)

		// Создание уведомления
		await createNotification(req.user.id, 'CLASSIFIED_DELETED', {
			title: classified.title,
		})

		// Удаляем объявление
		await prisma.classified.delete({
			where: { id },
		})

		return res.status(204).send()
	} catch (error) {
		console.error(
			'Error deleting classified:',
			console.error('Error deleting classified:', {
				message: error.message,
				stack: error.stack,
			})
		)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { deleteClassified }

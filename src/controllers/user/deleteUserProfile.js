const prisma = require('../../lib/prisma')
const Joi = require('joi')

// Схема валидации
const deleteSchema = Joi.object({
	deleteReason: Joi.string().max(500).optional().allow(null, ''),
}).strict()

const deleteUserProfile = async (req, res) => {
	try {
		const { id } = req.params
		if (req.user.id !== id) {
			return res.status(401).json({ error: 'Unauthorized: Access denied' })
		}

		// Валидация
		const { error } = deleteSchema.validate(req.body, { abortEarly: false })
		if (error) {
			return res.status(400).json({ error: error.details.map(d => d.message) })
		}

		const user = await prisma.user.findUnique({
			where: { id, deletedAt: null },
		})
		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		await prisma.$transaction([
			prisma.user.update({
				where: { id },
				data: {
					deletedAt: new Date(),
					deleteReason: req.body.deleteReason || null,
				},
			}),
			prisma.classified.updateMany({
				where: { userId: id },
				data: { isActive: false },
			}),
		])
		return res.json({ message: 'Account deleted successfully' })
	} catch (error) {
		console.error('Error deleting user account:', {
			message: error.message,
			stack: error.stack,
			body: req.body,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { deleteUserProfile }

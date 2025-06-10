const prisma = require('../../lib/prisma')
const Joi = require('joi')
const supabase = require('../../lib/supabase')

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
		if (user.avatarUrl) {
			const filePath = user.avatarUrl.split('/').slice(-2).join('/')
			await supabase.storage.from('user-avatars').remove([filePath])
		}

		await prisma.user.update({
			where: { id },
			data: { deletedAt: new Date() },
		})
		res.status(204).send()
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

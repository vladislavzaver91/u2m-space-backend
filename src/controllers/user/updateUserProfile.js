const prisma = require('../../lib/prisma')
const Joi = require('joi')
const supabase = require('../../lib/supabase')

// Схема валидации
const updateSchema = Joi.object({
	email: Joi.string().email().optional(),
	name: Joi.string().max(50).optional().allow(null, ''),
	legalSurname: Joi.string().max(50).optional().allow(null, ''),
	nickname: Joi.string()
		.min(4)
		.max(16)
		.pattern(/^[a-zA-Z0-9_]+$/)
		.optional(),
	phoneNumber: Joi.string().min(10).optional(),
	extraPhoneNumber: Joi.string().min(10).optional().allow(null, ''),
	gender: Joi.string()
		.valid('Male', 'Female', 'Other')
		.optional()
		.allow(null, ''),
	birthday: Joi.string().min(8).optional().allow(null, ''),
	language: Joi.string().valid('en', 'uk', 'pl').optional(),
	currency: Joi.string().valid('USD', 'UAH', 'EUR').optional(),
	city: Joi.string().max(100).optional().allow(null, ''),
	notifications: Joi.boolean().optional(),
	showPhone: Joi.boolean().optional(),
	advancedUser: Joi.boolean().optional(),
	deleteReason: Joi.string().max(500).optional().allow(null, ''),
	removeAvatar: Joi.boolean().optional(),
}).strict()

const updateUserProfile = async (req, res) => {
	try {
		const { id } = req.params
		if (req.user.id !== id) {
			return res.status(401).json({ error: 'Unauthorized: Access denied' })
		}

		const data = req.body
		const avatarFile = req.file

		// Валидация
		const { error } = updateSchema.validate(data, { abortEarly: false })
		if (error) {
			return res.status(400).json({ error: error.details.map(d => d.message) })
		}

		// Проверка уникальности nickname
		if (data.nickname) {
			const existingNickname = await prisma.user.findFirst({
				where: {
					nickname: data.nickname,
					id: { not: id },
					deletedAt: null,
				},
			})
			if (existingNickname) {
				return res.status(400).json({ error: 'Nickname already taken' })
			}
		}

		// Проверка обязательных полей
		const user = await prisma.user.findUnique({
			where: { id, deletedAt: null },
		})
		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		if (!user.nickname && !data.nickname) {
			return res.status(400).json({ error: 'Nickname is required' })
		}
		if (!user.email && !data.email) {
			return res.status(400).json({ error: 'Email is required' })
		}
		if (!user.phoneNumber && !data.phoneNumber) {
			return res.status(400).json({ error: 'Phone number is required' })
		}

		// Обработка аватара
		let avatarUrl = user.avatarUrl
		if (avatarFile) {
			// Удаляем старый аватар
			if (avatarUrl) {
				const oldPath = avatarUrl.split('/').slice(-2).join('/')
				await supabase.storage.from('user-avatars').remove([oldPath])
			}

			// Загружаем новый
			const fileExt = avatarFile.originalname.split('.').pop()
			const filePath = `${id}/avatar.${fileExt}`
			const { error: uploadError } = await supabase.storage
				.from('user-avatars')
				.upload(filePath, avatarFile.buffer, { upsert: true })

			if (uploadError) {
				console.error('Avatar upload error:', uploadError)
				return res.status(500).json({ error: 'Failed to upload avatar' })
			}

			const { data: publicData } = supabase.storage
				.from('user-avatars')
				.getPublicUrl(filePath)
			avatarUrl = publicData.publicUrl
		} else if (data.removeAvatar === 'true') {
			// Удаляем аватар
			if (avatarUrl) {
				const oldPath = avatarUrl.split('/').slice(-2).join('/')
				await supabase.storage.from('user-avatars').remove([oldPath])
				avatarUrl = null
			}
		}

		const updatedUser = await prisma.user.update({
			where: { id, deletedAt: null },
			data: {
				email: data.email || undefined,
				name: data.name === '' ? null : data.name,
				legalSurname: data.legalSurname === '' ? null : data.legalSurname,
				nickname: data.nickname || undefined,
				phoneNumber: data.phoneNumber || undefined,
				extraPhoneNumber:
					data.extraPhoneNumber === '' ? null : data.extraPhoneNumber,
				gender: data.gender || undefined,
				birthday: data.birthday || undefined,
				language: data.language || undefined,
				currency: data.currency || undefined,
				city: data.city === '' ? null : data.city,
				notifications:
					data.notifications !== undefined ? data.notifications : undefined,
				showPhone: data.showPhone !== undefined ? data.showPhone : undefined,
				advancedUser:
					data.advancedUser !== undefined ? data.advancedUser : undefined,
				deleteReason: data.deleteReason === '' ? null : data.deleteReason,
				avatarUrl,
			},
			select: {
				id: true,
				email: true,
				name: true,
				legalSurname: true,
				nickname: true,
				avatarUrl: true,
				phoneNumber: true,
				extraPhoneNumber: true,
				gender: true,
				birthday: true,
				trustRating: true,
				bonuses: true,
				language: true,
				currency: true,
				city: true,
				notifications: true,
				showPhone: true,
				advancedUser: true,
				deleteReason: true,
				createdAt: true,
				updatedAt: true,
			},
		})

		return res.json({
			user: {
				...updatedUser,
				avatarUrl:
					updatedUser.avatarUrl ||
					`${process.env.CALLBACK_URL}/public/avatar.png`,
			},
		})
	} catch (error) {
		console.error('Error updating user profile:', {
			message: error.message,
			stack: error.stack,
			body: req.body,
			file: req.file ? req.file.originalname : null,
		})
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { updateUserProfile }

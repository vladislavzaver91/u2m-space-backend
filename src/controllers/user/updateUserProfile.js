const prisma = require('../../lib/prisma')
const Joi = require('joi')
const supabase = require('../../lib/supabase')
const jwt = require('jsonwebtoken')
const { createNotification } = require('../../services/notificationService')

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
	gender: Joi.string().valid('Male', 'Female').optional().allow(null, ''),
	birthday: Joi.string().min(8).optional().allow(null, ''),
	language: Joi.string().valid('en', 'uk', 'pl').optional(),
	currency: Joi.string().valid('USD', 'UAH', 'EUR').optional(),
	city: Joi.string().max(100).optional().allow(null, ''),
	notifications: Joi.alternatives()
		.try(Joi.boolean(), Joi.string().valid('true', 'false'))
		.optional(),
	showPhone: Joi.alternatives()
		.try(Joi.boolean(), Joi.string().valid('true', 'false'))
		.optional(),
	advancedUser: Joi.alternatives()
		.try(Joi.boolean(), Joi.string().valid('true', 'false'))
		.optional(),
	deleteReason: Joi.string().max(500).optional().allow(null, ''),
	removeAvatar: Joi.alternatives()
		.try(Joi.boolean(), Joi.string().valid('true', 'false'))
		.optional(),
}).strict()

const updateUserProfile = async (req, res) => {
	try {
		const { id } = req.params
		if (req.user.id !== id) {
			return res.status(401).json({ error: 'Unauthorized: Access denied' })
		}

		const data = req.body
		const avatarFile = req.file

		// const processedData = {
		// 	...data,
		// 	notifications:
		// 		data.notifications === 'true'
		// 			? true
		// 			: data.notifications === 'false'
		// 			? false
		// 			: data.notifications,
		// 	showPhone:
		// 		data.showPhone === 'true'
		// 			? true
		// 			: data.showPhone === 'false'
		// 			? false
		// 			: data.showPhone,
		// 	advancedUser:
		// 		data.advancedUser === 'true'
		// 			? true
		// 			: data.advancedUser === 'false'
		// 			? false
		// 			: data.advancedUser,
		// 	removeAvatar:
		// 		data.removeAvatar === 'true'
		// 			? true
		// 			: data.removeAvatar === 'false'
		// 			? false
		// 			: data.removeAvatar,
		// }

		const authHeader = req.headers.authorization
		let isAuthenticated = false
		if (authHeader && authHeader.startsWith('Bearer ')) {
			const token = authHeader.split(' ')[1]
			const decoded = jwt.verify(token, process.env.JWT_SECRET)
			if (decoded.id === id) {
				isAuthenticated = true
			} else {
				return res.status(403).json({ error: 'Forbidden' })
			}
		}

		// Для неавторизованных пользователей разрешаем только language, currency, city
		const allowedFields = isAuthenticated
			? Object.keys(data)
			: ['language', 'currency', 'city']
		const processedData = Object.fromEntries(
			Object.entries(data).filter(([key]) => allowedFields.includes(key))
		)

		// Валидация
		const { error } = updateSchema.validate(processedData, {
			abortEarly: false,
		})
		if (error) {
			return res.status(400).json({ error: error.details.map(d => d.message) })
		}
		if (!isAuthenticated) {
			// Для неавторизованных пользователей возвращаем успех
			return res.status(200).json({ message: 'Settings updated (client-side)' })
		}

		const user = await prisma.user.findUnique({
			where: { id, deletedAt: null },
		})
		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		// Проверка уникальности nickname
		if (processedData.nickname) {
			const existingNickname = await prisma.user.findFirst({
				where: {
					nickname: processedData.nickname,
					id: { not: id },
					deletedAt: null,
				},
			})
			if (existingNickname) {
				return res.status(400).json({ error: 'Nickname already taken' })
			}
		}

		// Проверка обязательных полей
		if (!user.nickname && !processedData.nickname) {
			return res.status(400).json({ error: 'Nickname is required' })
		}
		if (!user.email && !processedData.email) {
			return res.status(400).json({ error: 'Email is required' })
		}
		if (!user.phoneNumber && !processedData.phoneNumber) {
			return res.status(400).json({ error: 'Phone number is required' })
		}

		// Обработка аватара
		let avatarUrl = user.avatarUrl
		if (avatarFile) {
			const fileExt = avatarFile.originalname.split('.').pop()
			// Генерируем уникальное имя файла с timestamp
			const timestamp = Date.now()
			const filePath = `${id}/avatar_${timestamp}.${fileExt}`

			// Удаляем старую аватарку, если она существует
			if (avatarUrl) {
				const oldPath = avatarUrl.split('/').slice(-2).join('/')
				const { error: removeError } = await supabase.storage
					.from('user-avatars')
					.remove([oldPath])
				if (removeError) {
					console.error('Failed to remove old avatar:', removeError)
					// Не прерываем выполнение, так как старая аватарка может быть уже удалена
				}
			}

			// Загружаем новый аватар
			const { error: uploadError } = await supabase.storage
				.from('user-avatars')
				.upload(filePath, avatarFile.buffer, {
					contentType: avatarFile.mimetype,
					metadata: { id },
				})

			if (uploadError) {
				console.error('Avatar upload error:', uploadError)
				return res.status(500).json({
					error: 'Failed to upload avatar',
					details: uploadError.message,
				})
			}

			const { data: publicData } = supabase.storage
				.from('user-avatars')
				.getPublicUrl(filePath)
			avatarUrl = publicData.publicUrl
		} else if (processedData.removeAvatar === true) {
			if (avatarUrl) {
				const oldPath = avatarUrl.split('/').slice(-2).join('/')
				const { error: removeError } = await supabase.storage
					.from('user-avatars')
					.remove([oldPath])
				if (removeError) {
					console.error('Failed to remove avatar:', removeError)
					return res.status(500).json({
						error: 'Failed to remove avatar',
						details: removeError.message,
					})
				}
				avatarUrl = null
			}
		}

		// Создание уведомлений для изменений
		if (
			processedData.trustRating &&
			processedData.trustRating !== user.trustRating
		) {
			await createNotification(id, 'TRUST_RATING_CHANGED', {
				value: processedData.trustRating,
			})
		}
		if (processedData.bonuses && processedData.bonuses !== user.bonuses) {
			await createNotification(id, 'BONUSES_CHANGED', {
				value: processedData.bonuses,
			})
		}
		if (processedData.plan && processedData.plan !== user.plan) {
			await createNotification(id, 'PLAN_CHANGED', {
				value: processedData.plan,
			})
		}
		if (
			processedData.legalSurname &&
			processedData.legalSurname !== user.advancedUser.legalSurname
		) {
			await createNotification(id, 'OFFICIAL_NAME_CONFIRMED', {
				value: processedData.legalSurname,
			})
		}

		// Обновление профиля
		const updatedUser = await prisma.user.update({
			where: { id, deletedAt: null },
			data: {
				email: processedData.email || undefined,
				name: processedData.name === '' ? null : processedData.name,
				legalSurname:
					processedData.legalSurname === '' ? null : processedData.legalSurname,
				nickname: processedData.nickname || undefined,
				phoneNumber: processedData.phoneNumber || undefined,
				extraPhoneNumber:
					processedData.extraPhoneNumber === ''
						? null
						: processedData.extraPhoneNumber,
				gender: processedData.gender || undefined,
				birthday: processedData.birthday || undefined,
				language: processedData.language || undefined,
				currency: processedData.currency || undefined,
				city: processedData.city === '' ? null : processedData.city,
				notifications:
					processedData.notifications === 'true'
						? true
						: processedData.notifications === 'false'
						? false
						: undefined,
				showPhone:
					processedData.showPhone === 'true'
						? true
						: processedData.showPhone === 'false'
						? false
						: undefined,
				advancedUser:
					processedData.advancedUser === 'true'
						? true
						: processedData.advancedUser === 'false'
						? false
						: undefined,
				deleteReason:
					processedData.deleteReason === '' ? null : processedData.deleteReason,
				avatarUrl,
				trustRating: processedData.trustRating || undefined,
				bonuses: processedData.bonuses || undefined,
				plan: processedData.plan || undefined,
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

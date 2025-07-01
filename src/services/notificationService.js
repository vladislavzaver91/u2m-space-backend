const prisma = require('../lib/prisma')
const { sendEmail } = require('../utils/sendEmail')

// Переводы сообщений уведомлений
const translations = {
	en: {
		TRUST_RATING_CHANGED: 'Your trust rating has changed: {value}',
		BONUSES_CHANGED: 'Your bonus balance has changed: {value}',
		PLAN_CHANGED: 'Your plan has been changed to: {value}',
		CLASSIFIED_ADDED: 'Your classified "{title}" has been successfully added',
		CLASSIFIED_UPDATED: 'Your classified "{title}" has been updated',
		CLASSIFIED_DELETED: 'Your classified "{title}" has been deleted',
		CLASSIFIED_FAVORITED: 'A user added your classified "{title}" to favorites',
		MESSAGE_RECEIVED: 'You received a new message for classified "{title}"',
		DEAL_PROPOSED: 'A deal has been proposed for your classified "{title}"',
		RULES_CHANGED: 'Marketplace rules have been updated',
		OFFICIAL_NAME_CONFIRMED: 'Your official name has been confirmed: {value}',
	},
	uk: {
		TRUST_RATING_CHANGED: 'Ваш рейтинг довіри змінився: {value}',
		BONUSES_CHANGED: 'Ваш баланс бонусів змінився: {value}',
		PLAN_CHANGED: 'Ваш тарифний план змінено на: {value}',
		CLASSIFIED_ADDED: 'Ваше оголошення "{title}" успішно додано',
		CLASSIFIED_UPDATED: 'Ваше оголошення "{title}" оновлено',
		CLASSIFIED_DELETED: 'Ваше оголошення "{title}" видалено',
		CLASSIFIED_FAVORITED:
			'Користувач додав ваше оголошення "{title}" до обраного',
		MESSAGE_RECEIVED: 'Ви отримали нове повідомлення для оголошення "{title}"',
		DEAL_PROPOSED: 'Запропоновано угоду для вашого оголошення "{title}"',
		RULES_CHANGED: 'Правила маркетплейсу оновлено',
		OFFICIAL_NAME_CONFIRMED: 'Ваше офіційне ім’я підтверджено: {value}',
	},
	pl: {
		TRUST_RATING_CHANGED: 'Twój poziom zaufania uległ zmianie: {value}',
		BONUSES_CHANGED: 'Twój bilans bonusów uległ zmianie: {value}',
		PLAN_CHANGED: 'Twój plan został zmieniony na: {value}',
		CLASSIFIED_ADDED: 'Twoje ogłoszenie "{title}" zostało pomyślnie dodane',
		CLASSIFIED_UPDATED: 'Twoje ogłoszenie "{title}" zostało zaktualizowane',
		CLASSIFIED_DELETED: 'Twoje ogłoszenie "{title}" zostało usunięte',
		CLASSIFIED_FAVORITED:
			'Użytkownik dodał twoje ogłoszenie "{title}" do ulubionych',
		MESSAGE_RECEIVED: 'Otrzymałeś nową wiadomość dla ogłoszenia "{title}"',
		DEAL_PROPOSED: 'Zaproponowano transakcję dla twojego ogłoszenia "{title}"',
		RULES_CHANGED: 'Zasady marketplace’u zostały zaktualizowane',
		OFFICIAL_NAME_CONFIRMED:
			'Twoje oficjalne imię zostało potwierdzone: {value}',
	},
}

async function createNotification(userId, type, messageData) {
	try {
		// Проверяем, включены ли уведомления у пользователя
		const user = await prisma.user.findUnique({
			where: { id: userId, deletedAt: null },
			select: { notifications: true, email: true, language: true },
		})

		if (!user) {
			console.error(`User not found for notification: ${userId}`)
			return
		}

		// Формируем сообщение с учетом языка пользователя
		const userLanguage = user.language || 'en'
		let messageTemplate =
			translations[userLanguage][type] || translations.en[type]
		let message = messageTemplate

		// Заменяем плейсхолдеры в сообщении
		if (typeof messageData === 'object') {
			Object.keys(messageData).forEach(key => {
				message = message.replace(`{${key}}`, messageData[key])
			})
		} else if (typeof messageData === 'string') {
			message = message.replace('{value}', messageData)
		}

		// Создаем уведомление
		const notification = await prisma.notification.create({
			data: {
				userId,
				type,
				message,
				isRead: false,
			},
		})

		// Проверяем количество уведомлений
		const notificationCount = await prisma.notification.count({
			where: { userId },
		})

		if (notificationCount > 20) {
			// Находим и удаляем самые старые уведомления
			const notificationsToDelete = await prisma.notification.findMany({
				where: { userId },
				orderBy: { createdAt: 'asc' },
				take: notificationCount - 20,
			})

			await prisma.notification.deleteMany({
				where: {
					id: { in: notificationsToDelete.map(n => n.id) },
				},
			})
		}

		// Отправляем email, если уведомления включены
		if (user.notifications) {
			const subject = translations[userLanguage][type]
				? `New Notification: ${translations[userLanguage][type].split(':')[0]}`
				: `New Notification: ${type}`
			await sendEmail(user.email, subject, message)
		}

		return notification
	} catch (error) {
		console.error('Error creating notification:', {
			message: error.message,
			stack: error.stack,
			userId,
			type,
			messageData,
		})
	}
}

module.exports = { createNotification }

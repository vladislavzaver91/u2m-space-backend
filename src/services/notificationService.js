const prisma = require('../lib/prisma')
const { sendEmail } = require('../utils/sendEmail')

// Переводы для email-уведомлений
const translations = {
	en: {
		TRUST_RATING_CHANGED: {
			title: 'Trust rating',
			message: 'You received a raise of +{value}',
		},
		BONUSES_CHANGED: {
			title: 'Bonuses',
			message: 'You have been credited with {value} UNITS',
		},
		PLAN_CHANGED: {
			title: 'Plan',
			message: 'Your {value} plan expires in 1 day.',
		},
		CLASSIFIED_ADDED: {
			title: 'Classifieds',
			message: 'Successfully posted on the website',
		},
		CLASSIFIED_UPDATED: {
			title: 'Classifieds',
			message: 'Your classified "{title}" has been updated',
		},
		CLASSIFIED_DELETED: {
			title: 'Classifieds',
			message: 'Your classified "{title}" has been deleted',
		},
		CLASSIFIED_TO_FAVORITE: {
			title: 'Classifieds',
			message: 'A user added your classified "{title}" to favorites',
		},
		MESSAGE_RECEIVED: {
			title: 'Messages',
			message: 'You received a new message for classified "{title}"',
		},
		DEAL_PROPOSED: {
			title: 'Classifieds',
			message: 'A deal has been proposed for your classified "{title}"',
		},
		RULES_CHANGED: {
			title: 'Marketplace Rules',
			message: 'Marketplace rules have been updated',
		},
		OFFICIAL_NAME_CONFIRMED: {
			title: 'Profile',
			message: 'Your official name has been confirmed {value}',
		},
	},
	uk: {
		TRUST_RATING_CHANGED: {
			title: 'Рейтинг довіри',
			message: 'Ваш рейтинг довіри підвищено на +{value}',
		},
		BONUSES_CHANGED: {
			title: 'Бонуси',
			message: 'Вам нараховано {value} ОДИНИЦЬ',
		},
		PLAN_CHANGED: {
			title: 'План',
			message: 'Ваш тарифний план {value} закінчується через 1 день',
		},
		CLASSIFIED_ADDED: {
			title: 'Оголошення',
			message: 'Успішно додано на сайт',
		},
		CLASSIFIED_UPDATED: {
			title: 'Оголошення',
			message: 'Ваше оголошення "{title}" оновлено',
		},
		CLASSIFIED_DELETED: {
			title: 'Оголошення',
			message: 'Ваше оголошення "{title}" видалено',
		},
		CLASSIFIED_FAVORITED: {
			title: 'Оголошення',
			message: 'Користувач додав ваше оголошення "{title}" до обраного',
		},
		MESSAGE_RECEIVED: {
			title: 'Повідомлення',
			message: 'Ви отримали нове повідомлення для оголошення "{title}"',
		},
		DEAL_PROPOSED: {
			title: 'Оголошення',
			message: 'Запропоновано угоду для вашого оголошення "{title}"',
		},
		RULES_CHANGED: {
			title: 'Правила маркетплейсу',
			message: 'Правила маркетплейсу оновлено',
		},
		OFFICIAL_NAME_CONFIRMED: {
			title: 'Профіль',
			message: 'Ваше офіційне ім’я підтверджено {value}',
		},
	},
	pl: {
		TRUST_RATING_CHANGED: {
			title: 'Ocena zaufania',
			message: 'Otrzymałeś podwyżkę poziomu zaufania: +{value}',
		},
		BONUSES_CHANGED: {
			title: 'Bonusy',
			message: 'Na Twoje konto dodano {value} JEDNOSTEK',
		},
		PLAN_CHANGED: {
			title: 'Plan',
			message: 'Twój plan {value} wygasa za 1 dzień',
		},
		CLASSIFIED_ADDED: {
			title: 'Ogłoszenia',
			message: 'Pomyślnie opublikowano na stronie',
		},
		CLASSIFIED_UPDATED: {
			title: 'Ogłoszenia',
			message: 'Twoje ogłoszenie "{title}" zostało zaktualizowane',
		},
		CLASSIFIED_DELETED: {
			title: 'Ogłoszenia',
			message: 'Twoje ogłoszenie "{title}" zostało usunięte',
		},
		CLASSIFIED_FAVORITED: {
			title: 'Ogłoszenia',
			message: 'Użytkownik dodał twoje ogłoszenie "{title}" do ulubionych',
		},
		MESSAGE_RECEIVED: {
			title: 'Wiadomości',
			message: 'Otrzymałeś nową wiadomość dla ogłoszenia "{title}"',
		},
		DEAL_PROPOSED: {
			title: 'Ogłoszenia',
			message: 'Zaproponowano transakcję dla twojego ogłoszenia "{title}"',
		},
		RULES_CHANGED: {
			title: 'Zasady marketplace’u',
			message: 'Zasady marketplace’u zostały zaktualizowane',
		},
		OFFICIAL_NAME_CONFIRMED: {
			title: 'Profil',
			message: 'Twoje oficjalne imię zostało potwierdzone {value}',
		},
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

		// Создаем уведомление, сохраняя type и messageData
		const notification = await prisma.notification.create({
			data: {
				userId,
				type,
				messageData: JSON.stringify(messageData), // Сохраняем messageData как JSON
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
			const userLanguage = user.language || 'en'
			const { title, message: messageTemplate } =
				translations[userLanguage][type] || translations.en[type]
			let message = messageTemplate

			// Заменяем плейсхолдеры в сообщении для email
			if (typeof messageData === 'object') {
				Object.keys(messageData).forEach(key => {
					message = message.replace(`{${key}}`, messageData[key])
				})
			} else if (typeof messageData === 'string') {
				message = message.replace('{value}', messageData)
			}

			const subject = `New Notification: ${title}`
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

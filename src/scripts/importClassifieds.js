// const prisma = require('../lib/prisma')

// const classifiedsData = Array.from({ length: 40 }, (_, index) => ({
// 	title: `Classified Item ${index + 1}`,
// 	description: `Description for item ${
// 		index + 1
// 	}. This is a sample classified listing.`,
// 	price: 100 + index * 10,
// 	images: [
// 		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
// 		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
// 		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
// 		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
// 		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
// 		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
// 	],
// 	isActive: true,
// 	createdAt: new Date(2025, 3, 28 - index),
// }))

// async function importClassifieds() {
// 	try {
// 		// Получаем всех пользователей
// 		const users = await prisma.user.findMany()
// 		if (users.length === 0) {
// 			console.error('No users found. Please create users first.')
// 			return
// 		}

// 		// Выбираем случайного пользователя
// 		const randomUser = users[Math.floor(Math.random() * users.length)]

// 		// Подготавливаем данные, добавляя userId
// 		const classifieds = classifiedsData.map(classified => ({
// 			...classified,
// 			userId: randomUser.id,
// 		}))

// 		// Удаляем существующие объявления
// 		await prisma.classified.deleteMany({})

// 		// Импортируем новые объявления
// 		await prisma.classified.createMany({
// 			data: classifieds,
// 		})

// 		console.log('Successfully imported 40 classifieds with placeholder image.')
// 	} catch (error) {
// 		console.error('Error importing classifieds:', error)
// 	} finally {
// 		await prisma.$disconnect()
// 	}
// }

// importClassifieds()

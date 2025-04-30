const prisma = require('../lib/prisma')
const classifiedsData = require('../data/classifieds.json')

async function importClassifieds() {
	try {
		// Получаем всех пользователей
		const users = await prisma.user.findMany()
		if (users.length === 0) {
			console.error('No users found. Please create users first.')
			return
		}

		// Выбираем случайного пользователя
		const randomUser = users[Math.floor(Math.random() * users.length)]

		// Подготавливаем данные, заменяя userId
		const classifieds = classifiedsData.map(classified => ({
			...classified,
			userId: randomUser.id,
		}))

		// Удаляем существующие объявления (опционально)
		await prisma.classified.deleteMany({})

		// Импортируем новые объявления
		await prisma.classified.createMany({
			data: classifieds,
		})

		console.log('Successfully imported 40 classifieds.')
	} catch (error) {
		console.error('Error importing classifieds:', error)
	} finally {
		await prisma.$disconnect()
	}
}

importClassifieds()

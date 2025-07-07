const prisma = require('../lib/prisma')

// Список тестовых городов
const cities = [
	'Los-Angeles',
	'New-York',
	'Chicago',
	'Houston',
	'Phoenix',
	'Warsaw',
	'Kyiv',
	'Lviv',
	'Odessa',
	'Kharkiv',
	'Dnipro',
	'Zaporizhzhia',
	'Vinnytsia',
	'Ivano-Frankivsk',
]

// Список валют
const currencies = ['USD', 'UAH', 'EUR']

// Список планов
const plans = ['light', 'smart', 'extremum']

// Генерация 40 тестовых объявлений
const classifiedsData = Array.from({ length: 40 }, (_, index) => ({
	title: `Classified Item ${index + 1}`,
	description: `Description for item ${
		index + 1
	}. This is a sample classified listing for testing purposes.`,
	price: 100 + index * 10, // Цены от 100 до 490
	currency: currencies[index % currencies.length], // Циклическое распределение валют
	images: [
		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
	],
	isActive: true,
	city: cities[index % cities.length], // Циклическое распределение городов
	plan: plans[index % plans.length], // Циклическое распределение планов
	createdAt: new Date(2025, 3, 28 - (index % 28)), // Разные даты создания
}))

async function importClassifieds() {
	try {
		// Получение пользователей
		const users = await prisma.user.findMany()
		if (users.length === 0) {
			console.error('No users found. Please create users first.')
			return
		}

		// Подготовка данных объявлений
		const classifieds = classifiedsData.map((classified, index) => ({
			...classified,
			userId: users[index % users.length].id, // Распределяем объявления между пользователями
			tags: undefined, // Теги обрабатываем отдельно
		}))

		await prisma.classified.deleteMany({})

		// Создание объявлений
		const createdClassifieds = await prisma.classified.createMany({
			data: classifieds,
		})

		console.log(
			'Successfully imported 40 classifieds with cities, placeholder images, and tags.'
		)
	} catch (error) {
		console.error('Error importing classifieds:', error)
	} finally {
		await prisma.$disconnect()
	}
}

importClassifieds()

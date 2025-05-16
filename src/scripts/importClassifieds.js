const prisma = require('../lib/prisma')

const classifiedsData = Array.from({ length: 40 }, (_, index) => ({
	title: `Classified Item ${index + 1}`,
	description: `Description for item ${
		index + 1
	}. This is a sample classified listing.`,
	price: 100 + index * 10,
	images: [
		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
		'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
	],
	isActive: true,
	createdAt: new Date(2025, 3, 28 - index),
	tags: ['sample', 'test', `category${(index % 3) + 1}`],
}))

async function importClassifieds() {
	try {
		const users = await prisma.user.findMany()
		if (users.length === 0) {
			console.error('No users found. Please create users first.')
			return
		}

		const randomUser = users[Math.floor(Math.random() * users.length)]

		const uniqueTags = [...new Set(classifiedsData.flatMap(item => item.tags))]
		const tagPromises = uniqueTags.map(tagName =>
			prisma.tag.upsert({
				where: { name: tagName },
				update: {},
				create: { name: tagName },
			})
		)
		const createdTags = await Promise.all(tagPromises)
		const tagMap = new Map(createdTags.map(tag => [tag.name, tag.id]))

		const classifieds = classifiedsData.map(classified => ({
			...classified,
			userId: randomUser.id,
			tags: undefined,
		}))

		await prisma.classifiedTag.deleteMany({})
		await prisma.classified.deleteMany({})

		const createdClassifieds = await prisma.classified.createMany({
			data: classifieds,
		})

		const classifiedTagPromises = classifiedsData.map((classified, index) => {
			const classifiedId = createdClassifieds[index]?.id
			if (!classifiedId) return Promise.resolve()
			const tagConnections = classified.tags.map(tagName => ({
				classifiedId,
				tagId: tagMap.get(tagName),
			}))
			return prisma.classifiedTag.createMany({
				data: tagConnections,
				skipDuplicates: true,
			})
		})

		await Promise.all(classifiedTagPromises)

		console.log(
			'Successfully imported 40 classifieds with placeholder images and tags.'
		)
	} catch (error) {
		console.error('Error importing classifieds:', error)
	} finally {
		await prisma.$disconnect()
	}
}

importClassifieds()

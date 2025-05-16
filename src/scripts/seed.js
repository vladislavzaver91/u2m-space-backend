const prisma = require('../lib/prisma')

async function seed() {
	try {
		const user = await prisma.user.upsert({
			where: { email: 'user@user.com' },
			update: {},
			create: {
				id: 'test-user-id-123',
				email: 'user@user.com',
				name: 'Test User',
				provider: 'test',
				avatarUrl: '/public/avatar-lg.png',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		})
		console.log('Test user created:', user)
	} catch (error) {
		console.error('Error seeding database:', error)
	} finally {
		await prisma.$disconnect()
	}
}

seed()

const prisma = require('../lib/prisma')

async function seed() {
	try {
		const DEFAULT_AVATAR_URL =
			process.env.NODE_ENV === 'development'
				? 'http://localhost:3000/public/avatar-lg.png'
				: 'https://u2m-space-frontend.vercel.app/public/avatar-lg.png'
		const user = await prisma.user.upsert({
			where: { email: 'user@user.com' },
			update: {},
			create: {
				id: 'test-user-id-123',
				email: 'user@user.com',
				name: 'Test User',
				provider: 'test',
				avatarUrl: DEFAULT_AVATAR_URL,
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

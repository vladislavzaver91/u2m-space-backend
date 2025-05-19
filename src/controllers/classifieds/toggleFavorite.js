const prisma = require('../../lib/prisma')

const toggleFavorite = async (req, res) => {
	const { id } = req.params
	const userId = req.user.id

	try {
		// Проверяем существование объявления
		const classified = await prisma.classified.findUnique({
			where: { id },
		})

		if (!classified) {
			return res.status(404).json({ error: 'Classified not found' })
		}

		// Проверяем, есть ли объявление в избранном пользователя
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { favorites: true },
		})

		const isFavorite = user.favorites.includes(id)
		let updatedFavorites

		if (isFavorite) {
			// Удаляем из избранного
			updatedFavorites = await prisma.user.update({
				where: { id: userId },
				data: {
					favorites: {
						set: user.favorites.filter(favId => favId !== id),
					},
				},
				select: { favorites: true },
			})

			// Декрементируем счетчик
			await prisma.classified.update({
				where: { id },
				data: {
					favorites: { decrement: 1 },
				},
			})
		} else {
			// Добавляем в избранное
			updatedFavorites = await prisma.user.update({
				where: { id: userId },
				data: {
					favorites: {
						push: id,
					},
				},
				select: { favorites: true },
			})

			// Инкрементируем счетчик
			await prisma.classified.update({
				where: { id },
				data: {
					favorites: { increment: 1 },
				},
			})
		}

		// Получаем обновленное объявление
		const updatedClassified = await prisma.classified.findUnique({
			where: { id },
		})

		return res.json({
			id,
			favorites: updatedClassified.favorites,
			favoritesBool: updatedFavorites.favorites.includes(id),
		})
	} catch (error) {
		console.error('Error toggling favorite:', error)
		return res.status(500).json({ error: 'Server error' })
	}
}

module.exports = { toggleFavorite }

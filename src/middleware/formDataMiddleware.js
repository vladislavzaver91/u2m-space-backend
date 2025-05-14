const formDataMiddleware = (req, res, next) => {
	// Нормализация текстовых полей (tags и existingImages)
	if (req.body.tags) {
		if (Array.isArray(req.body.tags)) {
			req.body.tags = req.body.tags.filter(
				tag => typeof tag === 'string' && tag.trim().length > 0
			)
		} else if (typeof req.body.tags === 'string') {
			req.body.tags = [req.body.tags].filter(
				tag => typeof tag === 'string' && tag.trim().length > 0
			)
		}
	}

	if (req.body.existingImages) {
		if (Array.isArray(req.body.existingImages)) {
			req.body.existingImages = req.body.existingImages.filter(
				url => typeof url === 'string' && url.startsWith('https://')
			)
		} else if (typeof req.body.existingImages === 'string') {
			req.body.existingImages = [req.body.existingImages].filter(
				url => typeof url === 'string' && url.startsWith('https://')
			)
		}
	}

	next()
}

module.exports = formDataMiddleware

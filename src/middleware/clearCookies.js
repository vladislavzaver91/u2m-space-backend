module.exports = (req, res, next) => {
	res.on('finish', () => {
		res.clearCookie('accessToken')
		res.clearCookie('refreshToken')
		res.clearCookie('user')
	})
	next()
}

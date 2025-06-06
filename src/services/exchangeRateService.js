const axios = require('axios')
const NodeCache = require('node-cache')
const cache = new NodeCache({ stdTTL: 3600 }) // Кэш на 1 час

const API_KEY = process.env.EXCHANGE_RATE_API_KEY
const BASE_URL = process.env.EXCHANGE_RATE_BASE_URL

async function getExchangeRate(baseCurrency) {
	try {
		const cacheKey = `rates_${baseCurrency}`
		const cachedRates = cache.get(cacheKey)
		if (cachedRates) return cachedRates

		const res = await axios.get(`${BASE_URL}${API_KEY}/latest/${baseCurrency}`)
		const rates = res.data.conversion_rates
		cache.set(cacheKey, rates)
		return rates
	} catch (error) {
		console.error('Error while getting exchange rates:', error.message)
		throw new Error('Unable to get exchange rates')
	}
}

module.exports = { getExchangeRate }

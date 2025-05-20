const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const AppleStrategy = require('passport-apple').Strategy
const prisma = require('../lib/prisma')

const DEFAULT_AVATAR_URL =
	process.env.NODE_ENV === 'development'
		? 'http://localhost:3000/public/avatar-lg.png'
		: 'https://u2m-space-frontend.vercel.app/public/avatar-lg.png'

passport.serializeUser((user, done) => {
	done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
	try {
		const user = await prisma.user.findUnique({ where: { id } })
		done(null, user)
	} catch (error) {
		done(error, null)
	}
})

// Google Strategy
passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: `${process.env.CALLBACK_URL}/api/auth/callback/google`,
			passReqToCallback: true,
		},
		async (req, accessToken, refreshToken, profile, done) => {
			try {
				let user = await prisma.user.findUnique({
					where: { email: profile.emails[0].value },
				})

				const avatarUrl =
					(profile.photos && profile.photos[0]?.value) || DEFAULT_AVATAR_URL
				console.log('Google avatarUrl:', avatarUrl)

				if (!user) {
					user = await prisma.user.create({
						data: {
							id: profile.id,
							email: profile.emails[0].value,
							name: profile.displayName || '',
							provider: 'google',
							avatarUrl,
							phoneNumber: null, // Провайдер не предоставляет телефон
							successfulDeals: 0,
						},
					})
				} else if (!user.avatarUrl || user.avatarUrl !== avatarUrl) {
					user = await prisma.user.update({
						where: { id: user.id },
						data: { avatarUrl },
					})
				}
				console.log('Google user:', user)
				done(null, user)
			} catch (error) {
				console.error('Google auth error:', error)
				done(error, null)
			}
		}
	)
)

// Facebook Strategy
passport.use(
	new FacebookStrategy(
		{
			clientID: process.env.FACEBOOK_CLIENT_ID,
			clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
			callbackURL: `${process.env.CALLBACK_URL}/api/auth/callback/facebook`,
			profileFields: ['id', 'emails', 'name', 'photos'],
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				let user = await prisma.user.findUnique({
					where: { email: profile.emails[0].value },
				})

				const avatarUrl =
					(profile.photos && profile.photos[0]?.value) || DEFAULT_AVATAR_URL
				console.log('Google avatarUrl:', avatarUrl)

				if (!user) {
					user = await prisma.user.create({
						data: {
							id: profile.id,
							email: profile.emails[0].value,
							name: `${profile.name.givenName || ''} ${
								profile.name.familyName || ''
							}`.trim(),
							provider: 'facebook',
							avatarUrl,
							phoneNumber: null,
							successfulDeals: 0,
						},
					})
				} else if (!user.avatarUrl || user.avatarUrl !== avatarUrl) {
					user = await prisma.user.update({
						where: { id: user.id },
						data: { avatarUrl },
					})
				}
				console.log('Facebook user:', user)
				done(null, user)
			} catch (error) {
				console.error('Facebook auth error:', error)
				done(error, null)
			}
		}
	)
)

// Apple Strategy
// passport.use(
// 	new AppleStrategy(
// 		{
// 			clientID: process.env.APPLE_CLIENT_ID,
// 			teamID: process.env.APPLE_TEAM_ID,
// 			keyID: process.env.APPLE_KEY_ID,
// 			privateKey: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
// 			callbackURL: `${process.env.CALLBACK_URL}/api/auth/callback/apple`,
// 			scope: ['name', 'email'],
// 		},
// 		async (accessToken, refreshToken, profile, done) => {
// 			try {
// 				let user = await prisma.user.findUnique({
// 					where: { email: profile.email },
// 				})

// 				const avatarUrl = DEFAULT_AVATAR_URL;

// 				if (!user) {
// 					user = await prisma.user.create({
// 						data: {
// 							id: profile.id,
// 							email: profile.email,
// 							name: profile.name
// 								? `${profile.name.firstName || ''} ${profile.name.lastName || ''
// 									}`.trim()
// 								: '',
// 							provider: 'apple',
// 							avatarUrl,
//              phoneNumber: null,
//              successfulDeals: 0,
// 						},
// 					})
// 				} else if (!user.avatarUrl || user.avatarUrl !== avatarUrl) {
// 					user = await prisma.user.update({
// 						where: { id: user.id },
// 						data: { avatarUrl },
// 					})
// 				}
// 				console.log('Apple user:', user)
// 				done(null, user)
// 			} catch (error) {
// 				console.error('Apple auth error:', error)
// 				done(error, null)
// 			}
// 		}
// 	)
// ) после добавления ключей, можно раскомментировать

module.exports = passport

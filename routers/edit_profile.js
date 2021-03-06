const express = require('express')
const router = express.Router()
const ROUTES = require('../routers/routes')
const COOKIES = require('../utils/cookies')
const PAGES = require('../view_data/page_data')
const index = require('../index')
const db = require('../utils/db')
const userLoggedIn = require('../middleware').userLoggedIn
const encryption = require('../utils/encryption')

router.route(ROUTES.EDITPROFILE)

    .get(userLoggedIn, (req, res, next) => {
        db.getUserProfileById(req.session[COOKIES.ID]).then((result) => {
            let detailsObj = {
                firstname: result.rows[0].first,
                lastname: result.rows[0].last,
                email: result.rows[0].email,
                age: result.rows[0].age,
                city: result.rows[0].city,
                url: result.rows[0].url
            }
            let pageData = new PAGES.EditProfilePage(detailsObj)
            index.renderPage(res, pageData)
        }).catch((e) => {
            console.log(e)
            next()
        })
    })

    .post(userLoggedIn, (req, res, next) => {
        if (req.body.delete) {
            db.deleteAccount(req.session[COOKIES.ID]).then(() => {
                delete req.session
                res.redirect(ROUTES.REGISTER)
            }).catch((e) => {
                index.renderPage(res, new PAGES.EditProfilePage({}, e))
            })
        } else {
            const userId = req.session[COOKIES.ID]
            let age = req.body.age
            const city = req.body.city
            const url = req.body.url
            const first = req.body.firstname
            const last = req.body.lastname
            const email = req.body.email
            const password = req.body.password
            // to update Profile
            db.updateProfile(userId, age, city, url).then((result) => {
                if (result) {
                    if (password) {
                        encryption.hashPassword(password).then((hashedP) => {
                            db.updateUser(first, last, hashedP, email, userId).catch((e) => {
                                index.renderPage(res, new PAGES.ProfilePage({}, `${e}`))
                            })
                        })
                    } else {
                        db.updateUser(first, last, null, email, userId).catch((e) => {
                            index.renderPage(res, new PAGES.ProfilePage({}, `${e}`))
                        })
                    }
                    req.session[COOKIES.LOGGEDIN] = true
                    res.redirect(ROUTES.PETITION)
                } else {
                    index.renderPage(res, new PAGES.EditProfilePage({}, `Please enter a valid url`))
                }
            }).catch((e) => {
                if (e.code === '22P02') {
                    index.renderPage(res, new PAGES.EditProfilePage({}, `Please enter a number for your age`))
                } else {
                    index.renderPage(res, new PAGES.EditProfilePage({}, `${e.message}`))
                }
            })
        }
    })

module.exports = router

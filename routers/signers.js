const express = require('express')
const router = express.Router()
const ROUTES = require('../routers/routes')
const COOKIES = require('../utils/cookies')
const PAGES = require('../view_data/page_data')
const index = require('../index')
const db = require('../utils/db')
const userLoggedIn = require('../middleware').userLoggedIn

const chalk = require('chalk')
const performance = require('perf_hooks').performance

router.route(ROUTES.SIGNERS)

    .get(userLoggedIn, (req, res, next) => {
        const userID = req.session[COOKIES.ID]
        var start = performance.now()
        db.listSigners(userID).then((signers) => {
            var tolist = signers.rows.map((signer) => {
                return {
                    first: signer.first,
                    last: signer.last,
                    age: signer.age,
                    city: signer.city ? signer.city.charAt(0).toUpperCase() + signer.city.slice(1) : null,
                    url: signer.url
                }
            })
            console.log(chalk.blue(`Took ${performance.now() - start} milliseconds to get from Postgres`))
            index.renderPage(res, new PAGES.SignersPage(tolist))
        }).catch((e) => {
            console.log(e)
            next()
        })
    })
module.exports = router

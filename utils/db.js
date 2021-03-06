const spicedPg = require('spiced-pg')

// process.env.NODE_ENV === "production" ? secrets = process.env : secrets = require('./secrets');
const dbUrl = process.env.DATABASE_URL || `postgres:postgres:postgres@localhost:5432/salt-petition`
const db = spicedPg(dbUrl)

// DB ids
module.exports.USERID = 'user_id'
module.exports.SIGNATURE = 'signature'
module.exports.EMAIL = 'email'
module.exports.FIRSTNAME = 'first'
module.exports.LASTNAME = 'last'
module.exports.CITY = 'city'
module.exports.AGE = 'age'
module.exports.URL = 'url'
module.exports.SIGNERS = 'signers'
module.exports.SIGNATURES = 'signatures'
module.exports.USERS = 'users'
module.exports.USERPROFILES = 'user_profiles'

module.exports.test = function () {
    return true
}

module.exports.addSignature = function (userId, signatureUrl) {
    return db.query(`
        INSERT INTO signatures(user_id, signature) 
        VALUES ($1, $2)
        RETURNING id;
        `,
    [userId, signatureUrl]
    )
}

module.exports.deleteSignature = function deleteSignature (sigId) {
    return db.query(`
        DELETE FROM signatures
        WHERE id = $1;
        `,
    [ sigId ]
    )
}

module.exports.listSigners = function listSigners (userId) {
    return db.query(
        `SELECT first,last,age,city,url FROM signatures
        JOIN users ON signatures.user_id=users.id
        LEFT JOIN user_profiles ON users.id=user_profiles.user_id
        `)
}

module.exports.listSignersByCity = function listSignersByCity (city) {
    return db.query(
        `SELECT first,last,age,city,url 
        FROM signatures
        JOIN users ON signatures.user_id=users.id
        LEFT JOIN user_profiles ON users.id=user_profiles.user_id
        WHERE city =$1
        `,
        [ city ]
    )
}

module.exports.signersCount = function getAmountOfSigners (userid) {
    return db.query(
        `SELECT COUNT(id)
         FROM signatures
         WHERE user_id != $1;`
        , [userid])
}

// USER QUERIES

module.exports.addUser = function (first, last, email, password) {
    return db.query(`
        SELECT email 
        FROM users
        WHERE email = $1
        `,
    [email]
    ).then((result) => {
        let rowLength = result.rows.length
        let hasValue = rowLength < 1
        if (hasValue) {
            return db.query(`
            INSERT INTO users(first, last, email, password) 
            VALUES ($1, $2, $3, $4)
            RETURNING id;
            `,
            [first, last, email, password]
            )
        } else {
            throw new Error('Somebody already signed up with that email! It mustbe unique.')
        }
    })
}

module.exports.deleteProfile = function deleteProfile (userId) {
    return db.query(`
        DELETE FROM user_profiles
        WHERE user_id = $1;
    `
    ,
    [userId])
}

module.exports.deleteUser = function deleteUser (userId) {
    return db.query(`
        DELETE FROM users
        WHERE id = $1;
    `,
    [userId])
}

module.exports.deleteAccount = function deleteAccount (userId) {
    return new Promise((resolve, reject) => {
        this.deleteSignature(userId).then((res) => {
            this.deleteProfile(userId).then((resu) => {
                this.deleteUser(userId).then((result) => {
                    resolve(result)
                })
            })
        })
    })
}

module.exports.getHashedPWord = function (email) {
    return db.query(`
        SELECT password FROM users WHERE $1 = email; 
        `,
    [email]
    )
}

module.exports.addUserProfile = function (age, city, url, userId) {
    age = age === '' ? null : age
    city = city.charAt(0).toUpperCase() + city.slice(1)
    return new Promise((resolve, reject) => {
        if (url.startsWith('http://') || url.startsWith('https://') || url === '' || url === null) {
            resolve(
                db.query(`
                INSERT INTO user_profiles(age, city, url, user_id) 
                VALUES ($1, $2, $3, $4)
                RETURNING id, age, city, url;
                `,
                [age, city, url, userId]
                )
            )
        } else {
            reject(new Error('Not a valid Url. Leave blank if you like :)'))
        }
    })
}

module.exports.getSigUserId = function (userId) {
    return db.query(`SELECT id FROM signatures WHERE user_id =$1`, [userId])
}

module.exports.getSignatureWithSigId = function (sigId) {
    return db.query(`
        SELECT signature
        FROM signatures 
        WHERE id = $1; 
        `,
    [sigId]
    )
}

module.exports.updateUser = function (first, last, password, email, userId) {
    if (!password) {
        return db.query(`
        UPDATE users
        SET first = $1, last = $2, email = $3
        WHERE id = $4;
        `,
        [first, last, email, userId]
        )
    } else {
        return db.query(`
        UPDATE users
        SET first = $1, last = $2, password = $3, email = $4
        WHERE id = $5;
        `,
        [first, last, password, email, userId]
        )
    }
}

module.exports.getNameAndSignature = function (userId) {
    return db.query(`
        SELECT users.first, signatures.signature
        FROM users 
        JOIN signatures
        ON users.id = signatures.user_id 
        WHERE $1 = users.Id; 
        `,
    [userId]
    )
}

module.exports.getName = function (userId) {
    return db.query(`
        SELECT first
        FROM users 
        WHERE $1 = users.Id; 
        `,
    [userId]
    )
}

module.exports.getUserProfileById = function (id) {
    return db.query(`
    SELECT first,last,email, age, city, url
    FROM users
    LEFT JOIN user_profiles 
    ON users.id=user_profiles.user_id
    WHERE users.id =$1;`,
    [id]
    )
}

module.exports.updateProfile = function (userId, age, city, url) {
    age = age === '' ? null : age
    city = city.charAt(0).toUpperCase() + city.slice(1)
    return new Promise((resolve, reject) => {
        if (url.startsWith('http://') || url.startsWith('https://') || url === '' || url === null) {
            resolve(db.query(`
            INSERT INTO user_profiles(user_id, age, city, url) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id)
            DO UPDATE SET age=$2, city=$3, url=$4;
            `,
            [ userId, age, city, url ]
            ))
        } else {
            reject(new Error('Not a valid Url. Leave blank if you like :)'))
        }
    })
}

module.exports.getUserProfile = function (email) {
    return db.query(`
    SELECT users.id AS "id", first,last,email,password, signatures.id AS "sigId", age, city, url
    FROM users
    LEFT JOIN user_profiles
    ON users.id = user_profiles.user_id
    LEFT JOIN signatures 
    ON user_profiles.user_id=signatures.user_id
    WHERE email =$1;`,
    [email]
    )
}

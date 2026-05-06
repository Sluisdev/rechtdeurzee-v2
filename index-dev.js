if (process.env.NODE_ENV !== "production") {
    require('dotenv').config()
}

const express = require('express');
const mongoose = require('mongoose')
const AgItem = require('./public/js/agendaModel')
const User = require('./public/js/login')
const multer = require('multer')
const methodOverride = require('method-override')
const bcrypt = require('bcrypt')
const session = require('express-session')
const {MongoStore} = require('connect-mongo')
const cookieParser = require('cookie-parser')
const jwt = require ('jsonwebtoken')
const nodemailer = require('nodemailer')
const AppError = require('./public/js/AppError')
const flash = require('connect-flash')
const path = require('path')
const ejs = require('ejs')
const app = express();

app.set('view engine', 'ejs')

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './public/images'), 
    filename: (req, file, cb) => cb(null, file.originalname)
})

const upload = multer({storage: storage})

const transporter = nodemailer.createTransport({service: "gmail", auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.GOOGLE_PASS
}})

const months = { 
  1: "Januari",
  2: "Februari",
  3: "Maart",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Augustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "December"
}

mongoose.connect(process.env.DB_PRODUCTION)
.then(() => {
    console.log("database connected")
})
.catch((err) => {
    console.log(`Error: ${err}`)
})

// Deep dive into the Store & Session to creat better understanding. 

const store = MongoStore.create({
    mongoUrl: process.env.DB_PRODUCTION,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: process.env.SESSION_SECRET
    }
});

store.on("error", function (e) {
    console.log(`SESSION ERROR: ${e}`)
})

app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))
app.use(methodOverride('_method'))
app.use(session({
    store,
    secret: process.env.SESSION_SECRET, 
    resave: false, 
    saveUninitialized: false
}))

app.use(flash())

app.listen('3000', (req, res) => {
    console.log("Backend Live");
})

function requireSession (req, res, next) {
    // To check if session contains user_id. 
    // If not, user is being redirected to /login screen
    if (!req.session.user_id) {
        res.redirect('/portal/login')
    } else next()
}

function verifyToken (req, res, next) {
    const {t: token} =  req.query
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user_id = decoded.id
        req.user_mail = decoded.email
        next()
    } catch (err) {
        console.log(err)
        const error = "Invalid or Expired reset link"
        res.render('404.ejs', {error})
    }
}

app.get('/', (req, res) => {
    res.redirect('/home')
})


app.get('/home',  (req, res) => {
    res.sendFile(path.join(__dirname, '/public/html/index.html'))
})

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/html/contact.html'))
})

app.get('/repertoire',  (req, res) => {
    res.sendFile(path.join(__dirname, '/public/html/repertoire.html'))
})

app.get('/foto-video',  (req, res) => {
    res.sendFile(path.join(__dirname, '/public/html/foto-video.html'))
})

app.get('/agenda', async (req, res) => {
    const data = await AgItem.aggregate(([
    {$addFields: {parsedDate: {$dateFromString: {dateString: "$date"}}}}, 
    {$sort: {parsedDate: 1}},
    {$group:
        {_id: 
            {year: {$year: "$parsedDate"}, month: {$month: "$parsedDate"}}, 
            items: {$push: "$$ROOT"}}},
    {$sort: {"_id.month": 1}},
    {$group: {_id: "$_id.year", months: {$push: {month: "$_id.month", items: "$items"}}}},
    {$sort: {_id: 1}}
    ])); 
    res.render('agendaV2', {data, months})
})

app.post('/portal/forgotpassword', async (req, res) => {
    const {email} = req.body
    const user = await User.findOne({email: email})
    if (!user) {
        res.status(401).send()
        return
    }
    const token = jwt.sign(
        {id: user._id, email: user.email}, 
        process.env.JWT_SECRET, 
        {expiresIn: '30m'});
    const resetLink = `http://localhost:3000/resetpassword?t=${token}`
     try {
        await transporter.sendMail({
        from: process.env.EMAIL_USER, 
        to: user.email, 
        subject: 'Wachtwoord Herstel Rechtdeurzee',
        html: await ejs.renderFile('./views/email.ejs', {user, token})
        })
        res.status(204).send()
    } catch (err) {
        res.status(500).send()
        console.log(err)
    }
})

app.get('/portal/resetpassword', verifyToken ,(req, res) => {
    const {t: token} =  req.query
    res.render('resetpw', {token})
}) 

app.post('/portal/resetpassword', verifyToken , async (req, res) => {
    const id = req.user_id
    try {
        const newPw = await bcrypt.hash(req.body.pw, 12)
        const user = await User.findByIdAndUpdate(id, {password: newPw})
        req.flash('success', 'Wachtwoord succesvol gewijzigd')
        res.redirect('/portal/login')
    } catch (err) {
        console.log(err)
        res.status(500).render('404')
    }
})

app.get('/portal/login', (req, res) => {
    res.render('login',  {message: req.flash('success')})
})

app.post('/portal/login', async (req, res) => {
     const {username, password} = req.body
     const user = await User.findOne({username})
     if (!user) {
        res.status(401).send()
        return
     }
     const validPassword = await bcrypt.compare(password, user.password)
     if (validPassword) {
        req.session.user_id = user._id
        res.status(204).send()
     } else {
        res.status(401).send()
     }
})

app.post('/portal/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/portal/login')
})

// async function newUser (name, lastname, username, password, email) {
//     const hash = await bcrypt.hash(password, 12)
//     const newUser = await new User({name: name, lastname: lastname, username: username, email: email, password: hash})
//     newUser.save()
// }

// AgItem.insertMany([
//   {
//     startTime: '20:00',
//     endTime: '22:00',
//     arrivalTime: '18:30',
//     date: '2026-05-02',
//     locationName: 'De Leuke Hanzestad',
//     streetnameAndNumber: 'Ijsseldijk 12',
//     postalCode: '8261LK',
//     city: 'Kampen',
//     imgURL: '/images/Hanzestad.jpg',
//     website: 'https://hanze1898.nl/'
//   },
//   {
//     startTime: '19:00',
//     endTime: '21:00',
//     arrivalTime: '18:45',
//     date: '2026-09-24',
//     locationName: 'Margaretha - ijsselheem',
//     streetnameAndNumber: 'Burgwal 45',
//     postalCode: '8261 EP',
//     city: 'Kampen',
//     imgURL: '/images/Marghareta.jpeg',
//     website: 'https://www.ijsselheem.nl/locaties/kampen/margaretha'
//   },
//   {
//     startTime: '14:45',
//     endTime: '15:45',
//     arrivalTime: '14:30',
//     date: '2026-10-22',
//     locationName: 'Esdoorn - Vereen',
//     streetnameAndNumber: 'Esdoornstraat 7',
//     postalCode: '8021WB',
//     city: 'Zwolle',
//     imgURL: '/images/esdoorn.jpg',
//     website: 'https://vereen.nu/locatie/de-esdoorn',
//   },
//   {
//     startTime: '19:00',
//     endTime: '22:00',
//     arrivalTime: '18:45',
//     date: '2026-11-24',
//     locationName: 'Myosotis - IJsselheem',
//     streetnameAndNumber: 'Engelenbergplantsoen 3',
//     postalCode: '8266AB',
//     city: 'Kampen',
//     imgURL: '/images/Myosotis.jpg',
//     website: 'https://www.ijsselheem.nl/locaties/kampen/myosotis',
//   },
//   {
//     startTime: '09:00',
//     endTime: 'N/A',
//     arrivalTime: '09:00',
//     date: '2026-04-27',
//     locationName: 'Koningsdag - Aubade',
//     streetnameAndNumber: 'Burgermeester van Engelenweg',
//     postalCode: '8271 AN',
//     city: 'Ijsselmuiden',
//     imgURL: '/images/Kopie van Kopie van Koningsdag Feest Oranje & Zwart Instagram Post.jpg',
//     website: 'https://visitkampen.nl/evenementen/ijov-koningsdag-ijsselmuiden',
//   }
// ])



app.get('/portal/agenda', requireSession, async (req, res) => {
    // Aggregation pipeline to sort & group data into structure easily useable for displaying.
    const data = await AgItem.aggregate(([
    {$addFields: {parsedDate: {$dateFromString: {dateString: "$date"}}}}, 
    {$sort: {parsedDate: 1}},
    {$group:
        {_id: 
            {year: {$year: "$parsedDate"}, month: {$month: "$parsedDate"}}, 
            items: {$push: "$$ROOT"}}},
    // Tried to figure out why the two sort keys require different values for the same sorting order,
    // Haven't found an answer as of yet. 
    {$sort: {"_id.month": 1}},
    {$group: {_id: "$_id.year", months: {$push: {month: "$_id.month", items: "$items"}}}},
    {$sort: {_id: 1}}
    ]));
    res.render('allAgendaItems', {data, months});
})

app.get('/portal/agenda/filter', requireSession, async (req, res) => {
    // GET Call that sends rendered HTML based on the filter specified. 
    const month = parseInt(req.query.m)
    const year = parseInt(req.query.y)
    console.log(typeof month, year)
    let data = await AgItem.aggregate(([
        {$addFields: {parsedDate: {$dateFromString: {dateString: "$date"}}}}, 
        {$sort: {parsedDate: 1}},
        {$group: 
            {_id: 
                {year: {$year:"$parsedDate"}, 
                month: {$month: "$parsedDate"}}, 
            items: {$push: '$$ROOT'}}},
        {$match: {$and:[ month ? {"_id.month": month}: {},  year ? {"_id.year": year}: {}]}},
        {$sort: {"_id.month": 1}},
        {$group: {_id: "$_id.year", months: {$push: {month: "$_id.month", items: "$items"}}}}, 
        {$sort: {_id: 1}} 
        ]))
        console.log(data)
    res.render('partials/filteredMonth', {data, months})
})

app.get('/portal/agenda/new', requireSession,(req, res) => {
    res.render('newAgendaItem', {message: req.flash('success')})
})

app.post('/portal/agenda/new', requireSession, upload.single('uploaded_file'), async (req, res ) => {
    const data = req.body
    data.imgURL = `/images/${req.file.originalname}`
    const newItem = new AgItem(data)
    await newItem.save()
    res.redirect('/portal/agenda')
})

app.get('/portal/agenda/:id/edit', requireSession, async (req, res) => {
    const {id} = req.params
    const i = await AgItem.findById(id)
    res.render('editItem', {i, id})
})

app.patch('/portal/agenda/:id/edit', requireSession, upload.single('uploaded_file'), async (req, res) => {
    const {id} = req.params
    const updatedInfo = req.body
    // IF image is updated, img path will be updated to new image. 
    if (req.file) {
        updatedInfo.imgURL = `/images/${req.file.originalname}`
    } 
    // Loop below deletes empty entries from the sent from data. 
    // This prevents fields from being updated to empty strings
    for (const [key, value] of Object.entries(updatedInfo)) {
        if (value.length === 0)
            delete updatedInfo[key]
    }
    await AgItem.findByIdAndUpdate(id, updatedInfo)
    res.redirect('/portal/agenda')
})

app.get('/portal/agenda/:id', requireSession, async (req, res) => {
    const {id} = req.params
    const item = await AgItem.findById(id)
    res.render('item', {item})
})

app.delete('/portal/agenda/:id', requireSession,async (req, res) => {
    const {id} = req.params
    await AgItem.findByIdAndDelete(id)
    res.status(204).send()
})

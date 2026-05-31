import dotenv from 'dotenv';
if (process.env.NODE_ENV !== "production") {
    dotenv.config();
    
}

import express from "express"; 
import mongoose from 'mongoose';
import AgItem from '../public/js/agendaModel.js';
import User from '../public/js/login.js';
import multer from 'multer';
import methodOverride from 'method-override';
import bcrypt from 'bcrypt';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import AppError from '../public/js/AppError.js';
import flash from 'connect-flash';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import path from 'path';

import {put} from '@vercel/blob'



const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('views', path.join(process.cwd(), 'views'))
app.set('view engine', 'ejs')


const storage = multer.memoryStorage()
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

if (process.env.LOCAL_ENV) {
    console.log('running express.static')
    app.use(express.static(path.join(__dirname, '../public')));
};
app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.use(session({
    store,
    secret: process.env.SESSION_SECRET, 
    resave: false, 
    saveUninitialized: false
}));
app.use(flash())

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

app.get("/", (req, res) => {
  res.redirect('/home')
  console.log('backend running')
});

app.listen('3000', () => {
    console.log('backend running')
})

app.get('/home',  async (req, res) => {
    const data = await AgItem.aggregate(([
    {$addFields: {parsedDate: {$dateFromString: {dateString: "$date"}}}}, 
    {$sort: {parsedDate: 1}}]))
    const upcomingEvent = data[0]
    res.render(path.join(__dirname, '../views/home.ejs'),  {upcomingEvent})
})

app.get('/contact', async (req, res) => {
    const data = await AgItem.aggregate(([
    {$addFields: {parsedDate: {$dateFromString: {dateString: "$date"}}}}, 
    {$sort: {parsedDate: 1}}]))
    const upcomingEvent = data[0]
    res.render(path.join(__dirname, '../views/contact.ejs'),  {upcomingEvent})
})

app.get('/repertoire',  (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html/repertoire.html'))
})

app.get('/agenda', async (req, res) => {
    const onlySorted = await AgItem.aggregate(([
    {$addFields: {parsedDate: {$dateFromString: {dateString: "$date"}}}}, 
    {$sort: {parsedDate: 1}}]))
    const upcomingEvent = onlySorted[0]
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
     
    res.render(path.join(__dirname, '../views/agendaV2.ejs'), {data, months, upcomingEvent})
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
        html: await ejs.renderFile(path.join(__dirname, '../views/email.ejs'), {user, token})
        })
        res.status(204).send()
    } catch (err) {
        res.status(500).send()
        console.log(err)
    }
})

app.get('/portal/resetpassword', verifyToken ,(req, res) => {
    const {t: token} =  req.query
    res.render(path.join(__dirname, '../views/resetpw.ejs'), {token})
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
    res.render(path.join(__dirname, '../views/login.ejs'),  {message: req.flash('success')})
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


app.get('/portal/agenda', requireSession, async (req, res) => {
    // Aggregation pipeline to sort & group data into structure easily useable for displaying.
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
    res.render(path.join(__dirname, '../views/allAgendaItems.ejs'), {data, months});
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
    res.render(path.join(__dirname, '../views/partials/filteredMonth.ejs'), {data, months})
})

app.get('/portal/agenda/new', requireSession,(req, res) => {
    res.render(path.join(__dirname, '../views/newAgendaItem.ejs'), {message: req.flash('success'), path})
})

app.post('/portal/agenda/new', requireSession, upload.single('uploaded_file'), async (req, res ) => {
    // const file = form.get('File')
    const data = req.body
    const file = req.file
    // Vercel's blob storage is used to store uploaded files.  
    const blob = await 
        put(file.originalname, file.buffer, 
        {access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true, 
        contentType: req.file.mimetype});
    data.imgURL = blob.url
    const newItem = new AgItem(data)
    await newItem.save()
    res.redirect('/portal/agenda')
})

app.get('/portal/agenda/:id/edit', requireSession, async (req, res) => {
    const {id} = req.params
    const i = await AgItem.findById(id)
    res.render(path.join(__dirname, '../views/editItem.ejs'), {i, id})
})

app.patch('/portal/agenda/:id/edit', requireSession, upload.single('uploaded_file'), async (req, res) => {
    const {id} = req.params
    const updatedInfo = req.body
    const file = req.file
    // IF image is updated, img path will be updated to new image. 
    if (file) {
        const blob = await 
            put(file.originalname, file.buffer, 
            {access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN, 
            addRandomSuffix: true, 
            contentType: req.file.mimetype});
        updatedInfo.imgURL = blob.url
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
    res.render(path.join(__dirname, '../views/item.ejs'), {item})
})

app.delete('/portal/agenda/:id', requireSession,async (req, res) => {
    const {id} = req.params
    await AgItem.findByIdAndDelete(id)
    res.status(204).send()
})

export default app;

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name cannot be blank'] 
    },
    lastname: {
        type: String,
        required: [true, 'Last name cannot be blank'] 
    },
    username: {
        type: String, 
        required: [true, 'Username cannot be blank']
    }, 
    password: {
        type: String, 
        required: [true, 'Password cannot be blank']
    }, 
    email: {
        type: String, 
        required: [true, 'Email cannot be blank']
    }, 
}, {timestamps: true})

const User = mongoose.model('user', userSchema)

export default User



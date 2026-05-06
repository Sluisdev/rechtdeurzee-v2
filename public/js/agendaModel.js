import mongoose from 'mongoose';

const agItemSchema = new mongoose.Schema({
    startTime: String, 
    endTime: String, 
    arrivalTime: String, 
    date: String, 
    locationName: String, 
    streetnameAndNumber: String, 
    postalCode: String, 
    city: String,
    imgURL: String, 
    website: String
})

const AgItem = mongoose.model('agendaItem', agItemSchema)

export default AgItem
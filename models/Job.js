// models/Job.js

// Această linie trebuie să apară O SINGURĂ DATĂ în acest fișier.
const mongoose = require('mongoose'); 

// Definește schema (structura) pentru un job
const JobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title can not be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [1000, 'Description can not be more than 1000 characters']
    },
    company: {
        type: String,
        required: [true, 'Please add a company name'],
        maxlength: [100, 'Company name can not be more than 100 characters']
    },
    location: String,
    salary: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Exportează modelul Job bazat pe schema definită
// Această linie este crucială pentru a face modelul disponibil în alte fișiere (ex: server.js)
module.exports = mongoose.model('Job', JobSchema);

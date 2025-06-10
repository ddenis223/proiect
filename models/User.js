// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Folosim bcryptjs pentru a cripta parolele

// Definim schema pentru modelul User
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true, // Numele de utilizator este obligatoriu
        unique: true,   // Numele de utilizator trebuie să fie unic
        trim: true      // Elimină spațiile albe de la începutul și sfârșitul șirului
    },
    email: {
        type: String,
        required: true, // Emailul este obligatoriu
        unique: true,   // Emailul trebuie să fie unic
        trim: true,
        lowercase: true, // Salvează emailul cu litere mici
        // Validare simplă pentru formatul emailului
        match: [/.+@.+\..+/, 'Vă rugăm să introduceți o adresă de email validă']
    },
    password: {
        type: String,
        required: true, // Parola este obligatorie
        minlength: [6, 'Parola trebuie să aibă minim 6 caractere']
    },
    createdAt: {
        type: Date,
        default: Date.now // Adaugă automat data creării utilizatorului
    }
});

// --- Middleware Mongoose pentru criptarea parolei înainte de salvare ---
// Această funcție se va rula ÎNAINTE ca un utilizator să fie salvat în baza de date
UserSchema.pre('save', async function(next) {
    // Verificăm dacă parola a fost modificată (sau este o nouă înregistrare)
    if (!this.isModified('password')) {
        return next(); // Dacă parola nu s-a schimbat, mergem mai departe
    }

    try {
        // Generăm un salt (un șir aleatoriu de caractere)
        const salt = await bcrypt.genSalt(10); // 10 este nivelul de complexitate (cost factor)
        // Criptăm parola folosind saltul generat
        this.password = await bcrypt.hash(this.password, salt);
        next(); // Mergem mai departe cu salvarea
    } catch (err) {
        next(err); // Pasăm eroarea mai departe
    }
});

// --- Metodă pentru a compara parolele (la autentificare) ---
// Adăugăm o metodă la schema User pentru a verifica dacă o parolă dată
// corespunde parolei criptate din baza de date.
UserSchema.methods.matchPassword = async function(enteredPassword) {
    // Comparăm parola introdusă cu parola criptată
    return await bcrypt.compare(enteredPassword, this.password);
};

// Exportăm modelul User bazat pe schema definită
module.exports = mongoose.model('User', UserSchema);

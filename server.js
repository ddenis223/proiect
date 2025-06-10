// server.js

// Importă modulele necesare
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User'); // Importă modelul User

// Încarcă variabilele de mediu din fișierul .env
dotenv.config();

// Creează o instanță a aplicației Express
const app = express();

// --- Conectarea la Baza de Date MongoDB ---
const mongoURI = process.env.MONGO_URI; // Folosim doar variabila de mediu, fara fallback la localhost

const connectDB = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Conectat la MongoDB');

        // --- Pornirea Serverului - MUTATĂ AICI ---
        const PORT = process.env.PORT || 10000; // Render foloseste portul 10000 intern
        app.listen(PORT, () => {
            console.log(`🚀 Server pornit pe http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('❌ Eroare MongoDB: Nu s-a putut conecta la baza de date. Verificați MONGO_URI și Network Access în Atlas.');
        console.error('Detalii eroare: ' + err.message);
        process.exit(1); // Oprim procesul daca nu se poate conecta la baza de date
    }
};

// Apelăm funcția de conectare la baza de date și pornire a serverului
connectDB();

// --- Middleware-uri Express ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setează motorul de șabloane (view engine) la EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servește fișiere statice (CSS, JavaScript, imagini etc.) din directorul 'public'
app.use(express.static(path.join(__dirname, 'public')));


// --- Rutele Aplicației Tale ---

// Ruta principală (pagina de pornire)
app.get('/', (req, res) => {
    console.log('Ruta principală (/) a fost accesată!');
    res.render('index', { title: 'Pagina Principală' });
});

// Ruta pentru pagina de autentificare (login) - GET (afișează formularul)
app.get('/login', (req, res) => {
    console.log('Ruta /login (GET) a fost accesată!');
    res.render('login', { title: 'Autentificare', errorMessage: null });
});

// Ruta pentru pagina de înregistrare (register) - GET (afișează formularul)
app.get('/register', (req, res) => {
    console.log('Ruta /register (GET) a fost accesată!');
    res.render('register', { title: 'Înregistrare', errorMessage: null });
});

// Ruta pentru pagina de bord (dashboard) - necesită autentificare în aplicație reală
app.get('/dashboard', (req, res) => {
    console.log('Ruta /dashboard a fost accesată!');
    res.render('dashboard', { title: 'Panou de Control' });
});

// --- Rute POST pentru Autentificare și Înregistrare ---

// Ruta POST pentru înregistrarea unui nou utilizator
app.post('/register', async (req, res) => {
    console.log('Ruta /register (POST) a fost accesată!');
    const { username, email, password } = req.body;

    // Validări simple (puteți adăuga validări mai complexe aici)
    if (!username || !email || !password) {
        return res.status(400).render('register', {
            title: 'Înregistrare',
            errorMessage: 'Toate câmpurile sunt obligatorii!'
        });
    }

    try {
        // Verificăm dacă există deja un utilizator cu acest email sau username
        let userByEmail = await User.findOne({ email });
        if (userByEmail) {
            return res.status(400).render('register', {
                title: 'Înregistrare',
                errorMessage: 'Există deja un cont cu acest email.'
            });
        }
        let userByUsername = await User.findOne({ username });
        if (userByUsername) {
            return res.status(400).render('register', {
                title: 'Înregistrare',
                errorMessage: 'Numele de utilizator este deja folosit.'
            });
        }

        // Creăm un nou utilizator (parola va fi criptată automat de middleware-ul din User.js)
        const user = new User({
            username,
            email,
            password
        });

        await user.save(); // Salvăm utilizatorul în baza de date
        // LINIA CORECTATĂ AICI:
        console.log(`Utilizator înregistrat: <span class="math-inline">\{username\} \(</span>{email})`);

        // Redirecționăm la pagina de autentificare după înregistrare reușită
        res.redirect('/login'); // Utilizatorul se poate autentifica acum
    } catch (err) {
        console.error('Eroare la înregistrare:', err.message);
        res.status(500).render('register', {
            title: 'Înregistrare',
            errorMessage: 'Eroare la înregistrare. Vă rugăm să încercați din nou.'
        });
    }
});

// Ruta POST pentru autentificarea utilizatorului (logare)
app.post('/login', async (req, res) => {
    console.log('Ruta /login (POST) a fost accesată!');
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render('login', {
            title: 'Autentificare',
            errorMessage: 'Ambele câmpuri sunt obligatorii!'
        });
    }

    try {
        // Căutăm utilizatorul după email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).render('login', {
                title: 'Autentificare',
                errorMessage: 'Email sau parolă incorectă.'
            });
        }

        // Verificăm parola criptată
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).render('login', {
                title: 'Autentificare',
                errorMessage: 'Email sau parolă incorectă.'
            });
        }

        // --- AICI VEI ADĂUGA LOGICA DE SESIUNE SAU JWT PENTRU A MENȚINE UTILIZATORUL LOGAT ---
        // Momentan, doar redirecționăm la dashboard la succes
        console.log(`Utilizator autentificat: ${user.username}`);
        res.redirect('/dashboard'); // Redirecționează la dashboard după autentificare reușită

    } catch (err) {
        console.error('Eroare la autentificare:', err.message);
        res.status(500).render('login', {
            title: 'Autentificare',
            errorMessage: 'Eroare la autentificare. Vă rugăm să încercați din nou.'
        });
    }
});


// --- Gestionarea erorilor și a rutelor nedefinite (404 Not Found) ---
app.use((req, res, next) => {
    console.log(`Eroare 404: Ruta ${req.originalUrl} nu a fost găsită.`);
    res.status(404).render('404', { title: 'Pagina Nu A Fost Găsită' });
});

// server.js

// Importă modulele necesare
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session'); // NOU: Importă express-session
const MongoStore = require('connect-mongo'); // NOU: Pentru a stoca sesiunile în MongoDB

const User = require('./models/User'); // Importă modelul User

// Încarcă variabilele de mediu din fișierul .env
dotenv.config();

// Creează o instanță a aplicației Express
const app = express();

// --- Conectarea la Baza de Date MongoDB ---
const mongoURI = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Conectat la MongoDB');

        // --- Configurare Sesiune NOU: Stochează sesiunile în MongoDB ---
        app.use(session({
            secret: process.env.SESSION_SECRET, // Folosește o variabilă de mediu pentru secret
            resave: false, // Nu salvează sesiunea dacă nu a fost modificată
            saveUninitialized: false, // Nu creează o sesiune până nu e necesar
            store: MongoStore.create({
                mongoUrl: mongoURI,
                collectionName: 'sessions', // Numele colecției unde vor fi stocate sesiunile
                ttl: 14 * 24 * 60 * 60 // Durata de viață a sesiunii în secunde (14 zile)
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 14, // Durata de viață a cookie-ului (14 zile)
                secure: process.env.NODE_ENV === 'production' // Folosește cookie-uri sigure (HTTPS) în producție
            }
        }));

        // Middleware pentru a adăuga datele de sesiune în variabilele locale ale șabloanelor EJS
        app.use((req, res, next) => {
            res.locals.isAuthenticated = req.session.userId ? true : false;
            res.locals.username = req.session.username || null;
            next();
        });

        // --- Pornirea Serverului - MUTATĂ AICI ---
        const PORT = process.env.PORT || 10000; // Render folosește portul 10000 intern
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


// --- Middleware pentru protejarea rutelor ---
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        // Dacă utilizatorul nu este autentificat, redirecționează-l la pagina de login
        return res.redirect('/login');
    }
    next(); // Dacă este autentificat, continuă la ruta cerută
};


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

// Ruta pentru pagina de bord (dashboard) - acum este protejată!
app.get('/dashboard', isAuthenticated, (req, res) => { // NOU: Folosim middleware-ul isAuthenticated
    console.log('Ruta /dashboard a fost accesată de utilizatorul autentificat!');
    res.render('dashboard', { title: 'Panou de Control' });
});

// Ruta de deconectare (logout) NOU!
app.get('/logout', (req, res) => {
    req.session.destroy(err => { // Distruge sesiunea
        if (err) {
            console.error('Eroare la deconectare:', err);
            return res.status(500).send('Eroare la deconectare.');
        }
        res.redirect('/'); // Redirecționează la pagina principală
    });
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
        console.log(`Utilizator înregistrat: ${username} (${email})`);

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

        // --- NOU: Salvăm ID-ul utilizatorului și username-ul în sesiune la autentificare reușită ---
        req.session.userId = user._id;
        req.session.username = user.username;
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

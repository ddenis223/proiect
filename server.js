// server.js

// Importă modulele necesare
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const User = require('./models/User'); // Importă modelul User

// Încarcă variabilele de mediu din fișierul .env
dotenv.config();

// Creează o instanță a aplicației Express
const app = express();

// --- Middleware-uri Express (MUTATE MAI SUS PENTRU A FI ACCESIBILE) ---
// Acestea trebuie să fie definite înainte ca serverul să pornească ascultarea.
app.use(express.json()); // Pentru a parsa cererile cu JSON body
app.use(express.urlencoded({ extended: false })); // Pentru a parsa cererile cu URL-encoded body (formulare)

// Setează motorul de șabloane (view engine) la EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servește fișiere statice (CSS, JavaScript, imagini etc.) din directorul 'public'
app.use(express.static(path.join(__dirname, 'public')));


// --- Conectarea la Baza de Date MongoDB ---
const mongoURI = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Conectat la MongoDB');

        // --- Configurare Sesiune NOU: Stochează sesiunile în MongoDB ---
        // Acest middleware depinde de conexiunea la MongoDB, deci rămâne aici.
        app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({
                mongoUrl: mongoURI,
                collectionName: 'sessions',
                ttl: 14 * 24 * 60 * 60
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 14,
                secure: process.env.NODE_ENV === 'production'
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
        process.exit(1);
    }
};

// Apelăm funcția de conectare la baza de date și pornire a serverului
connectDB();


// --- Middleware pentru protejarea rutelor ---
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
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
app.get('/dashboard', isAuthenticated, (req, res) => {
    console.log('Ruta /dashboard a fost accesată de utilizatorul autentificat!');
    res.render('dashboard', { title: 'Panou de Control' });
});

// Ruta de deconectare (logout)
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Eroare la deconectare:', err);
            return res.status(500).send('Eroare la deconectare.');
        }
        res.redirect('/');
    });
});

// --- Rute pentru Recuperare Parolă ---

// Ruta GET pentru pagina "Am uitat parola?"
app.get('/forgot-password', (req, res) => {
    console.log('Ruta /forgot-password (GET) a fost accesată!');
    res.render('forgot-password', { title: 'Am uitat parola?', message: null, error: null });
});

// Ruta POST pentru trimiterea cererii de resetare a parolei (simulată)
app.post('/forgot-password', async (req, res) => {
    console.log('Ruta /forgot-password (POST) a fost accesată!');
    const { email } = req.body;

    if (!email) {
        return res.status(400).render('forgot-password', {
            title: 'Am uitat parola?',
            message: null,
            error: 'Vă rugăm să introduceți adresa de email.'
        });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('forgot-password', {
                title: 'Am uitat parola?',
                message: 'Dacă adresa de email există, un link de resetare a fost trimis.',
                error: null
            });
        }

        // TODO: Generați un token de resetare și data de expirare
        // const resetToken = crypto.randomBytes(32).toString('hex');
        // user.resetPasswordToken = resetToken;
        // user.resetPasswordExpires = Date.now() + 3600000; // 1 oră
        // await user.save();

        // TODO: Trimiteți emailul cu link-ul de resetare
        // const transporter = nodemailer.createTransport({ ... });
        // const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
        // await transporter.sendMail({
        //     to: user.email,
        //     from: 'noreply@yourdomain.com',
        //     subject: 'Resetare parolă pentru Trabajo Fácil',
        //     html: `<p>Ați cerut resetarea parolei pentru contul dumneavoastră.</p>
        //            <p>Faceți click pe acest link pentru a reseta parola: <a href="${resetUrl}">${resetUrl}</a></p>
        //            <p>Acest link este valabil o oră.</p>`
        // });

        console.log(`Link de resetare (simulat) trimis la: ${email}`);

        res.render('forgot-password', {
            title: 'Am uitat parola?',
            message: 'Dacă adresa de email există, un link de resetare a fost trimis.',
            error: null
        });

    } catch (err) {
        console.error('Eroare la cererea de resetare a parolei:', err.message);
        res.status(500).render('forgot-password', {
            title: 'Am uitat parola?',
            message: null,
            error: 'A apărut o eroare. Vă rugăm să încercați din nou.'
        });
    }
});

// Ruta GET pentru pagina de resetare a parolei (cu token)
app.get('/reset-password', async (req, res) => {
    console.log('Ruta /reset-password (GET) a fost accesată!');
    const { token } = req.query;

    if (!token) {
        return res.status(400).render('reset-password', {
            title: 'Resetare Parolă',
            error: 'Token de resetare invalid sau lipsă.',
            token: null
        });
    }

    try {
        // TODO: Verificați dacă token-ul există în baza de date și nu a expirat
        // const user = await User.findOne({
        //     resetPasswordToken: token,
        //     resetPasswordExpires: { $gt: Date.now() }
        // });

        // if (!user) {
        //     return res.status(400).render('reset-password', {
        //         title: 'Resetare Parolă',
        //         error: 'Token de resetare invalid sau expirat.',
        //         token: null
        //     });
        // }

        res.render('reset-password', {
            title: 'Resetare Parolă',
            error: null,
            token: token
        });

    } catch (err) {
        console.error('Eroare la accesarea paginii de resetare:', err.message);
        res.status(500).render('reset-password', {
            title: 'Resetare Parolă',
            error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
            token: null
        });
    }
});

// Ruta POST pentru trimiterea noii parole (simulată)
app.post('/reset-password', async (req, res) => {
    console.log('Ruta /reset-password (POST) a fost accesată!');
    const { token, password, confirmPassword } = req.body;

    if (!password || !confirmPassword || password !== confirmPassword) {
        return res.status(400).render('reset-password', {
            title: 'Resetare Parolă',
            error: 'Parolele nu se potrivesc sau sunt goale.',
            token: token
        });
    }

    try {
        // TODO: Găsiți utilizatorul după token și verificați expirarea
        // const user = await User.findOne({
        //     resetPasswordToken: token,
        //     resetPasswordExpires: { $gt: Date.now() }
        // });

        // if (!user) {
        //     return res.status(400).render('reset-password', {
        //         title: 'Resetare Parolă',
        //         error: 'Token de resetare invalid sau expirat.',
        //         token: null
        //     });
        // }

        // TODO: Criptați și salvați noua parolă
        // user.password = password;
        // user.resetPasswordToken = undefined;
        // user.resetPasswordExpires = undefined;
        // await user.save();

        console.log(`Parolă resetată (simulat) pentru token: ${token}`);

        res.render('login', {
            title: 'Autentificare',
            errorMessage: 'Parola a fost resetată cu succes! Vă puteți autentifica acum.',
            message: null
        });

    } catch (err) {
        console.error('Eroare la resetarea parolei:', err.message);
        res.status(500).render('reset-password', {
            title: 'Resetare Parolă',
            error: 'A apărut o eroare la resetarea parolei. Vă rugăm să încercați din nou.',
            token: token
        });
    }
});


// --- Rute POST pentru Autentificare și Înregistrare (existente) ---

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

        await user.save();
        console.log(`Utilizator înregistrat: ${username} (${email})`);

        res.redirect('/login');
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
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).render('login', {
                title: 'Autentificare',
                errorMessage: 'Email sau parolă incorectă.'
            });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).render('login', {
                title: 'Autentificare',
                errorMessage: 'Email sau parolă incorectă.'
            });
        }

        req.session.userId = user._id;
        req.session.username = user.username;
        console.log(`Utilizator autentificat: ${user.username}`);
        
        res.redirect('/dashboard');

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

// script.js

// --- Cod JavaScript pentru Meniul Hamburger (adaugă-l la sfârșitul fișierului) ---
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerButton = document.querySelector('.hamburger-menu');
    const mainNav = document.querySelector('.main-nav');

    if (hamburgerButton && mainNav) {
        hamburgerButton.addEventListener('click', () => {
            hamburgerButton.classList.toggle('active'); // Animația X pentru hamburger
            mainNav.classList.toggle('active'); // Afișează/ascunde meniul
        });

        // Opțional: închide meniul când se dă click pe un link (pe mobil)
        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav.classList.contains('active')) { // Doar dacă meniul e deschis
                    hamburgerButton.classList.remove('active');
                    mainNav.classList.remove('active');
                }
            });
        });
    }
});

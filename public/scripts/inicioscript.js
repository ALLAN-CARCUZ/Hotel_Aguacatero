document.addEventListener('DOMContentLoaded', function() {
    const username = localStorage.getItem('username');
    const authMenu = document.getElementById('authMenu');
    const loginSection = document.querySelector('.auth-section');
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const userGreeting = document.getElementById('userGreeting');
    const userDropdown = document.getElementById('userDropdown');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const logoutLink = document.getElementById('logoutLink');

    if (username) {
        // Mostrar menú desplegable para el usuario autenticado
        authMenu.style.display = 'inline-block';
        userGreeting.textContent = `Hola, ${username}!`;
        registerBtn.style.display = 'none';
        loginBtn.style.display = 'none';

        // Mostrar el dropdown al hacer clic en "Mi Cuenta"
        userDropdown.addEventListener('click', function() {
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });

        // Funcionalidad para cerrar sesión
        logoutLink.addEventListener('click', function() {
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Cerrar el menú si se hace clic fuera de él
        window.onclick = function(event) {
            if (!event.target.matches('.dropdown-toggle')) {
                dropdownMenu.style.display = 'none';
            }
        };
    } else {
        // Mostrar los botones de "Iniciar Sesión" y "Registrarse" cuando no hay sesión
        authMenu.style.display = 'none';
        registerBtn.style.display = 'inline-block';
        loginBtn.style.display = 'inline-block';
    }
});

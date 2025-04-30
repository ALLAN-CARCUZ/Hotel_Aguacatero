document.addEventListener('DOMContentLoaded', () => {
    const authButton = document.querySelector('.auth-button');
    const registerButton = document.querySelector('.register-button');
    const userGreeting = document.getElementById('userGreeting');
    const rol = localStorage.getItem('rol');
    const username = localStorage.getItem('username');

    // Si hay un nombre de usuario almacenado, ocultar botones de autenticación y mostrar saludo
    if (username) {
        authButton.textContent = 'Cerrar Sesión';
        authButton.style.display = 'block';
        registerButton.style.display = 'none';
        userGreeting.textContent = `Hola, ${username}`;
    } else {
        authButton.textContent = 'Iniciar Sesión';
        registerButton.style.display = 'block';
        userGreeting.textContent = '';
    }

    authButton.addEventListener('click', () => {
        if (username) {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('rol');
            window.location.href = 'login.html';
        } else {
            window.location.href = 'login.html';
        }
    });

    // Función para ocultar botones de admin si el rol no es "admin"
    function manageAdminButtons() {
        const botonesAdmin = document.querySelectorAll('.admin-only');
        if (rol === 'admin') {
            botonesAdmin.forEach(boton => {
                boton.style.display = 'inline-block';
            });
        } else {
            botonesAdmin.forEach(boton => {
                boton.style.display = 'none';
            });
        }
    }

    manageAdminButtons();
});

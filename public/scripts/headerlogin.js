document.addEventListener('DOMContentLoaded', function() {
    // Cargar el contenido del header
    fetch('headerlogin.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('header').innerHTML = data;

            // Ejecutar el script para manejar la autenticación
            const username = localStorage.getItem('username');
            const authMenu = document.getElementById('authMenu');
            const registerBtn = document.getElementById('registerBtn');
            const loginBtn = document.getElementById('loginBtn');
            const userGreeting = document.getElementById('userGreeting');
            const userDropdown = document.getElementById('userDropdown');
            const dropdownMenu = document.getElementById('dropdownMenu');
            const logoutLink = document.getElementById('logoutLink');

            if (username) {
                authMenu.style.display = 'inline-block';
                userGreeting.textContent = `Hola, ${username}!`;
                registerBtn.style.display = 'none';
                loginBtn.style.display = 'none';

                userDropdown.addEventListener('click', function() {
                    dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
                });

                logoutLink.addEventListener('click', function() {
                    localStorage.clear();
                    window.location.href = 'login.html';
                });

                window.onclick = function(event) {
                    if (!event.target.matches('.dropdown-toggle')) {
                        dropdownMenu.style.display = 'none';
                    }
                };
            } else {
                authMenu.style.display = 'none';
                registerBtn.style.display = 'inline-block';
                loginBtn.style.display = 'inline-block';
            }
        });
});

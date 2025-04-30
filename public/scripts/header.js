document.addEventListener('DOMContentLoaded', function() {
    // Cargar el contenido del header
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('header').innerHTML = data;

            // Obtener elementos del header
            const username = localStorage.getItem('username');
            const rolUsuario = localStorage.getItem('rol'); // Asume que el rol está almacenado en localStorage
            const authMenu = document.getElementById('authMenu');
            const registerBtn = document.getElementById('registerBtn');
            const loginBtn = document.getElementById('loginBtn');
            const userGreeting = document.getElementById('userGreeting');
            const userDropdown = document.getElementById('userDropdown');
            const dropdownMenu = document.getElementById('dropdownMenu');
            const logoutLink = document.getElementById('logoutLink');
            const graficaTab = document.querySelector('a[href="grafica.html"]'); // Selector para la pestaña de Gráficas

            // Mostrar/ocultar la pestaña de Gráficas basado en el rol
            if (rolUsuario !== 'admin' && graficaTab) {
                graficaTab.style.display = 'none'; // Oculta "Gráficas" si el usuario no es admin
            }

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
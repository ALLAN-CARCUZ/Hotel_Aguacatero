document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/usuarios/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            // Almacenar el token y el nombre de usuario en localStorage
            localStorage.setItem('token', result.token);
            localStorage.setItem('username', result.username || 'Usuario');

            

            // Decodificar el token para obtener el rol del usuario y el tiempo de expiración
            const decodedToken = parseJwt(result.token);
            localStorage.setItem('rol', decodedToken.rol);  // Guardamos el rol en localStorage
            localStorage.setItem('userId', decodedToken.id || decodedToken.userId); // Guardamos el userId en localStorage

            // Depuración: verificar si se almacenan correctamente
            console.log("Token guardado en localStorage: ", result.token);
            console.log("Rol guardado en localStorage: ", decodedToken.rol);
            console.log("userId guardado en localStorage:", decodedToken.id || decodedToken.userId);

            // Calcular el tiempo de expiración en milisegundos
            const expirationTime = decodedToken.exp * 1000 - Date.now();

            // Establecer un temporizador para cerrar sesión cuando el token expire
            setTimeout(() => {
                alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                logoutUser();
            }, expirationTime);

            alert('Inicio de sesión exitoso');
            window.location.href = 'inicio.html'; 
        } else {
            document.getElementById('messageBox').innerText = `Error: ${result.message}`;
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        document.getElementById('messageBox').innerText = 'Error al procesar la solicitud.';
    }
});

// Función para decodificar el token JWT
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Función para cerrar sesión
function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('rol');
    localStorage.removeItem('userId'); // Asegurarse de eliminar el userId en el cierre de sesión
    window.location.href = 'login.html';
}

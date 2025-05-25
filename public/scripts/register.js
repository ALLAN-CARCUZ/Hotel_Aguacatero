document.getElementById('usuarioForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const pais = document.getElementById('pais').value;  // Capturar el valor del país seleccionado

    // Agregar un log para verificar si el país se captura correctamente
    console.log('País seleccionado en el frontend:', pais);  

    try {
        const response = await fetch('https://hotelaguacatero-production.up.railway.app/api/usuarios/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, apellido, email, password, pais })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Usuario registrado exitosamente');
            window.location.href = 'servicio.html'; // Redirigir a la página principal después de registrarse
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
    }
});

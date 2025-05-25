//scripthabitacion.js
document.addEventListener('DOMContentLoaded', () => {
    const rol = localStorage.getItem('rol');
    if (rol === 'admin') {
        document.getElementById('openRegisterModal').style.display = 'block';
    }
});

// Función para abrir el popup (tanto registro como actualización)
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

// Función para cerrar el popup
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Añadir el evento para abrir el popup de registro
document.getElementById('openRegisterModal').addEventListener('click', () => openModal('registerModal'));

// Añadir el evento para cerrar el popup de registro
document.getElementById('closeRegisterModal').addEventListener('click', () => closeModal('registerModal'));

// Añadir el evento para cerrar el popup de actualización
document.getElementById('closeUpdateModal').addEventListener('click', () => closeModal('updateModal'));


// Función para cargar las habitaciones y mostrarlas en la lista

async function loadHabitaciones() {
    try {
        const response = await fetch('https://hotelaguacatero-production.up.railway.app/api/habitaciones');
        const habitaciones = await response.json();

        // Obtener el rol del usuario desde localStorage
        const rol = localStorage.getItem('rol');

        // Limpiar la lista antes de mostrar las habitaciones
        const habitacionList = document.getElementById('habitacionList');
        habitacionList.innerHTML = '';

        // Recorrer las habitaciones y agregarlas a la lista
        habitaciones.forEach(habitacion => {
            const li = document.createElement('li');
            
            // Estructura de la tarjeta de la habitación
            li.innerHTML = `
                <img src="data:image/jpeg;base64,${habitacion.imagen}" alt="${habitacion.nombre}">
                <strong>${habitacion.nombre}</strong>
                <p>${habitacion.descripcion}</p>
                <p class="price">Precio: $${habitacion.precio}</p>
            `;

            // Si el rol es admin, agregar los botones de Actualizar y Eliminar
            if (rol === 'admin') {

                // Botón para actualizar
                const updateBtn = document.createElement('button');
                updateBtn.textContent = 'Actualizar';
                updateBtn.classList.add('admin-only');

                // Evitar que el clic en "Actualizar" dispare el evento de reserva
                updateBtn.onclick = (e) => {
                    e.stopPropagation(); // Evita la redirección
                    // Crear el formulario de actualización
                    const updateForm = `
                        <label for="newNombre">Nuevo nombre:</label>
                        <input type="text" id="newNombre" value="${habitacion.nombre}"><br>

                        <label for="newDescripcion">Nueva descripción:</label>
                        <textarea id="newDescripcion">${habitacion.descripcion}</textarea><br>

                        <label for="newPrecio">Nuevo precio:</label>
                        <input type="number" id="newPrecio" step="0.01" value="${habitacion.precio}"><br>

                        <label for="currentImagen">Imagen actual:</label><br>
                        <img id="currentImagen" src="data:image/jpeg;base64,${habitacion.imagen}" width="100"><br><br>

                        <label for="newImagen">Nueva imagen (opcional):</label>
                        <input type="file" id="newImagen" accept="image/*"><br><br>

                        <button id="saveChanges">Guardar cambios</button>
                    `;

                    // Cargar el formulario en el contenedor del popup
                    document.getElementById('updateFormContainer').innerHTML = updateForm;
                    openModal('updateModal'); // Mostrar el popup

                    // Manejar el envío del formulario de actualización
                    document.getElementById('saveChanges').onclick = async () => {
                        // Obtener los nuevos valores del formulario
                        const newNombre = document.getElementById('newNombre').value;
                        const newDescripcion = document.getElementById('newDescripcion').value;
                        const newPrecio = document.getElementById('newPrecio').value;
                        const newImagenInput = document.getElementById('newImagen').files[0];

                        let imagenBase64 = habitacion.imagen; // Mantener la imagen actual si no se selecciona una nueva

                        // Si se selecciona una nueva imagen, convertirla a Base64
                        if (newImagenInput) {
                            const reader = new FileReader();
                            reader.readAsDataURL(newImagenInput);
                            reader.onload = async function () {
                                imagenBase64 = reader.result.split(',')[1];  // Extraer solo la parte en base64
                                await updateHabitacion(habitacion.id, newNombre, newDescripcion, newPrecio, imagenBase64);
                                closeModal('updateModal'); // Cerrar el popup después de actualizar
                            };
                            reader.onerror = function (error) {
                                console.error('Error al leer la nueva imagen:', error);
                            };
                        } else {
                            // Si no se seleccionó ninguna nueva imagen, actualizar sin cambiar la imagen
                            await updateHabitacion(habitacion.id, newNombre, newDescripcion, newPrecio, imagenBase64);
                            closeModal('updateModal'); // Cerrar el popup después de actualizar
                        }
                    };
                };
                li.appendChild(updateBtn);

                // Botón para eliminar
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Eliminar';
                deleteBtn.classList.add('admin-only');

                // Evitar que el clic en "Eliminar" dispare el evento de reserva
                deleteBtn.onclick = (e) => {
                    e.stopPropagation(); // Evita la redirección
                    if (confirm('¿Estás seguro de que deseas eliminar esta habitación?')) {
                        deleteHabitacion(habitacion.id);
                    }
                };
                li.appendChild(deleteBtn);
            }

            // Clic en la tarjeta redirige al wizard, solo si no es admin
            li.onclick = () => {
                if (rol !== 'admin') {
                    irAWizard(habitacion.id); // Redirigir al proceso de reserva
                }
            };

            habitacionList.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar las habitaciones:', error);
    }
}


//Redirección al archivo habitavión.html
function irAWizard(habitacionId) {
    window.location.href = `wizard.html?id=${habitacionId}`;
}

// Función para actualizar una habitación
async function updateHabitacion(id, nombre, descripcion, precio, imagen) {
    try {
        const response = await fetch(`/api/habitaciones/update/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, descripcion, precio, imagen })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Habitación actualizada exitosamente');
            loadHabitaciones(); // Recargar la lista de habitaciones
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error al actualizar la habitación:', error);
    }
}

// Función para eliminar una habitación
async function deleteHabitacion(id) {
    try {
        const response = await fetch(`/api/habitaciones/delete/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert('Habitación eliminada exitosamente');
            loadHabitaciones(); // Recargar la lista de habitaciones
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error al eliminar la habitación:', error);
    }
}

// Manejar el envío del formulario para agregar una nueva habitación
document.getElementById('habitacionForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const descripcion = document.getElementById('descripcion').value;
    const precio = document.getElementById('precio').value;
    const imagenInput = document.getElementById('imagen').files[0];  // Selecciona la primera imagen

    if (!nombre || !precio) { // Cambié la validación para que no dependa de la imagen obligatoriamente
        alert('Por favor, ingresa todos los campos requeridos.');
        return;
    }

    // Convertir la imagen a base64 si hay una imagen seleccionada
    const reader = new FileReader();
    if (imagenInput) {
        reader.readAsDataURL(imagenInput);
        reader.onload = async function () {
            const imagenBase64 = reader.result.split(',')[1];  // Extraer solo la parte de la imagen en base64
            await registrarHabitacion(nombre, descripcion, precio, imagenBase64);
        };
        reader.onerror = function (error) {
            console.error('Error al leer la imagen:', error);
            alert('Error al procesar la imagen.');
        };
    } else {
        // Si no hay imagen, registrar sin imagen
        await registrarHabitacion(nombre, descripcion, precio, null);
    }
});

async function registrarHabitacion(nombre, descripcion, precio, imagenBase64) {
    try {
        // Enviar los datos a la API
        const response = await fetch('https://hotelaguacatero-production.up.railway.app/api/habitaciones/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, descripcion, precio, imagen: imagenBase64 })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Habitación agregada exitosamente');
            document.getElementById('habitacionForm').reset(); // Limpiar el formulario
            loadHabitaciones(); // Recargar la lista de habitaciones
            
            // Aquí cerramos el modal de registro automáticamente
            closeModal('registerModal');
        } else {
            alert(`Error: ${result.error}`);
        }

    } catch (error) {
        console.error('Error al enviar la solicitud:', error);
        alert('Error al enviar los datos al servidor');
    }
}


// Cargar las habitaciones cuando se cargue la página
loadHabitaciones();
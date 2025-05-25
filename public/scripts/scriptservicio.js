const rol = localStorage.getItem('rol');

// Función para abrir el popup (tanto registro como actualización)
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

// Función para cerrar el popup
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Ocultar el botón de agregar servicio si el rol no es admin
document.getElementById('openRegisterModal').style.display = (rol === 'admin') ? 'block' : 'none';

// Agregar un EventListener para abrir el modal cuando se haga clic en el botón "Agregar Servicio"
document.getElementById('openRegisterModal').addEventListener('click', () => {
    openModal('registerModal'); // Llama a la función para abrir el modal de registro
});
// Añadir el evento para cerrar el popup de registro
document.getElementById('closeRegisterModal').addEventListener('click', () => closeModal('registerModal'));

// Añadir el evento para cerrar el popup de actualización
document.getElementById('closeUpdateModal').addEventListener('click', () => closeModal('updateModal'));

// Función para cargar los servicios y mostrarlos en la lista
async function loadServicios() {
    try {
        const response = await fetch('https://hotelaguacatero-production.up.railway.app/api/servicios');
        const servicios = await response.json();

        // Limpiar la lista antes de mostrar los servicios
        const servicioList = document.getElementById('servicioList');
        servicioList.innerHTML = '';

        // Recorrer los servicios y agregarlos a la lista
        servicios.forEach(servicio => {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="data:image/jpeg;base64,${servicio.imagen}" alt="${servicio.nombre}">
                <strong>${servicio.nombre}</strong>
                <p>${servicio.descripcion}</p>
                <p class="price">Costo: $${servicio.costo}</p>
            `;


            if (rol === 'admin') {
            // Botón para actualizar
            const updateBtn = document.createElement('button');
            updateBtn.textContent = 'Actualizar';
            updateBtn.onclick = () => {
                // Crear el formulario de actualización
                const updateForm = `
                    <label for="newNombre">Nuevo nombre:</label>
                    <input type="text" id="newNombre" value="${servicio.nombre}"><br>

                    <label for="newDescripcion">Nueva descripción:</label>
                    <textarea id="newDescripcion">${servicio.descripcion}</textarea><br>

                    <label for="newCosto">Nuevo costo:</label>
                    <input type="number" id="newCosto" step="0.01" value="${servicio.costo}"><br>

                    <label for="currentImagen">Imagen actual:</label><br>
                    <img id="currentImagen" src="data:image/jpeg;base64,${servicio.imagen}" width="100"><br><br>

                    <label for="newImagen">Nueva imagen (opcional):</label>
                    <input type="file" id="newImagen" accept="image/*"><br><br>

                    <button id="saveChanges">Guardar cambios</button>
                `;

                // Cargar el formulario en el contenedor del popup
                document.getElementById('updateFormContainer').innerHTML = updateForm;
                openModal('updateModal'); // Mostrar el popup

                // Manejar el envío del formulario de actualización
                document.getElementById('saveChanges').onclick = async () => {
                    const newNombre = document.getElementById('newNombre').value;
                    const newDescripcion = document.getElementById('newDescripcion').value;
                    const newCosto = document.getElementById('newCosto').value;
                    const newImagenInput = document.getElementById('newImagen').files[0];

                    let imagenBase64 = servicio.imagen;

                    // Si se selecciona una nueva imagen
                    if (newImagenInput) {
                        const reader = new FileReader();
                        reader.readAsDataURL(newImagenInput);
                        reader.onload = async function () {
                            imagenBase64 = reader.result.split(',')[1];  // Extraer solo la parte en base64
                            await updateServicio(servicio.id, newNombre, newDescripcion, newCosto, imagenBase64);
                            closeModal('updateModal');
                        };
                        reader.onerror = function (error) {
                            console.error('Error al leer la nueva imagen:', error);
                        };
                    } else {
                        // Si no se seleccionó una nueva imagen
                        await updateServicio(servicio.id, newNombre, newDescripcion, newCosto, imagenBase64);
                        closeModal('updateModal');
                    }
                };
            };
            li.appendChild(updateBtn);

            // Botón para eliminar
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.classList.add('delete');
            deleteBtn.onclick = () => {
                if (confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
                    deleteServicio(servicio.id);
                }
            };
            li.appendChild(deleteBtn);
            }
            servicioList.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar los servicios:', error);
    }
}

// Función para actualizar un servicio
async function updateServicio(id, nombre, descripcion, costo, imagen) {
    try {
        const response = await fetch(`https://hotelaguacatero-production.up.railway.app/api/servicios/update/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, descripcion, costo, imagen })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Servicio actualizado exitosamente');
            loadServicios(); // Recargar la lista de servicios
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error al actualizar el servicio:', error);
    }
}

// Función para eliminar un servicio
async function deleteServicio(id) {
    try {
        const response = await fetch(`https://hotelaguacatero-production.up.railway.app/api/servicios/delete/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert('Servicio eliminado exitosamente');
            loadServicios(); // Recargar la lista de servicios
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error al eliminar el servicio:', error);
    }
}

// Manejar el envío del formulario para agregar un nuevo servicio
document.getElementById('servicioForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const descripcion = document.getElementById('descripcion').value;
    const costo = document.getElementById('costo').value;
    const imagenInput = document.getElementById('imagen').files[0];  // Selecciona la primera imagen

    if (!nombre || !costo) {
        alert('Por favor, ingresa todos los campos requeridos.');
        return;
    }

    // Convertir la imagen a base64 si hay una imagen seleccionada
    const reader = new FileReader();
    if (imagenInput) {
        reader.readAsDataURL(imagenInput);
        reader.onload = async function () {
            const imagenBase64 = reader.result.split(',')[1];  // Extraer solo la parte de la imagen en base64
            await registrarServicio(nombre, descripcion, costo, imagenBase64);
        };
        reader.onerror = function (error) {
            console.error('Error al leer la imagen:', error);
            alert('Error al procesar la imagen.');
        };
    } else {
        await registrarServicio(nombre, descripcion, costo, null);
    }
});

async function registrarServicio(nombre, descripcion, costo, imagenBase64) {
    try {
        const response = await fetch('https://hotelaguacatero-production.up.railway.app/api/servicios/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, descripcion, costo, imagen: imagenBase64 })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Servicio agregado exitosamente');
            document.getElementById('servicioForm').reset(); // Limpiar el formulario
            loadServicios(); // Recargar la lista de servicios
            
            closeModal('registerModal');
        } else {
            alert(`Error: ${result.error}`);
        }

    } catch (error) {
        console.error('Error al enviar la solicitud:', error);
        alert('Error al enviar los datos al servidor');
    }
}

// Cargar los servicios cuando se cargue la página
loadServicios();

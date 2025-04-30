// scriptpaquete.js

// Variables para almacenar los precios de habitaciones y servicios
let preciosHabitaciones = {};
let preciosServicios = {};

// Obtener el rol del usuario desde localStorage
const rol = localStorage.getItem('rol');

// Función para abrir el popup (tanto registro como actualización)
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

// Función para cerrar el popup
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Ocultar el botón de agregar paquete si el rol no es admin
document.getElementById('openRegisterModal').style.display = (rol === 'admin') ? 'block' : 'none';


// Añadir eventos para abrir y cerrar los popups
document.getElementById('openRegisterModal').addEventListener('click', () => openModal('registerModal'));
document.getElementById('closeRegisterModal').addEventListener('click', () => closeModal('registerModal'));
document.getElementById('closeUpdateModal').addEventListener('click', () => closeModal('updateModal'));

// Función para calcular el precio total
function calcularPrecioTotal(event) {
    let formElement;
    if (event && event.target) {
        formElement = event.target.closest('form');
    } else {
        // Determinar qué formulario está abierto actualmente
        if (document.getElementById('registerModal').style.display === 'flex') {
            formElement = document.getElementById('paqueteForm');
        } else if (document.getElementById('updateModal').style.display === 'flex') {
            formElement = document.getElementById('updatePaqueteForm');
        } else {
            return; // No hay formulario abierto
        }
    }

    const habitacionSelect = formElement.querySelector('select[name="habitacion_id"], select[name="updateHabitacion_id"]');
    const serviciosSeleccionados = Array.from(formElement.querySelectorAll('input[name="servicios"]:checked, input[name="updateServicios"]:checked'));
    let precioTotal = 0;

    // Obtener el precio de la habitación seleccionada
    const habitacionId = habitacionSelect ? habitacionSelect.value : null;
    if (habitacionId && preciosHabitaciones[habitacionId]) {
        precioTotal += preciosHabitaciones[habitacionId];
    }

    // Sumar los precios de los servicios seleccionados
    serviciosSeleccionados.forEach(servicio => {
        const servicioId = servicio.value;
        if (preciosServicios[servicioId]) {
            precioTotal += preciosServicios[servicioId];
        }
    });

    // **Nuevo: Obtener el descuento ingresado**
    const descuentoInput = formElement.querySelector('input[name="descuento"], input[name="updateDescuento"]');
    const descuento = descuentoInput ? parseFloat(descuentoInput.value) || 0 : 0;

    // **Nuevo: Calcular el precio con descuento**
    const precioConDescuento = precioTotal - (precioTotal * (descuento / 100));

    // Actualizar el campo de precio total en el formulario actual
    const precioInput = formElement.querySelector('input[name="precioTotal"], input[name="updatePrecio"]');
    if (precioInput) {
        precioInput.value = `$${precioTotal.toFixed(2)}`;
    }
}

// Función para cargar habitaciones y servicios en el formulario de registro
async function cargarDatosFormulario() {
    try {
        const response = await fetch('/api/paquetes/datos/formulario');
        const { habitaciones, servicios } = await response.json();

        // Cargar habitaciones en el select
        const habitacionSelect = document.getElementById('habitacion_id');

        // **Corregido: Limpiar las opciones existentes antes de agregar nuevas**
        habitacionSelect.innerHTML = '';

        // Añadir una opción vacía al principio
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Seleccione una habitación';
        habitacionSelect.appendChild(defaultOption);

        habitaciones.forEach(habitacion => {
            const option = document.createElement('option');
            option.value = habitacion.id;
            option.textContent = `${habitacion.nombre} - $${habitacion.precio}`;
            preciosHabitaciones[habitacion.id] = habitacion.precio;
            habitacionSelect.appendChild(option);
        });

        // Añadir evento para recalcular el precio al cambiar de habitación
        habitacionSelect.addEventListener('change', function(event) {
            calcularPrecioTotal(event);
        });

        // Cargar servicios en los checkboxes
        const serviciosContainer = document.getElementById('serviciosContainer');
        servicios.forEach(servicio => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'servicios';
            checkbox.value = servicio.id;
            preciosServicios[servicio.id] = servicio.costo;

            checkbox.addEventListener('change', function(event) {
                calcularPrecioTotal(event);
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(`${servicio.nombre} - $${servicio.costo}`));
            serviciosContainer.appendChild(label);
        });

        // Inicializar el precio total a cero
        calcularPrecioTotal({ target: document.getElementById('paqueteForm') });

        // Obtener el input de descuento y añadir el event listener
        const descuentoInput = document.getElementById('descuento');
        descuentoInput.addEventListener('input', function(event) {
        calcularPrecioTotal(event);
        });


    } catch (error) {
        console.error('Error al cargar habitaciones y servicios:', error);
    }
}

function redirigirAReservacion(idPaquete) {
    // Redirigir a la página de reservaciones con el ID del paquete en la URL
    window.location.href = `/wizard.html?paquete_id=${idPaquete}`;
}


// Función para cargar los paquetes y mostrarlos en la lista
async function loadPaquetes() {
    try {
        const response = await fetch('/api/paquetes');
        const paquetes = await response.json();

        const paqueteList = document.getElementById('paqueteList');
        paqueteList.innerHTML = '';

        paquetes.forEach(paquete => {
            const descuento = paquete.descuento || 0;
            const precioOriginal = paquete.precio;
            const precioConDescuento = precioOriginal - (precioOriginal * (descuento / 100));

            const li = document.createElement('li');
            li.innerHTML = `
                <img src="data:image/jpeg;base64,${paquete.imagen}" alt="${paquete.nombre}">
                <strong>${paquete.nombre}</strong>
                <p>${paquete.descripcion}</p>
                <p class="price">
                    ${descuento > 0 ? `<span style="text-decoration: line-through;">$${precioOriginal.toFixed(2)}</span> - $${precioConDescuento.toFixed(2)}` : `$${precioOriginal.toFixed(2)}`}
                </p>
                <p>Habitación: ${paquete.habitacion_nombre}</p>
                <p>Servicios: ${paquete.servicios.map(s => s.nombre).join(', ')}</p>
            `;

            // Modificación: Agregar evento para redirigir a la página de reservación
            li.addEventListener('click', (event) => {
                // Solo redirige si el clic no fue en un botón
                if (event.target.tagName !== 'BUTTON') {
                    redirigirAReservacion(paquete.id);
                }
            });
            

            if (rol === 'admin') {
                const updateBtn = document.createElement('button');
                updateBtn.textContent = 'Actualizar';
                updateBtn.onclick = () => {

                // Crear el formulario de actualización
                const updateForm = `
                    <form id="updatePaqueteForm">
                    <label for="updateNombre">Nombre:</label>
                    <input type="text" id="updateNombre" name="updateNombre" value="${paquete.nombre}" required><br>

                    <label for="updateDescripcion">Descripción:</label>
                    <textarea id="updateDescripcion" name="updateDescripcion" required>${paquete.descripcion}</textarea><br>

                    <label for="updatePrecio">Precio Total:</label>
                    <input type="text" id="updatePrecio" name="updatePrecio" readonly><br>

                    <!-- Agrega el campo de descuento aquí -->
                    <label for="updateDescuento">Descuento (%):</label>
                    <input type="number" id="updateDescuento" name="updateDescuento" min="0" max="100" value="${paquete.descuento || 0}"><br>

                    <label for="updatePrecio">Precio Total:</label>
                    <input type="text" id="updatePrecio" name="updatePrecio" readonly><br>

                    <label for="updateHabitacion_id">Habitación:</label>
                    <select id="updateHabitacion_id" name="updateHabitacion_id" required>
                    <!-- Las opciones de habitaciones se cargarán aquí -->
                    </select><br>

                    <label>Servicios:</label>
                    <div id="updateServiciosContainer">
                    <!-- Los checkboxes de servicios se cargarán aquí -->
                    </div>

                    <label for="currentImagen">Imagen actual:</label><br>
                    <img id="currentImagen" src="data:image/jpeg;base64,${paquete.imagen}" width="100"><br><br>

                    <label for="newImagen">Nueva imagen (opcional):</label>
                    <input type="file" id="newImagen" name="newImagen" accept="image/*"><br><br>

                    <button type="submit">Guardar cambios</button>
                    </form>
                    `;

                // Cargar el formulario en el contenedor del popup
                document.getElementById('updateFormContainer').innerHTML = updateForm;

                // Cargar habitaciones y servicios en el formulario de actualización
                cargarDatosFormularioActualizacion(paquete);

                openModal('updateModal'); // Mostrar el popup

                // Manejar el envío del formulario de actualización
                document.getElementById('updatePaqueteForm').onsubmit = async function(e) {
                    // Obtener el descuento ingresado
                const descuento = parseFloat(document.getElementById('updateDescuento').value) || 0;

                    e.preventDefault();

                    // Obtener los nuevos valores del formulario
                    const newNombre = document.getElementById('updateNombre').value;
                    const newDescripcion = document.getElementById('updateDescripcion').value;

                    // Limpiar el valor del precio para eliminar el símbolo de dólar
                    const precioTotalStr = document.getElementById('updatePrecio').value;
                    

                    const newHabitacion_id = document.getElementById('updateHabitacion_id').value;
                    const newServicios = Array.from(document.querySelectorAll('#updateServiciosContainer input[name="updateServicios"]:checked')).map(cb => cb.value);
                    const newImagenInput = document.getElementById('newImagen').files[0];
                    const newPrecio = parseFloat(precioTotalStr.replace('$', '').trim());
                    if (!newNombre || isNaN(newPrecio) || !newHabitacion_id || newServicios.length === 0) {
                    alert('Por favor, completa todos los campos requeridos y selecciona al menos un servicio.');
                    return;
                    }


                    let imagenBase64 = paquete.imagen; // Mantener la imagen actual si no se selecciona una nueva

                    // Si se selecciona una nueva imagen, convertirla a Base64
                    if (newImagenInput) {
                        const reader = new FileReader();
                        reader.readAsDataURL(newImagenInput);
                        reader.onload = async function () {
                            imagenBase64 = reader.result.split(',')[1];  // Extraer solo la parte en base64
                            await updatePaquete(paquete.id, newNombre, newDescripcion, newPrecio, imagenBase64, newHabitacion_id, newServicios, descuento);
                            closeModal('updateModal'); // Cerrar el popup después de actualizar
                        };
                        reader.onerror = function (error) {
                            console.error('Error al leer la nueva imagen:', error);
                        };
                    } else {
                        // Si no se seleccionó ninguna nueva imagen, actualizar sin cambiar la imagen
                        await updatePaquete(paquete.id, newNombre, newDescripcion, newPrecio, imagenBase64, newHabitacion_id, newServicios, descuento);
                        closeModal('updateModal'); // Cerrar el popup después de actualizar
                    }
                };
            };
            li.appendChild(updateBtn);

            // Botón para eliminar
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.classList.add('delete');
            deleteBtn.onclick = () => {
                if (confirm('¿Estás seguro de que deseas eliminar este paquete?')) {
                    deletePaquete(paquete.id);
                }
            };
            li.appendChild(deleteBtn);
        }
            paqueteList.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar los paquetes:', error);
    }
}

// Función para cargar habitaciones y servicios en el formulario de actualización
async function cargarDatosFormularioActualizacion(paquete) {
    try {
        const response = await fetch('/api/paquetes/datos/formulario');
        const { habitaciones, servicios } = await response.json();

        // Cargar habitaciones en el select
        const habitacionSelect = document.getElementById('updateHabitacion_id');

        // Añadir una opción vacía al principio
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Seleccione una habitación';
        habitacionSelect.appendChild(defaultOption);

        habitaciones.forEach(habitacion => {
            const option = document.createElement('option');
            option.value = habitacion.id;
            option.textContent = `${habitacion.nombre} - $${habitacion.precio}`;
            preciosHabitaciones[habitacion.id] = habitacion.precio;
            if (habitacion.id == paquete.habitacion_id) {
                option.selected = true;
            }
            habitacionSelect.appendChild(option);
        });

        // Añadir evento para recalcular el precio al cambiar la habitación en la actualización
        habitacionSelect.addEventListener('change', function(event) {
            calcularPrecioTotal(event);
        });

        // Cargar servicios en los checkboxes
        const serviciosContainer = document.getElementById('updateServiciosContainer');
        servicios.forEach(servicio => {
            const label = document.createElement('label');
            label.style.display = 'block';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'updateServicios';
            checkbox.value = servicio.id;
            preciosServicios[servicio.id] = servicio.costo;

            if (paquete.servicios.some(s => s.ID == servicio.id || s.id == servicio.id)) {
                checkbox.checked = true;
            }

            // Añadir evento para recalcular el precio al seleccionar/deseleccionar un servicio
            checkbox.addEventListener('change', function(event) {
                calcularPrecioTotal(event);
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(`${servicio.nombre} - $${servicio.costo}`));
            serviciosContainer.appendChild(label);
        });

        // Recalcular el precio total al cargar el formulario
        calcularPrecioTotal({ target: document.getElementById('updatePaqueteForm') });

        // Obtener el input de descuento y añadir el event listener
const descuentoInput = document.getElementById('updateDescuento');
descuentoInput.addEventListener('input', function(event) {
    calcularPrecioTotal(event);
});

// Establecer el valor del descuento en el formulario
document.getElementById('updateDescuento').value = paquete.descuento || 0;


    } catch (error) {
        console.error('Error al cargar habitaciones y servicios:', error);
    }
}

// Función para actualizar un paquete
async function updatePaquete(id, nombre, descripcion, precio, imagen, habitacion_id, servicios, descuento) {
    try {
        const response = await fetch(`/api/paquetes/update/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, descripcion, precio, imagen, habitacion_id, servicios, descuento })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Paquete actualizado exitosamente');
            loadPaquetes(); // Recargar la lista de paquetes
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error al actualizar el paquete:', error);
        res.status(500).json({ error: error.message });
    }
}

// Función para eliminar un paquete
async function deletePaquete(id) {
    try {
        const response = await fetch(`/api/paquetes/delete/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert('Paquete eliminado exitosamente');
            loadPaquetes(); // Recargar la lista de paquetes
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error al eliminar el paquete:', error);
    }
}

// Manejar el envío del formulario para agregar un nuevo paquete
// Manejar el envío del formulario para agregar un nuevo paquete
document.getElementById('paqueteForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const descripcion = document.getElementById('descripcion').value;
    const precioTotal = document.getElementById('precioTotal').value;
    const precio = parseFloat(precioTotal.replace('$', ''));
    const habitacion_id = document.getElementById('habitacion_id').value;
    const servicios = Array.from(document.querySelectorAll('input[name="servicios"]:checked')).map(cb => cb.value);
    const imagenInput = document.getElementById('imagen').files[0];

    if (!nombre || isNaN(precio) || !habitacion_id || servicios.length === 0) {
        alert('Por favor, ingresa todos los campos requeridos y selecciona al menos un servicio.');
        return;
    }

    // Convertir la imagen a base64 si hay una imagen seleccionada
    let imagenBase64 = null;
    if (imagenInput) {
        const reader = new FileReader();
        reader.readAsDataURL(imagenInput);
        reader.onload = async function () {
            imagenBase64 = reader.result.split(',')[1]; // Tomar solo la parte del Base64

            // Aquí se asegura de que la imagen convertida se envíe correctamente al servidor
            await registrarPaquete(nombre, descripcion, precio, imagenBase64, habitacion_id, servicios);
        };
        reader.onerror = function (error) {
            console.error('Error al leer la imagen:', error);
            alert('Error al procesar la imagen.');
        };
    } else {
        // Si no hay imagen seleccionada
        await registrarPaquete(nombre, descripcion, precio, null, habitacion_id, servicios);
    }
});


// Función para registrar un nuevo paquete
async function registrarPaquete(nombre, descripcion, precio, imagenBase64, habitacion_id, servicios) {
    try {
        const descuento = parseFloat(document.getElementById('descuento').value) || 0;
        // Enviar los datos a la API
        const response = await fetch('/api/paquetes/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, descripcion, precio, imagen: imagenBase64, habitacion_id, servicios, descuento })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Paquete agregado exitosamente');
            document.getElementById('paqueteForm').reset(); // Limpiar el formulario
            loadPaquetes(); // Recargar la lista de paquetes
            closeModal('registerModal');
        } else {
            alert(`Error: ${result.error}`);
        }

    } catch (error) {
        console.error('Error al enviar la solicitud:', error);
        alert('Error al enviar los datos al servidor');
    }
}

// Cargar los datos del formulario y los paquetes al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarDatosFormulario();
    loadPaquetes();
});

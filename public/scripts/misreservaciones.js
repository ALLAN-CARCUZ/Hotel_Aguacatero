// Constante base para la API
const API_BASE_URL = 'http://localhost:3000/api';

// Variables para almacenar los precios de habitaciones y servicios
let preciosHabitaciones = {};
let preciosServicios = {};

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');

    if (!token) {
        alert('Debes iniciar sesión para ver tus reservaciones.');
        window.location.href = 'login.html';
        return;
    }

    try {
        let response;
        const reservacionesUrl = rol === 'admin' 
            ? `${API_BASE_URL}/reservaciones` 
            : `${API_BASE_URL}/reservaciones/usuario`;

        response = await fetch(reservacionesUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const reservaciones = await response.json();

        if (response.ok && Array.isArray(reservaciones)) {
            mostrarReservaciones(reservaciones);
        } else {
            console.error('La respuesta no es un array o hubo un error:', reservaciones);
            alert('Error al cargar reservaciones: ' + (reservaciones.message || 'Datos no válidos.'));
        }
    } catch (error) {
        console.error('Error al obtener las reservaciones:', error);
        alert('Error al obtener las reservaciones.');
    }

    // Configurar el botón de cerrar modal
    const closeModalButton = document.getElementById('closeUpdateModal');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => closeModal('updateModal'));
    } else {
        console.error('No se encontró el botón de cerrar del modal');
    }
});

function mostrarReservaciones(reservaciones) {
    const container = document.getElementById('reservacionesContainer');
    container.innerHTML = '';

    if (reservaciones.length === 0) {
        container.innerHTML = '<p>No tienes reservaciones aún.</p>';
        return;
    }

    reservaciones.forEach(reservacion => {
        const reservacionElement = document.createElement('div');
        reservacionElement.classList.add('reservacion-card');
        
        let serviciosList = reservacion.servicios && reservacion.servicios.length > 0
            ? reservacion.servicios.map(servicio => `<li>${servicio}</li>`).join('')
            : '<li>No hay servicios adicionales</li>';
        
        let detallesReservacion = reservacion.nombre_paquete
            ? `<p><strong>Paquete:</strong> ${reservacion.nombre_paquete}</p><p><strong>Incluye:</strong> ${reservacion.nombre_habitacion || 'Habitación no disponible'}</p>`
            : `<p><strong>Habitación:</strong> ${reservacion.nombre_habitacion || 'Habitación no disponible'}</p>`;

        reservacionElement.innerHTML = `
            <div class="reservacion-header">
                <h3>Reservación ID: ${reservacion.id_reservacion}</h3>
            </div>
            <div class="reservacion-body">
                <p><strong>Usuario:</strong> ${reservacion.nombre_usuario || 'No disponible'}</p> <!-- Aquí debe mostrar el nombre del usuario -->
                ${detallesReservacion}
                <p><strong>Fecha de Ingreso:</strong> ${new Date(reservacion.fecha_ingreso).toLocaleDateString()}</p>
                <p><strong>Fecha de Salida:</strong> ${new Date(reservacion.fecha_salida).toLocaleDateString()}</p>
                <p><strong>Total:</strong> $${reservacion.costo_total.toFixed(2)}</p>
                <h4>Servicios Incluidos:</h4>
                <ul>${serviciosList}</ul>
            </div>
            <div class="reservacion-footer">
                <button class="btn modificar" onclick="modificarReservacion(${reservacion.id_reservacion})">Modificar</button>
                <button class="btn cancelar" onclick="cancelarReservacion(${reservacion.id_reservacion})">Cancelar</button>
            </div>
        `;
        container.appendChild(reservacionElement);
    });
}


// Función para cancelar una reservación
async function cancelarReservacion(id_reservacion) {
    const token = localStorage.getItem('token');
    
    if (confirm('¿Estás seguro de que deseas cancelar esta reservación?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/reservaciones/cancel/${id_reservacion}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                window.location.reload();
            } else {
                alert('Error al cancelar la reservación: ' + result.message);
            }
        } catch (error) {
            console.error('Error al cancelar la reservación:', error);
            alert('Error al cancelar la reservación.');
        }
    }
}

// Función para modificar una reservación (ahora abre el popup)
async function modificarReservacion(id_reservacion) {
    try {
        const response = await fetch(`${API_BASE_URL}/reservaciones/${id_reservacion}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const reservacion = await response.json();

        const updateForm = `
            <label for="newIdHabitacion">Nueva habitación:</label>
            <select id="newIdHabitacion" name="newIdHabitacion"></select><br>

            <label for="serviciosContainer">Servicios:</label>
            <div id="serviciosContainer"></div><br>

            <label for="newCostoTotal">Nuevo costo total:</label>
            <input type="text" id="newCostoTotal" readonly><br>

            <label for="newMetodoPago">Nuevo método de pago:</label>
            <input type="text" id="newMetodoPago" value="${reservacion.metodo_pago}"><br>

            <label for="newFechaIngreso">Nueva fecha de ingreso:</label>
            <input type="date" id="newFechaIngreso" value="${new Date(reservacion.fecha_ingreso).toISOString().split('T')[0]}"><br>

            <label for="newFechaSalida">Nueva fecha de salida:</label>
            <input type="date" id="newFechaSalida" value="${new Date(reservacion.fecha_salida).toISOString().split('T')[0]}"><br>

            <button id="saveChanges">Guardar cambios</button>
        `;

        document.getElementById('updateFormContainer').innerHTML = updateForm;

        // Cargar los datos de habitaciones y servicios, y abrir el popup
        await cargarDatosFormularioActualizacion(reservacion);

        // Cargar y deshabilitar las fechas ocupadas para la habitación seleccionada
        if (reservacion.id_habitacion) {
            const fechasOcupadas = await cargarFechasOcupadas(reservacion.id_habitacion);

            flatpickr("#newFechaIngreso", {
                minDate: "today",
                disable: fechasOcupadas,
                onChange: function(selectedDates) {
                    const fechaSeleccionada = selectedDates[0].toISOString().split('T')[0];
                    flatpickr("#newFechaSalida", {
                        minDate: fechaSeleccionada,
                        disable: fechasOcupadas
                    });
                }
            });

            flatpickr("#newFechaSalida", {
                minDate: "today",
                disable: fechasOcupadas
            });
        }

        openModal('updateModal');

        // Añadir evento al botón para guardar cambios
        document.getElementById('saveChanges').onclick = async () => {
            const newIdHabitacion = document.getElementById('newIdHabitacion').value;
            const newServicios = Array.from(document.querySelectorAll('input[name="servicios"]:checked')).map(cb => cb.value);
            const newCostoTotal = parseFloat(document.getElementById('newCostoTotal').value.replace('$', ''));
            const newMetodoPago = document.getElementById('newMetodoPago').value;
            const newFechaIngreso = document.getElementById('newFechaIngreso').value;
            const newFechaSalida = document.getElementById('newFechaSalida').value;

            await updateReservacion(id_reservacion, newIdHabitacion, newServicios.length > 0 ? newServicios : [], newCostoTotal, newMetodoPago, newFechaIngreso, newFechaSalida);
        };
    } catch (error) {
        console.error('Error al obtener la reservación para modificar:', error);
        alert('Error al obtener la reservación.');
    }
}

// Función para cargar habitaciones y servicios en el formulario de actualización
// Función para cargar habitaciones y servicios en el formulario de actualización
async function cargarDatosFormularioActualizacion(reservacion) {
    try {
        const response = await fetch(`${API_BASE_URL}/paquetes/datos/formulario`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const { habitaciones, servicios } = await response.json();

        // Cargar habitaciones en el select
        const habitacionSelect = document.getElementById('newIdHabitacion');
        habitacionSelect.innerHTML = '';

        habitaciones.forEach(habitacion => {
            const option = document.createElement('option');
            option.value = habitacion.id;
            option.textContent = `${habitacion.nombre} - $${habitacion.precio}`;
            preciosHabitaciones[habitacion.id] = habitacion.precio;

            if (habitacion.id == reservacion.id_habitacion) {
                option.selected = true;
            }

            habitacionSelect.appendChild(option);
        });

        habitacionSelect.addEventListener('change', calcularPrecioTotal);

        // Cargar servicios en los checkboxes
        const serviciosContainer = document.getElementById('serviciosContainer');
        serviciosContainer.innerHTML = '';

        servicios.forEach(servicio => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'servicios';
            checkbox.value = servicio.id;
            preciosServicios[servicio.id] = servicio.costo;

            // Marcar el checkbox si el servicio ya estaba seleccionado en la reservación
            if (Array.isArray(reservacion.servicios) && reservacion.servicios.some(s => s.id == servicio.id || s.ID == servicio.id)) {
                checkbox.checked = true;
            }

            checkbox.addEventListener('change', calcularPrecioTotal);
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(`${servicio.nombre} - $${servicio.costo}`));
            serviciosContainer.appendChild(label);
        });

        // Agregar eventos para recalcular el precio total cuando cambien las fechas
        document.getElementById('newFechaIngreso').addEventListener('change', calcularPrecioTotal);
        document.getElementById('newFechaSalida').addEventListener('change', calcularPrecioTotal);

        calcularPrecioTotal();  // Calcular precio inicial
    } catch (error) {
        console.error('Error al cargar habitaciones y servicios:', error);
    }
}


// Función para calcular el precio total de la reservación
// Función para calcular el precio total de la reservación
function calcularPrecioTotal() {
    let precioTotal = 0;

    // Obtener fechas de ingreso y salida
    const fechaIngreso = document.getElementById('newFechaIngreso').value;
    const fechaSalida = document.getElementById('newFechaSalida').value;

    // Validar si ambas fechas están presentes
    if (!fechaIngreso || !fechaSalida) {
        console.error("Por favor seleccione tanto la fecha de ingreso como la fecha de salida.");
        return;
    }

    // Calcular la cantidad de noches reservadas
    const fecha1 = new Date(fechaIngreso);
    const fecha2 = new Date(fechaSalida);
    const cantidadNoches = Math.ceil((fecha2 - fecha1) / (1000 * 3600 * 24));

    // Cálculo del costo total de la habitación multiplicado por la cantidad de noches
    const habitacionId = document.getElementById('newIdHabitacion').value;
    if (habitacionId && preciosHabitaciones[habitacionId]) {
        const costoHabitacion = preciosHabitaciones[habitacionId];
        precioTotal += costoHabitacion * cantidadNoches;
        console.log(`Costo base por noche de la habitación: ${costoHabitacion}, Noches: ${cantidadNoches}, Total habitación: ${costoHabitacion * cantidadNoches}`);
    }

    // Agregar el costo de los servicios seleccionados
    const serviciosSeleccionados = Array.from(document.querySelectorAll('input[name="servicios"]:checked'));
    serviciosSeleccionados.forEach(servicio => {
        const servicioId = servicio.value;
        if (preciosServicios[servicioId]) {
            precioTotal += preciosServicios[servicioId];
        }
    });

    // Mostrar el costo total en el campo de precio total en el formulario
    document.getElementById('newCostoTotal').value = `$${precioTotal.toFixed(2)}`;
    console.log(`Precio total calculado: ${precioTotal.toFixed(2)}`);
}


// Función para abrir un modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex'; // Mostrar el modal
    } else {
        console.error('No se encontró el modal con el ID:', modalId);
    }
}

// Función para cerrar el modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none'; // Ocultar el modal
    } else {
        console.error('No se encontró el modal con el ID:', modalId);
    }
}

// Función para actualizar una reservación
async function updateReservacion(id_reservacion, newIdHabitacion, newServicios, newCostoTotal, newMetodoPago, newFechaIngreso, newFechaSalida) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/reservaciones/update/${id_reservacion}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_habitacion: newIdHabitacion,
                servicios: newServicios,
                costo_total: newCostoTotal,
                metodo_pago: newMetodoPago,
                fecha_ingreso: newFechaIngreso,
                fecha_salida: newFechaSalida
            })
        });
        
        const result = await response.json();

        if (response.ok) {
            alert('Reservación actualizada exitosamente');
            window.location.reload(); // Recargar la página después de la actualización
        } else {
            alert('Error al actualizar la reservación: ' + result.message);
        }
    } catch (error) {
        console.error('Error al actualizar la reservación:', error);
        alert('Error al actualizar la reservación.');
    }
}

async function cargarFechasOcupadas(habitacionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/reservaciones/fechas-reservadas/${habitacionId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const fechasReservadas = await response.json();

        return fechasReservadas.map(f => ({
            from: new Date(f.fecha_ingreso).toISOString().split('T')[0],
            to: new Date(f.fecha_salida).toISOString().split('T')[0]
        }));
    } catch (error) {
        console.error('Error al cargar fechas ocupadas:', error);
        return [];
    }
}

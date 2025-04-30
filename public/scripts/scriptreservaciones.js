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

// Ocultar el botón de agregar reservación si el rol no es admin
document.getElementById('openRegisterModal').style.display = (rol === 'admin') ? 'block' : 'none';

// Función para cargar habitaciones y servicios en el formulario de actualización
// Función para cargar habitaciones y servicios en el formulario de actualización
async function cargarDatosFormularioActualizacion(reservacion) {
    try {
        const response = await fetch('/api/paquetes/datos/formulario');
        const { habitaciones, servicios } = await response.json();

        const habitacionSelect = document.getElementById('newIdHabitacion');
        const serviciosContainer = document.getElementById('serviciosContainer');

        if (reservacion.id_paquete) {
            // Si la reservación tiene un paquete, ocultar habitaciones y servicios
            habitacionSelect.style.display = 'none';
            serviciosContainer.style.display = 'none';
        } else {
            // Mostrar habitaciones y servicios si no hay paquete
            habitacionSelect.style.display = 'block';
            serviciosContainer.style.display = 'block';

            // Cargar habitaciones en el select
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
            serviciosContainer.innerHTML = '';
            servicios.forEach(servicio => {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'servicios';
                checkbox.value = servicio.id;
                preciosServicios[servicio.id] = servicio.costo;

                if (reservacion.servicios.some(s => s.ID == servicio.id || s.id == servicio.id)) {
                    checkbox.checked = true;
                }

                checkbox.addEventListener('change', calcularPrecioTotal);
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(`${servicio.nombre} - $${servicio.costo}`));
                serviciosContainer.appendChild(label);
            });
        }

        calcularPrecioTotal();
    } catch (error) {
        console.error('Error al cargar habitaciones y servicios:', error);
    }
}


// Función para calcular el precio total de la reservación
function calcularPrecioTotal() {
    let precioTotal = 0;

    const habitacionId = document.getElementById('newIdHabitacion').value;
    if (habitacionId && preciosHabitaciones[habitacionId]) {
        precioTotal += preciosHabitaciones[habitacionId];
    }

    const serviciosSeleccionados = Array.from(document.querySelectorAll('input[name="servicios"]:checked'));
    serviciosSeleccionados.forEach(servicio => {
        const servicioId = servicio.value;
        if (preciosServicios[servicioId]) {
            precioTotal += preciosServicios[servicioId];
        }
    });

    document.getElementById('newCostoTotal').value = `$${precioTotal.toFixed(2)}`;
}

// Función para actualizar una reservación
async function updateReservacion(id, id_habitacion, servicios, costo_total, metodo_pago, fecha_ingreso, fecha_salida) {
    try {
        const response = await fetch(`/api/reservaciones/update/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id_habitacion, servicios, costo_total, metodo_pago, fecha_ingreso, fecha_salida })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Reservación actualizada exitosamente');
            cargarReservaciones(); // Recargar la lista de reservaciones
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error al actualizar la reservación:', error);
    }
}

// Función para cargar las reservaciones y mostrarlas en la lista
async function cargarReservaciones() {
    try {
        const response = await fetch('/api/reservaciones');
        const reservaciones = await response.json();

        const reservacionesList = document.getElementById('reservaciones-list');
        reservacionesList.innerHTML = '';

        reservaciones.forEach(reservacion => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reservacion.id_reservacion}</td>
                <td>${reservacion.id_usuario}</td>
                <td>${reservacion.id_habitacion}</td>
                <td>Q${reservacion.costo_total.toFixed(2)}</td>
                <td>${reservacion.metodo_pago}</td>
                <td>${new Date(reservacion.fecha_ingreso).toLocaleDateString()}</td>
                <td>${new Date(reservacion.fecha_salida).toLocaleDateString()}</td>
            `;

            if (rol === 'admin') {
                const updateBtn = document.createElement('button');
                updateBtn.textContent = 'Actualizar';
                updateBtn.onclick = () => {
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
                    cargarDatosFormularioActualizacion(reservacion); // Cargar habitaciones y servicios
                    openModal('updateModal');

                    document.getElementById('saveChanges').onclick = async () => {
                        const newIdHabitacion = document.getElementById('newIdHabitacion').value;
                        const newServicios = Array.from(document.querySelectorAll('input[name="servicios"]:checked')).map(cb => cb.value);
                        const newCostoTotal = parseFloat(document.getElementById('newCostoTotal').value.replace('$', ''));
                        const newMetodoPago = document.getElementById('newMetodoPago').value;
                        const newFechaIngreso = document.getElementById('newFechaIngreso').value;
                        const newFechaSalida = document.getElementById('newFechaSalida').value;

                        await updateReservacion(reservacion.id_reservacion, newIdHabitacion, newServicios, newCostoTotal, newMetodoPago, newFechaIngreso, newFechaSalida);
                        closeModal('updateModal');
                    };
                };
                row.appendChild(updateBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Eliminar';
                deleteBtn.onclick = () => {
                    if (confirm('¿Estás seguro de que deseas eliminar esta reservación?')) {
                        deleteReservacion(reservacion.id_reservacion);
                    }
                };
                row.appendChild(deleteBtn);
            }

            reservacionesList.appendChild(row);
        });
    } catch (error) {
        console.error('Error al cargar las reservaciones:', error);
    }
}

// Función para eliminar una reservación
async function deleteReservacion(id) {
    try {
        const response = await fetch(`/api/reservaciones/delete/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Reservación eliminada exitosamente');
            cargarReservaciones();
        } else {
            const result = await response.json();
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error al eliminar la reservación:', error);
    }
}

// Cargar las reservaciones al cargar la página
document.addEventListener('DOMContentLoaded', cargarReservaciones);

// Asignar evento al botón de cerrar modal
document.getElementById('closeUpdateModal').addEventListener('click', () => {
    closeModal('updateModal');
});

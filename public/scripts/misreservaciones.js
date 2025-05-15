// Constante base para la API
const API_BASE_URL = 'http://localhost:3000/api';

// Variables para almacenar los precios de habitaciones y servicios
let preciosHabitaciones = {};
let preciosServicios = {};
let costoOriginalReservacion = 0;
let stripeInstanceExtra = null; // Para evitar reinicializar Stripe.js
let elementsExtra = null;
let cardElementExtra = null;

function initializeStripeElementsExtra() {
    console.log("Intentando inicializar Stripe Elements Extra...");
    if (!stripeInstanceExtra) {
        try {
            stripeInstanceExtra = Stripe('pk_test_51Q9a2gRqSLao4U6DhgfZrCYHn3JFpiGlbm2HD2IzfK8VO6ZkgEqwh4fRVsAzEkc6iSgxW9D7PqpEcIeHIKZs4u1I00fx9gWTuE'); // Tu clave
            console.log("Stripe instance creada.");
        } catch(e) {
            console.error("Error al crear Stripe instance:", e);
            return false;
        }
    }

    const stripeElementStyle = {
        base: {
            color: '#32325d', // Color del texto
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif', // Fuente
            fontSmoothing: 'antialiased',
            fontSize: '16px', // Tamaño de fuente
            '::placeholder': {
                color: '#aab7c4' // Color del placeholder
            }
        },
        invalid: {
            color: '#fa755a', // Color del texto cuando hay error
            iconColor: '#fa755a' // Color del ícono de error
        }
    };

    elementsExtra = stripeInstanceExtra.elements();
    console.log("Stripe elements instance creada.");

    
    const cardNumber = elementsExtra.create('cardNumber', { style: stripeElementStyle });
    const cardExpiry = elementsExtra.create('cardExpiry', { style: stripeElementStyle });
    const cardCvc = elementsExtra.create('cardCvc', { style: stripeElementStyle });
    const postalCode = elementsExtra.create('postalCode', { style: stripeElementStyle });
    console.log("Elementos de tarjeta creados.");

    try {
        cardNumber.mount('#card-number-extra');
        cardExpiry.mount('#card-expiry-extra');
        cardCvc.mount('#card-cvc-extra');
        postalCode.mount('#card-zip-extra');
    } catch (error) {
        console.error("Error al montar elementos de Stripe. Verifica que los IDs HTML existan:", error);
        return false;
    }
    
    try {
        console.log("Intentando montar cardNumber en #card-number-extra");
        if (!document.getElementById('card-number-extra')) console.error("#card-number-extra NO ENCONTRADO");
        cardNumber.mount('#card-number-extra');

        console.log("Intentando montar cardExpiry en #card-expiry-extra");
        if (!document.getElementById('card-expiry-extra')) console.error("#card-expiry-extra NO ENCONTRADO");
        cardExpiry.mount('#card-expiry-extra');

        console.log("Intentando montar cardCvc en #card-cvc-extra");
        if (!document.getElementById('card-cvc-extra')) console.error("#card-cvc-extra NO ENCONTRADO");
        cardCvc.mount('#card-cvc-extra');

        console.log("Intentando montar postalCode en #card-zip-extra");
        if (!document.getElementById('card-zip-extra')) console.error("#card-zip-extra NO ENCONTRADO");
        postalCode.mount('#card-zip-extra');
        console.log("Elementos montados exitosamente.");

    } catch (error) {
        console.error("Error al montar elementos de Stripe. Verifica que los IDs HTML existan:", error);
        return false;
    }

    const cardErrorHandler = (event) => { /* ... */ };
    cardNumber.on('change', cardErrorHandler);
    cardExpiry.on('change', cardErrorHandler);
    cardCvc.on('change', cardErrorHandler);
    postalCode.on('change', cardErrorHandler);

    cardElementExtra = cardNumber;
    const formStripeExtra = document.getElementById('stripe-payment-form-extra');
    if (formStripeExtra) {
        formStripeExtra.style.display = 'block';
        console.log("Formulario de Stripe #stripe-payment-form-extra mostrado.");
    } else {
        console.error("Contenedor #stripe-payment-form-extra no encontrado para mostrarlo.");
        return false;
    }
    return true;
}

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

async function mostrarFormularioPagoExtraStripe(clientSecretExtra, montoAdicional) {
    return new Promise((resolve) => {
        // Intentar inicializar. Si falla, resolver la promesa como false.
        if (!initializeStripeElementsExtra()) {
            alert("No se pudo inicializar el formulario de pago. Por favor, contacta a soporte.");
            resolve(false);
            return;
        }

        const payButton = document.getElementById('pay-extra-charge-button');
        if (!payButton) {
            console.error("Botón #pay-extra-charge-button no encontrado.");
            resolve(false);
            return;
        }
        payButton.textContent = `Pagar $${montoAdicional.toFixed(2)}`;

        // Clonar para remover listeners viejos
        const newPayButton = payButton.cloneNode(true);
        payButton.parentNode.replaceChild(newPayButton, payButton);

        newPayButton.onclick = async () => {
            newPayButton.disabled = true;
            const cardholderNameInput = document.getElementById('cardholder-name-extra');
            const cardErrorsDisplay = document.getElementById('card-errors-extra');

            if (!cardholderNameInput || !cardErrorsDisplay) {
                console.error("Elementos del formulario de pago extra no encontrados.");
                newPayButton.disabled = false;
                resolve(false);
                return;
            }
            const cardholderName = cardholderNameInput.value;
            cardErrorsDisplay.textContent = '';

            try {
                const result = await stripeInstanceExtra.confirmCardPayment(clientSecretExtra, {
                    payment_method: {
                        card: cardElementExtra,
                        billing_details: {
                            name: cardholderName,
                        },
                    },
                });

                if (result.error) {
                    cardErrorsDisplay.textContent = result.error.message;
                    newPayButton.disabled = false;
                    resolve(false);
                } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                    alert('Pago adicional exitoso!');
                    const formStripeExtra = document.getElementById('stripe-payment-form-extra');
                    if (formStripeExtra) formStripeExtra.style.display = 'none';
                    resolve(true);
                } else {
                    cardErrorsDisplay.textContent = 'El pago no pudo ser completado.';
                    newPayButton.disabled = false;
                    resolve(false);
                }
            } catch (e) {
                console.error("Error al confirmar pago extra:", e);
                cardErrorsDisplay.textContent = "Error al procesar el pago.";
                newPayButton.disabled = false;
                resolve(false);
            }
        };
    });
}

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
    console.log(`Iniciando modificación para reservación ID: ${id_reservacion}`);
    try {
        // 1. Obtener los datos actuales de la reservación
        const response = await fetch(`${API_BASE_URL}/reservaciones/${id_reservacion}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Error al obtener la reservación: ${errorData.message || response.statusText}`);
        }

        const reservacion = await response.json(); // Llamar a .json() SOLO UNA VEZ
        console.log("Datos de la reservación original:", reservacion);
        costoOriginalReservacion = reservacion.costo_total;

        // 2. Construir el HTML del formulario de modificación
        // Asegúrate que los IDs aquí coincidan con los que usas en cargarDatosFormularioActualizacion y calcularPrecioTotal
        const updateFormHTML = `
        <label for="newIdHabitacion">Nueva habitación:</label>
        <select id="newIdHabitacion" name="newIdHabitacion"></select><br>

        <label for="serviciosUpdateContainer">Servicios:</label>
        <div id="serviciosUpdateContainer"></div><br>

        <label for="newCostoTotal">Nuevo costo total:</label>
        <input type="text" id="newCostoTotal" readonly><br>

        <label for="newMetodoPago">Nuevo método de pago:</label>
        <input type="text" id="newMetodoPago" value="${reservacion.metodo_pago}" readonly><br>

        <label for="newFechaIngreso">Nueva fecha de ingreso:</label>
        <input type="date" id="newFechaIngreso" value="${new Date(reservacion.fecha_ingreso).toISOString().split('T')[0]}"><br>

        <label for="newFechaSalida">Nueva fecha de salida:</label>
        <input type="date" id="newFechaSalida" value="${new Date(reservacion.fecha_salida).toISOString().split('T')[0]}"><br>

        <button type="button" id="saveChangesButton">Guardar cambios</button>

        <div id="stripe-payment-form-extra" style="display:none; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 15px;">
            <h4>Realizar Pago Adicional</h4>
            <label for="cardholder-name-extra">Nombre en la tarjeta</label>
            <input type="text" id="cardholder-name-extra" placeholder="Nombre completo" required>

            <label for="card-number-extra">Número de tarjeta</label>
            <div id="card-number-extra" class="input-field"></div>

            <div class="form-row" style="display: flex; justify-content: space-between;">
                <div style="width: 48%;">
                    <label for="card-expiry-extra">Fecha de Expiración</label>
                    <div id="card-expiry-extra" class="input-field"></div>
                </div>
                <div style="width: 48%;">
                    <label for="card-cvc-extra">CVC</label>
                    <div id="card-cvc-extra" class="input-field"></div>
                </div>
            </div>
            <label for="card-zip-extra">Código Postal</label>
            <div id="card-zip-extra" class="input-field"></div>
            <div id="card-errors-extra" role="alert" style="color: red; margin-top: 10px;"></div>
            <button type="button" id="pay-extra-charge-button" style="margin-top: 15px;">Pagar Monto Adicional</button>
        </div>
    `;

        const updateFormContainer = document.getElementById('updateFormContainer');
        if (!updateFormContainer) {
            console.error("El contenedor 'updateFormContainer' no existe en el DOM.");
            return;
        }
        updateFormContainer.innerHTML = updateFormHTML; // Primero inyecta el form de modificación

        // Luego, asegúrate que el HTML del formulario de Stripe también esté presente o inyéctalo aquí si es necesario
        // Si ya está en misreservaciones.html, solo necesitas asegurarte que está dentro de updateFormContainer o en una posición lógica.
        // Por simplicidad, si ya tienes el div #stripe-payment-form-extra en tu HTML, no necesitas re-inyectarlo.


        // 3. Cargar datos (habitaciones, servicios) en el formulario y preseleccionar
        await cargarDatosFormularioActualizacion(reservacion); // Esta función llenará los select y checkboxes

        // 4. Configurar Flatpickr para las nuevas fechas
        if (reservacion.id_habitacion || document.getElementById('newIdHabitacion').value) {
            const habitacionActualId = reservacion.id_habitacion || document.getElementById('newIdHabitacion').value;
            const fechasOcupadas = await cargarFechasOcupadas(habitacionActualId);

            flatpickr("#newFechaIngreso", {
                minDate: "today",
                disable: fechasOcupadas,
                onChange: function(selectedDates, dateStr) {
                    flatpickr("#newFechaSalida", { // Reconfigura la fecha de salida
                        minDate: dateStr, // La nueva fecha mínima es la de ingreso seleccionada
                        disable: fechasOcupadas
                    });
                    calcularPrecioTotal(); // Recalcular al cambiar fecha de ingreso
                }
            });

            flatpickr("#newFechaSalida", {
                minDate: document.getElementById('newFechaIngreso').value || "today",
                disable: fechasOcupadas,
                onChange: function() {
                    calcularPrecioTotal(); // Recalcular al cambiar fecha de salida
                }
            });
        }

        // 5. Abrir el modal
        openModal('updateModal');

        // 6. Asignar evento al botón "Guardar cambios"
        const saveChangesButton = document.getElementById('saveChangesButton');
        if (!saveChangesButton) {
            console.error("Botón #saveChangesButton no encontrado.");
            return;
        }
        saveChangesButton.onclick = async () => {
            console.log("Botón 'Guardar Cambios' presionado.");
            // Recolectar datos del formulario de modificación
            const newIdHabitacion = document.getElementById('newIdHabitacion').value;
            // Asegúrate que los checkboxes de servicios estén dentro de #serviciosUpdateContainer
            const newServicios = Array.from(document.querySelectorAll('#serviciosUpdateContainer input[name="servicios"]:checked')).map(cb => cb.value);
            const newCostoTotalText = document.getElementById('newCostoTotal').value;
            const newCostoTotalFloat = parseFloat(newCostoTotalText.replace(/[$,]/g, '')); // Limpiar '$' y comas
            const newMetodoPago = document.getElementById('newMetodoPago').value;
            const newFechaIngreso = document.getElementById('newFechaIngreso').value;
            const newFechaSalida = document.getElementById('newFechaSalida').value;

            console.log("Costo original:", costoOriginalReservacion, "Nuevo costo:", newCostoTotalFloat);

            // Llamar a la función que maneja la lógica de pago y actualización
            await manejarActualizacionYPagos(
                id_reservacion,
                costoOriginalReservacion,
                newIdHabitacion,
                newServicios, // Ya es un array
                newCostoTotalFloat,
                newMetodoPago,
                newFechaIngreso,
                newFechaSalida
            );
        };
    } catch (error) {
        console.error('Error en modificarReservacion:', error);
        alert(`Error al obtener datos para modificar la reservación: ${error.message}`);
    }
}

async function manejarActualizacionYPagos(id_reservacion, costoOriginal, newIdHabitacion, newServicios, newCostoTotal, newMetodoPago, newFechaIngreso, newFechaSalida) {
    console.log(`Manejando actualización y pagos para reservación ID: ${id_reservacion}`);
    const diferenciaCosto = newCostoTotal - costoOriginal;
    console.log(`Diferencia de costo: ${diferenciaCosto}`);

    if (diferenciaCosto > 0) {
        alert(`Se requiere un pago adicional de: $${diferenciaCosto.toFixed(2)}`);
        try {
            const cobroExtraResponse = await fetch(`${API_BASE_URL}/cobros-extra/solicitar-pago-modificacion`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_reservacion: id_reservacion,
                    // El backend espera monto_adicional_en_centavos o monto_adicional
                    // Si tu backend `solicitarPagoModificacionController` espera `monto_adicional_en_centavos`:
                    monto_adicional_en_centavos: Math.round(diferenciaCosto * 100)
                    // Si espera `monto_adicional`:
                    // monto_adicional: diferenciaCosto
                })
            });

            const cobroExtraResult = await cobroExtraResponse.json();
            console.log("Respuesta de solicitar-pago-modificacion:", cobroExtraResult);

            if (cobroExtraResponse.ok && cobroExtraResult.client_secret) {
                const pagoExitoso = await mostrarFormularioPagoExtraStripe(cobroExtraResult.client_secret, diferenciaCosto);
                console.log("Resultado del pago extra:", pagoExitoso);

                if (pagoExitoso) {
                    await updateReservacionEnBD(
                        id_reservacion, newIdHabitacion, newServicios, newCostoTotal,
                        newMetodoPago, newFechaIngreso, newFechaSalida,
                        cobroExtraResult.payment_intent_id, // Pasar el payment_intent_id del pago extra
                        Math.round(diferenciaCosto * 100)  // Pasar el monto del pago extra en centavos
                    );
                } else {
                    alert('El pago adicional falló. No se guardaron los cambios.');
                }
            } else {
                alert('Error al preparar el cobro adicional: ' + (cobroExtraResult.message || 'Respuesta no OK del servidor.'));
            }
        } catch (error) {
            console.error("Error en el proceso de cobro extra:", error);
            alert("Error en el proceso de cobro extra: " + error.message);
        }
    } else {
        console.log("No hay costo adicional o es un crédito, actualizando directamente.");
        // No hay costo adicional (o es menor), solo actualiza la reservación
        await updateReservacionEnBD(id_reservacion, newIdHabitacion, newServicios, newCostoTotal, newMetodoPago, newFechaIngreso, newFechaSalida);
    }
}

// Renombra tu función original updateReservacion para evitar confusión
async function updateReservacionEnBD(id_reservacion, newIdHabitacion, newServicios, newCostoTotal, newMetodoPago, newFechaIngreso, newFechaSalida, paymentIntentIdAdicional = null, montoAdicionalPagado = 0) {
    console.log(`Actualizando reservación ID: ${id_reservacion} en BD.`);
    const token = localStorage.getItem('token');
    try {
        const bodyData = {
            id_habitacion: newIdHabitacion,
            servicios: newServicios,
            costo_total: newCostoTotal, // Este es el nuevo costo total GLOBAL de la reservación
            metodo_pago: newMetodoPago,
            fecha_ingreso: newFechaIngreso,
            fecha_salida: newFechaSalida
        };

        if (paymentIntentIdAdicional) {
            bodyData.payment_intent_id_adicional = paymentIntentIdAdicional;
            bodyData.monto_adicional_pagado = montoAdicionalPagado; // En centavos
        }
        console.log("Enviando para actualizar reservación:", bodyData);

        const response = await fetch(`${API_BASE_URL}/reservaciones/update/${id_reservacion}`, { // URL corregida
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });

        const result = await response.json();
        if (response.ok) {
            alert('Reservación actualizada exitosamente');
            window.location.reload();
        } else {
            alert('Error al actualizar la reservación: ' + (result.message || 'Error desconocido del servidor.'));
        }
    } catch (error) {
        console.error('Error al actualizar la reservación en BD:', error);
        alert('Error al actualizar la reservación: ' + error.message);
    }
}

// Función para cargar habitaciones y servicios en el formulario de actualización
// Función para cargar habitaciones y servicios en el formulario de actualización
async function cargarDatosFormularioActualizacion(reservacion) {
    try {
        const response = await fetch(`${API_BASE_URL}/paquetes/datos/formulario`, { // Asumo que este endpoint da habitaciones y servicios
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) throw new Error('No se pudieron cargar datos para el formulario.');
        const { habitaciones, servicios } = await response.json();

        const habitacionSelect = document.getElementById('newIdHabitacion');
        if (!habitacionSelect) { console.error("#newIdHabitacion no encontrado"); return; }
        habitacionSelect.innerHTML = '';
        preciosHabitaciones = {}; // Resetear
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

        const serviciosDivContainer = document.getElementById('serviciosUpdateContainer'); // ID actualizado
        if (!serviciosDivContainer) { console.error("#serviciosUpdateContainer no encontrado"); return; }
        serviciosDivContainer.innerHTML = '';
        preciosServicios = {}; // Resetear
        servicios.forEach(servicio => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'servicios'; // Importante para querySelectorAll
            checkbox.value = servicio.id;
            preciosServicios[servicio.id] = servicio.costo;

            if (Array.isArray(reservacion.servicios) && reservacion.servicios.some(s => s.id == servicio.id || (s.ID_SERVICIO && s.ID_SERVICIO == servicio.id) || (s == servicio.id) )) { // Más robusto
                checkbox.checked = true;
            }
            checkbox.addEventListener('change', calcularPrecioTotal);
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${servicio.nombre} - $${servicio.costo}`));
            label.appendChild(document.createElement('br')); // Para mejor formato de checkboxes
            serviciosDivContainer.appendChild(label);
        });

        document.getElementById('newFechaIngreso').addEventListener('change', calcularPrecioTotal);
        document.getElementById('newFechaSalida').addEventListener('change', calcularPrecioTotal);
        calcularPrecioTotal(); // Calcular precio inicial
    } catch (error) {
        console.error('Error al cargar habitaciones y servicios:', error);
    }
}


// Función para calcular el precio total de la reservación
// Función para calcular el precio total de la reservación
function calcularPrecioTotal() {
    let precioTotalCalculado = 0;
    const costoTotalInput = document.getElementById('newCostoTotal');
    if(!costoTotalInput) { console.error("#newCostoTotal no encontrado"); return;}


    const fechaIngresoVal = document.getElementById('newFechaIngreso').value;
    const fechaSalidaVal = document.getElementById('newFechaSalida').value;

    if (!fechaIngresoVal || !fechaSalidaVal) {
        console.log("Fechas no seleccionadas completamente para calcular precio.");
        costoTotalInput.value = '$0.00'; // O mantener valor anterior
        return;
    }

    const fecha1 = new Date(fechaIngresoVal);
    const fecha2 = new Date(fechaSalidaVal);

    if (fecha2 <= fecha1) {
        console.log("Fecha de salida debe ser posterior a la de ingreso.");
        costoTotalInput.value = '$0.00'; // O manejar error
        return;
    }
    const cantidadNoches = Math.ceil((fecha2 - fecha1) / (1000 * 3600 * 24));

    const habitacionId = document.getElementById('newIdHabitacion').value;
    if (habitacionId && preciosHabitaciones[habitacionId]) {
        const costoHabitacionPorNoche = preciosHabitaciones[habitacionId];
        precioTotalCalculado += costoHabitacionPorNoche * cantidadNoches;
    }

    // Asegúrate que los checkboxes estén dentro del contenedor correcto.
    const serviciosSeleccionados = Array.from(document.querySelectorAll('#serviciosUpdateContainer input[name="servicios"]:checked'));
    serviciosSeleccionados.forEach(servicio => {
        const servicioId = servicio.value;
        if (preciosServicios[servicioId]) {
            // Asumimos que el precio del servicio es por estancia, no por noche. Si es por noche, multiplica por cantidadNoches.
            precioTotalCalculado += preciosServicios[servicioId];
        }
    });

    costoTotalInput.value = `$${precioTotalCalculado.toFixed(2)}`;
    console.log(`Precio total recalculado: $${precioTotalCalculado.toFixed(2)}`);
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

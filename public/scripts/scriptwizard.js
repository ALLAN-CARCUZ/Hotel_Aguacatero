let currentStep = 1;
let selectedHabitacion = null;
let selectedServicios = [];
let preciosServicios = {};
let total = 0;
let fechaEntrada = null;
let fechaSalida = null;
let paqueteId = null;  // Nuevo: para manejar el paquete_id

let stripe, elements, cardElement;

// Inicializar Stripe Elements
function initializeStripeElements() {
    if (!stripe) {
        console.log("Inicializando Stripe Elements");
        stripe = Stripe('pk_test_51Q9B1WRvmJhKXph8QE0FpzBgIwDpJsXa5G1t8zayNZTWYjoMbFBI6mJ1Gf9dSnDIT3xgztPNRAop9YZHyiB0CPFP00ryAjfoGg');
        elements = stripe.elements();

        // Crear cada uno de los elementos de Stripe
        cardNumber = elements.create('cardNumber');
        cardExpiry = elements.create('cardExpiry');
        cardCvc = elements.create('cardCvc');
        cardZip = elements.create('postalCode');

        // Montar los elementos en sus respectivos contenedores
        cardNumber.mount('#card-number');
        cardExpiry.mount('#card-expiry');
        cardCvc.mount('#card-cvc');
        cardZip.mount('#card-zip');

        // Mostrar errores en tiempo real
        cardNumber.on('change', handleCardInput);
        cardExpiry.on('change', handleCardInput);
        cardCvc.on('change', handleCardInput);
        cardZip.on('change', handleCardInput);
    }
}

function handleCardInput(event) {
    const displayError = document.getElementById('card-errors');
    displayError.textContent = event.error ? event.error.message : '';
}

async function procesarPagoStripe() {
    const cardholderName = document.getElementById('cardholder-name').value;
    const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumber,
        billing_details: {
            name: cardholderName,
        },
    });

    if (error) {
        document.getElementById('card-errors').textContent = error.message;
    } else {
        // Enviar el ID del método de pago al backend
        const response = await fetch('/api/pagos/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payment_method_id: paymentMethod.id,
                costo_total: total * 100,  // Stripe usa centavos
                id_usuario: localStorage.getItem('userId')
            })
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);  // Confirmación de pago
            // Llamar a confirmarReservacion para crear la reserva
            confirmarReservacion();
            currentStep = 5;  // Avanzar al paso 5
            showStep(currentStep);  // Mostrar el paso de confirmación
        } else {
            alert(`Error en el pago: ${result.error}`);
        }
    }
}



// Capturar parámetros de la URL
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        paquete_id: params.get('paquete_id')
    };
}

async function confirmarReservacion() {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Debes iniciar sesión para hacer una reservación');
        return;
    }

    const decoded = jwt_decode(token);
    const id_usuario = decoded.id || decoded.userId;

    // Validar si todos los datos requeridos están presentes
    if (!selectedHabitacion && !paqueteId) {
        alert('Debes seleccionar una habitación o un paquete.');
        return;
    }

    if (!fechaEntrada || !fechaSalida) {
        alert('Debes seleccionar las fechas de entrada y salida.');
        return;
    }

    if (!document.getElementById('metodo-pago').value) {
        alert('Debes seleccionar un método de pago.');
        return;
    }

    const data = {
        id_usuario: id_usuario,
        id_habitacion: paqueteId ? null : selectedHabitacion?.id,
        id_paquete: paqueteId || null,
        costo_total: total,
        metodo_pago: document.getElementById('metodo-pago').value,
        fecha_ingreso: fechaEntrada,
        fecha_salida: fechaSalida,
        servicios: selectedServicios
    };

    // Enviar la solicitud solo si todos los datos están completos
    const response = await fetch('http://localhost:3000/api/reservaciones/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    if (response.ok) {
        alert(result.message);  // Mostrar el mensaje de éxito enviado por el servidor
    } else {
        console.error('Error al crear reservación:', result);
        alert('Error: ' + result.message);
    }
}




// Validar el formulario de pago con tarjeta
function validarFormularioTarjeta() {
    // Obtener los valores de los campos
    const numeroTarjeta = document.getElementById('card-number').value;
    const nombreTarjeta = document.getElementById('card-name').value;
    const fechaExpiracion = document.getElementById('expiry-date').value;
    const cvc = document.getElementById('cvc').value;

    // Verificar que todos los campos estén llenos
    if (!numeroTarjeta || !nombreTarjeta || !fechaExpiracion || !cvc) {
        alert('Por favor, llena todos los campos del formulario de pago.');
        return false; // Impedir que avance al siguiente paso
    }

    // Si todos los campos están llenos, permite avanzar
    return true;
}

// Avanzar al siguiente paso
function nextStep() {
    if (currentStep === 3) {
        const metodoPago = document.getElementById('metodo-pago').value;

        if (metodoPago === 'tarjeta') {
            // Avanza al paso 4 para mostrar el formulario de pago con tarjeta
            currentStep = 4;
            showStep(currentStep);
            return;
        } else if (metodoPago === 'recepcion') {
            // Si se selecciona pagar en recepción, saltar al paso 5 y confirmar la reservación
            currentStep = 5;
            showStep(currentStep);
            confirmarReservacion(); // Confirmar la reservación solo una vez
            return;
        }
    }

    if (validateStep(currentStep)) {
        currentStep++;
        showStep(currentStep);
    }
}



// Regresar al paso anterior
function prevStep() {
    currentStep--;
    showStep(currentStep);
}

// Mostrar la habitación seleccionada en el paso 4, reutilizando la lógica del paso 2
function displaySelectedHabitacionPaso4() {
    const selectedHabitacionContainerStep4 = document.getElementById('selected-habitacion-container-step-4');
    
    if (selectedHabitacion) {
        selectedHabitacionContainerStep4.innerHTML = `
            <h4>Habitación seleccionada</h4>
            <img src="data:image/jpeg;base64,${selectedHabitacion.imagen}" alt="${selectedHabitacion.nombre}" style="width:200px; height:auto;"/>
            <p><strong>${selectedHabitacion.nombre}</strong></p>
            <p>${selectedHabitacion.descripcion}</p>
            <p>ID: ${selectedHabitacion.id}</p>
            <p class="price">Total: $ ${total.toFixed(2)}</p>
        `;
    } else {
        selectedHabitacionContainerStep4.innerHTML = '<p>No has seleccionado ninguna habitación.</p>';
    }
}

// Modificar showStep para que llame a displaySelectedHabitacionPaso4 cuando estemos en el paso 4
function showStep(step) {
    document.querySelectorAll('.step-content').forEach((el) => {
        el.style.display = 'none';
    });
    document.querySelector(`#step-${step}`).style.display = 'block';

    // Si estamos en el paso 2 o en el paso 4, mostrar la habitación seleccionada
    if (step === 2) {
        displaySelectedHabitacion(); // Asegúrate de que la función se llame en el paso 2
        calcularPrecioTotal();
    }
    
    if (step === 4) {
        displaySelectedHabitacion(); // Llamada a la función de paso 4 específica
        initializeStripeElements(); // Inicializar Stripe Elements en el paso 4
    }

    updateStepsIndicator(step);
}


// Validar el paso actual
function validateStep(step) {
    if (step === 1) {
        // Si es una reservación con un paquete, no se requiere seleccionar habitación
        if (!paqueteId && !selectedHabitacion) {
            alert("Debes seleccionar una habitación.");
            return false;
        }

        const entrada = document.getElementById('fecha-entrada').value;
        const salida = document.getElementById('fecha-salida').value;

        // Validar que se hayan seleccionado ambas fechas
        if (!entrada || !salida) {
            alert("Debes seleccionar una fecha de entrada y salida.");
            return false;
        }

        const fechaHoy = new Date().toISOString().split('T')[0]; // Obtener la fecha de hoy en formato YYYY-MM-DD

        // Validar que la fecha de entrada no sea anterior a la de hoy
        if (entrada < fechaHoy) {
            alert("La fecha de entrada no puede ser anterior a hoy.");
            return false;
        }

        // Validar que la fecha de salida sea mayor que la fecha de entrada
        if (entrada >= salida) {
            alert("La fecha de salida debe ser posterior a la fecha de entrada.");
            return false;
        }

        // Almacenar las fechas si son válidas
        fechaEntrada = entrada;
        fechaSalida = salida;

        // Calcular el precio total cuando las fechas son válidas
        calcularPrecioTotal();  // <-- Añadir esta línea
    }
    return true;
}


// Actualizar el indicador de pasos
function updateStepsIndicator(step) {
    document.querySelectorAll('.steps-indicator .step').forEach((el, index) => {
        if (index < step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

// Cargar habitaciones desde la API
function loadHabitaciones() {
    fetch('/api/habitaciones')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('habitaciones-container');
            container.innerHTML = '';
            data.forEach(habitacion => {
                const habitacionCard = document.createElement('div');
                habitacionCard.classList.add('habitacion-card');
                habitacionCard.innerHTML = `
                    <img src="data:image/jpeg;base64,${habitacion.imagen}" alt="${habitacion.nombre}" />
                    <h4>${habitacion.nombre}</h4>
                    <p>${habitacion.descripcion}</p>
                    <p class="price">Precio: $ ${habitacion.precio}</p>
                    <button onclick="selectHabitacion(${habitacion.id}, '${habitacion.nombre}', '${habitacion.descripcion}', \`${habitacion.imagen}\`, ${habitacion.precio})">Seleccionar</button>

                `;
                container.appendChild(habitacionCard);
            });

            // Actualizar los botones después de cargar las habitaciones
            updateButtonsState();  // <--- Añadir esta línea
        })
        .catch(error => {
            console.error('Error al cargar las habitaciones:', error);
            alert('Error al cargar habitaciones');
        });
}


// Seleccionar habitación
// Seleccionar habitación
function selectHabitacion(id, nombre, descripcion, imagen, precio) {
    // Comprobar si el usuario está autenticado
    if (!isAuthenticated()) {
        alert('Debes iniciar sesión para comenzar con una reserva');
        window.location.href = 'login.html'; // Redirigir a la página de inicio de sesión
        return;
    }

    console.log('Datos de la habitación seleccionada:', { id, nombre, descripcion, imagen, precio });

    if (!id || !precio) {
        console.error('ID o precio no definidos:', { id, precio });
        alert('Error al seleccionar la habitación, faltan datos.');
        return;
    }

    // Almacenar todos los detalles de la habitación seleccionada, incluyendo la imagen
    selectedHabitacion = { id, nombre, descripcion, imagen, precio };
    console.log('selectedHabitacion después de la selección:', selectedHabitacion);

    total = precio;

    // Ahora que la habitación está seleccionada, invocamos setMinFechaEntrada()
    setMinFechaEntrada();

    // Actualizar los botones
    updateButtonsState();

    alert(`Has seleccionado la habitación con Número: ${id}, Precio: $${precio}`);
}

function updateButtonsState() {
    const buttons = document.querySelectorAll('.habitacion-card button');  // Seleccionar todos los botones de habitaciones

    buttons.forEach(button => {
        const onclickAttr = button.getAttribute('onclick');  // Obtener el atributo 'onclick'
        
        // Verificar que el atributo 'onclick' y el ID existan antes de continuar
        if (onclickAttr) {
            const habitacionIdMatch = onclickAttr.match(/\d+/);  // Intentar extraer el ID de la habitación del atributo `onclick`
            
            if (habitacionIdMatch) {
                const habitacionId = parseInt(habitacionIdMatch[0], 10);  // Convertir a entero

                // Solo continuar si `selectedHabitacion` tiene un ID válido
                if (selectedHabitacion && selectedHabitacion.id === habitacionId) {
                    button.textContent = 'Seleccionada';  // Cambiar el texto del botón
                    button.disabled = true;  // Deshabilitar el botón de la habitación seleccionada
                    button.classList.add('selected');  // Agregar la clase 'selected' al botón seleccionado
                } else {
                    button.textContent = 'Seleccionar';  // Cambiar de nuevo a "Seleccionar" si no es la habitación elegida
                    button.disabled = false;  // Habilitar los otros botones
                    button.classList.remove('selected');  // Quitar la clase 'selected' de los demás botones
                }
            } else {
                console.error("No se pudo encontrar el ID de la habitación en el botón:", button);
            }
        } else {
            console.error("El botón no tiene un atributo 'onclick' válido:", button);
        }
    });
}


// <img src="data:image/*;base64,${selectedHabitacion.imagen}" alt="${selectedHabitacion.nombre}" style="width:200px; height:auto;"/>
// Mostrar la habitación seleccionada en el paso 2
function displaySelectedHabitacion() {
    const selectedHabitacionContainer = document.getElementById('selected-habitacion-container');

    if (selectedHabitacion) {
        selectedHabitacionContainer.innerHTML = `
            <h4>Habitación seleccionada</h4>
            <p><strong>${selectedHabitacion.nombre}</strong></p>
            <p>${selectedHabitacion.descripcion}</p>
            <p>Número de habitación: ${selectedHabitacion.id}</p>
            <p class="price">Total: $ ${selectedHabitacion.precio.toFixed(2)}</p>
        `;
    } else {
        selectedHabitacionContainer.innerHTML = '<p>No has seleccionado ninguna habitación.</p>';
    }
}


// Establecer la fecha mínima en el campo de entrada y deshabilitar fechas reservadas
async function setMinFechaEntrada() {
    const fechaHoy = new Date().toISOString().split('T')[0];  // Fecha actual en formato YYYY-MM-DD

    let endpoint;
    if (paqueteId) {
        // Si es un paquete, obtenemos las fechas reservadas para ese paquete
        endpoint = `/api/reservaciones/fechas-reservadas-paquete/${paqueteId}`;
    } else if (selectedHabitacion && selectedHabitacion.id) {
        // Si es una habitación, obtenemos las fechas reservadas de la habitación seleccionada
        endpoint = `/api/reservaciones/fechas-reservadas/${selectedHabitacion.id}`;
    } else {
        console.error("No se ha seleccionado una habitación o paquete.");
        return;
    }

    if (endpoint) {
        try {
            const response = await fetch(endpoint);
            const fechasReservadas = await response.json();

            // Mapeamos las fechas reservadas para deshabilitarlas en el calendario
            const fechasDeshabilitadas = fechasReservadas.map(f => {
                const fechaInicio = new Date(f.fecha_ingreso).toISOString().split('T')[0];
                const fechaFin = new Date(f.fecha_salida).toISOString().split('T')[0];
                return { from: fechaInicio, to: fechaFin };
            });

            // Inicializar Flatpickr para los campos de fecha de entrada y salida
            flatpickr("#fecha-entrada", {
                minDate: fechaHoy,  // La fecha mínima es hoy
                disable: fechasDeshabilitadas,  // Deshabilitar las fechas reservadas
                onChange: function(selectedDates) {
                    const fechaSeleccionada = selectedDates[0].toISOString().split('T')[0];
                    // También actualiza el campo de salida para tener la misma lógica
                    flatpickr("#fecha-salida", {
                        minDate: fechaSeleccionada,
                        disable: fechasDeshabilitadas
                    });
                }
            });

            // Flatpickr para fecha de salida, en caso de que se quiera seleccionar de inmediato
            flatpickr("#fecha-salida", {
                minDate: fechaHoy,
                disable: fechasDeshabilitadas
            });

        } catch (error) {
            console.error('Error al cargar las fechas reservadas:', error);
        }
    }
}

// Cargar servicios desde la API
function loadServicios() {
    fetch('/api/servicios')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('servicios-container');
            container.innerHTML = '';
            data.forEach(servicio => {
                const servicioCard = document.createElement('div');
                servicioCard.classList.add('servicio-card');
                
                // Almacenar el precio del servicio en preciosServicios
                preciosServicios[servicio.id] = servicio.costo;
                
                servicioCard.innerHTML = `
                    <img src="data:image/jpeg;base64,${servicio.imagen}" alt="${servicio.nombre}" />
                    <h4>${servicio.nombre}</h4>
                    <p class="price">Precio: Q${servicio.costo}</p>
                    <input type="checkbox" value="${servicio.id}" data-costo="${servicio.costo}" onchange="toggleServicio(${servicio.id}, ${servicio.costo})">
                `;
                container.appendChild(servicioCard);
            });
        })
        .catch(error => {
            console.error('Error al cargar los servicios:', error);
            alert('Error al cargar servicios');
        });
}



// Calcular precios
// Calcular precios con desglose detallado
function calcularPrecioTotal() {
    if (!fechaEntrada || !fechaSalida) {
        console.error("No se han seleccionado las fechas de entrada y salida.");
        return;
    }

    const fecha1 = new Date(fechaEntrada);
    const fecha2 = new Date(fechaSalida);
    const cantidadNoches = Math.ceil((fecha2.getTime() - fecha1.getTime()) / (1000 * 3600 * 24));

    // Cálculo del costo de la habitación
    let costoBaseHabitacion = selectedHabitacion ? selectedHabitacion.precio : 0;
    let totalHabitacion = costoBaseHabitacion * cantidadNoches;

    // Definir el porcentaje adicional por noche para los servicios
    const porcentajeAdicionalPorNoche = 0.1;

    // Cálculo de los costos de los servicios
    let costoServiciosBase = 0;
    let totalServicios = 0;

    selectedServicios.forEach(servicioId => {
        if (preciosServicios[servicioId]) {
            const costoBase = preciosServicios[servicioId];
            const costoServicioConExtra = costoBase + (costoBase * porcentajeAdicionalPorNoche * cantidadNoches);
            costoServiciosBase += costoBase;
            totalServicios += costoServicioConExtra;
        }
    });

    if (paqueteId) {
        fetch(`/api/paquetes/${paqueteId}`)
            .then(response => response.json())
            .then(paquete => {
                total = (paquete.precio * cantidadNoches) + totalServicios;
                actualizarResumenPrecio(costoBaseHabitacion, cantidadNoches, totalHabitacion, costoServiciosBase, totalServicios);
            })
            .catch(error => {
                console.error("Error al obtener el precio del paquete:", error);
            });
    } else {
        total = totalHabitacion + totalServicios;
        actualizarResumenPrecio(costoBaseHabitacion, cantidadNoches, totalHabitacion, costoServiciosBase, totalServicios);
    }
}

// Función para actualizar el desglose del precio en la UI
function actualizarResumenPrecio(costoBaseHabitacion, cantidadNoches, totalHabitacion, costoServiciosBase, totalServicios) {
    document.getElementById("costo-base-habitacion").textContent = `$${costoBaseHabitacion.toFixed(2)}`;
    document.getElementById("cantidad-noches").textContent = cantidadNoches;
    document.getElementById("total-habitacion").textContent = `$${totalHabitacion.toFixed(2)}`;
    document.getElementById("costo-servicios-base").textContent = `$${costoServiciosBase.toFixed(2)}`;
    document.getElementById("total-servicios").textContent = `$${totalServicios.toFixed(2)}`;
    document.getElementById("total-price").textContent = `$${(totalHabitacion + totalServicios).toFixed(2)}`;
}



// Alternar selección de servicios adicionales
function toggleServicio(id, costo) {
    const index = selectedServicios.indexOf(id);
    if (index > -1) {
        // Si el servicio ya está seleccionado, lo quitamos
        selectedServicios.splice(index, 1);
    } else {
        // Si no está seleccionado, lo añadimos
        selectedServicios.push(id);
    }

    // Recalcular el precio total
    calcularPrecioTotal();
}



// Actualizar el resumen de la reserva
function updateResumen() {
    const resumenContainer = document.getElementById('resumen-container');
    resumenContainer.innerHTML = `
        <p>Habitación seleccionada: $ ${selectedHabitacion.precio}</p>
        <p>Servicios adicionales: $ ${selectedServicios.reduce((acc, servicio) => acc + servicio.costo, 0)}</p>
        <p>Total: $${total}</p>
    `;
}


// Inicializar el wizard
function initWizard() {
    const urlParams = new URLSearchParams(window.location.search);
    const habitacionId = urlParams.get('id');

    if (habitacionId) {
        // Seleccionar automáticamente la habitación si el ID está en la URL
        selectHabitacionPorId(habitacionId);
    }

    setMinFechaEntrada();  // Establecer la fecha mínima en los campos de fecha
    loadHabitaciones();
    loadServicios();
    
    // No calcular precio hasta que se seleccionen las fechas
    showStep(1);
}


function selectHabitacionPorId(id) {
fetch(`/api/habitaciones/${id}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error al obtener la habitación: ${response.statusText}`);
        }
        return response.json();
    })
    .then(habitacion => {
        console.log('Habitación obtenida:', habitacion);  // Verificar cómo se reciben los datos

        // Verificar que las propiedades necesarias existan
        if (habitacion && habitacion.id && habitacion.nombre && habitacion.descripcion && habitacion.precio) {
            // Desestructurar el objeto para obtener los datos
            const { id, nombre, descripcion, precio } = habitacion;
            selectHabitacion(id, nombre, descripcion, null, precio);  // Pasamos null para la imagen
        } else {
            console.error('Datos incompletos de la habitación:', habitacion);
            alert('Los datos de la habitación están incompletos.');
        }
    })
    .catch(error => {
        console.error('Error al seleccionar la habitación:', error);
        alert('No se pudo cargar la habitación seleccionada.');
    });
}


// Función para inicializar el wizard y manejar la lógica según el paquete_id
document.addEventListener('DOMContentLoaded', () => {
    const { paquete_id } = getQueryParams();
    paqueteId = paquete_id;  // Asignar el paquete_id si existe

    if (paqueteId) {
        // Si es una reservación para un paquete, no pedimos seleccionar habitación
        console.log(`Reservando con el paquete: ${paqueteId}`);
        
        // Omitir selección de habitación y pasar directamente a fechas y pago
        document.getElementById('habitaciones-container').style.display = 'none';
        cargarServicios();  // Cargar solo los servicios
    } else {
        // Mostrar la lógica normal de selección de habitación si no hay paquete
        loadHabitaciones();
        loadServicios();
    }

    setMinFechaEntrada();  // Establecer la fecha mínima en los campos de fecha
    showStep(1);
});

// Función para verificar si el usuario ha iniciado sesión
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return token !== null; // Si hay un token en el localStorage, consideramos que el usuario está autenticado
}



document.addEventListener('DOMContentLoaded', initWizard);
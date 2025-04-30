#!/bin/bash

# Crear el directorio para Oracle Instant Client si no existe
mkdir -p instantclient/instantclient_21_16

# Función para descargar desde Google Drive
download_from_drive() {
    FILE_ID=$1
    FILE_NAME=$2
    wget --no-check-certificate "https://drive.google.com/uc?export=download&id=${FILE_ID}" -O "instantclient/instantclient_21_16/$FILE_NAME"
}

# Descarga de los archivos necesarios
download_from_drive "1u_vgyWY3mO_FfouL1LOICzdFNhWObE9K" "libclntsh.so"
download_from_drive "1YNB1immIYWep2QORD7gyNdFsOS0qXT2G" "libociei.so"
download_from_drive "13ME6YksV0fDPZ8Zj2dHFEjRTPQ9TDp5D" "libnnz21.so"
download_from_drive "18O1O1CTIduJENAxISNCoVIzDH0lh9vW8" "libclntsh.so.21.1"  # Reemplaza con el nombre real

# Asegurar permisos de ejecución en las bibliotecas descargadas
chmod 755 instantclient/instantclient_21_16/*.so

# Verificar el contenido del directorio y el LD_LIBRARY_PATH
echo "Contenido de instantclient/instantclient_21_16:"
ls -l instantclient/instantclient_21_16
echo "LD_LIBRARY_PATH es $LD_LIBRARY_PATH"

# engine-package Specification

## Purpose

Define el contrato del paquete que contiene el motor de reglas: cómo lo consumen el navegador y el servidor, qué publica cada superficie de su API, y qué información no puede alcanzarse desde el lado del cliente. Es la frontera que impide que la implementación de un juego de información oculta filtre esa información por descuido.

## Requirements

### Requirement: El motor se consume sin paso de compilación

El paquete del motor SHALL ser resoluble y ejecutable tanto por un empaquetador de navegador como por el runtime del servidor sin que exista un artefacto compilado previo. No SHALL existir un paso de build cuya omisión rompa a los consumidores.

#### Scenario: Consumo desde el servidor sin build previo

- **WHEN** un workspace del servidor importa el paquete del motor en una copia recién instalada del repositorio, sin haber ejecutado ningún build
- **THEN** el import resuelve y el código del motor se ejecuta correctamente

#### Scenario: Consumo desde el navegador sin build previo

- **WHEN** el workspace del cliente importa el paquete del motor y se levanta su servidor de desarrollo, sin haber ejecutado ningún build del motor
- **THEN** el import resuelve y el símbolo importado está disponible en tiempo de ejecución

### Requirement: La superficie por defecto no expone estado oculto

La superficie por defecto del paquete SHALL exponer únicamente lo que un jugador puede conocer: su vista proyectada, los comandos que puede emitir, y las derivaciones calculables a partir de esa vista. NO SHALL exponer el estado autoritativo de la partida ni ningún tipo que dé acceso a información oculta —mazo, carta apartada o manos ajenas.

#### Scenario: El estado autoritativo es inalcanzable desde la superficie por defecto

- **WHEN** un consumidor intenta importar el tipo del estado autoritativo desde la superficie por defecto del paquete
- **THEN** la verificación de tipos falla y el consumidor no compila

#### Scenario: La vista proyectada sí es alcanzable

- **WHEN** un consumidor importa el tipo de la vista de jugador desde la superficie por defecto
- **THEN** la verificación de tipos pasa y el tipo es utilizable

### Requirement: La autoridad completa vive tras un subpath explícito

El estado autoritativo y las operaciones que lo transforman SHALL publicarse en un subpath distinto del por defecto, de modo que acceder a ellos sea un acto explícito y visible en el código que lo hace.

#### Scenario: El servidor accede a la autoridad completa

- **WHEN** el workspace del servidor importa el estado autoritativo desde el subpath de autoridad
- **THEN** la verificación de tipos pasa y el símbolo es utilizable

#### Scenario: El cliente no usa el subpath de autoridad

- **WHEN** se revisa el código del workspace del cliente
- **THEN** ningún módulo importa desde el subpath de autoridad

### Requirement: El motor no tiene dependencias de runtime

El paquete del motor NO SHALL declarar dependencias de runtime, ni referirse a APIs propias del navegador o del servidor. Su única entrada de datos no deterministas SHALL ser inyectada por quien lo invoca.

#### Scenario: Sin dependencias declaradas

- **WHEN** se inspecciona el manifiesto del paquete del motor
- **THEN** su lista de dependencias de runtime está vacía

#### Scenario: Sin APIs específicas de un entorno

- **WHEN** se verifican los tipos del motor sin las librerías de navegador ni las del servidor disponibles
- **THEN** la verificación pasa sin errores

### Requirement: El código del motor usa solo sintaxis borrable

El código del motor SHALL restringirse a construcciones de TypeScript que se eliminen sin transformar el código, para poder ejecutarse directamente desde su fuente. Las construcciones que emiten código en tiempo de ejecución SHALL rechazarse en la verificación de tipos, no en la ejecución.

#### Scenario: Una construcción no borrable se rechaza al verificar tipos

- **WHEN** se introduce en el motor una construcción de TypeScript que emite código en tiempo de ejecución
- **THEN** la verificación de tipos falla señalando la construcción

#### Scenario: Los valores del dominio se modelan sin construcciones no borrables

- **WHEN** el motor necesita un conjunto cerrado de valores del dominio con su valor numérico asociado
- **THEN** lo expresa con una forma borrable que conserva exhaustividad y estrechamiento de tipos

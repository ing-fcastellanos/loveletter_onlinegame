## Purpose

Define qué puede representar el estado de una partida de Love Letter y, sobre todo, qué no puede: los estados que el juego no admite no se pueden construir. Es el vocabulario sobre el que se escriben todas las reglas del motor.

## ADDED Requirements

### Requirement: Los ocho personajes y su valor

El modelo SHALL definir exactamente los ocho personajes de la edición clásica, cada uno con un valor distinto: Guardia 1, Sacerdote 2, Barón 3, Sirvienta 4, Príncipe 5, Rey 6, Condesa 7 y Princesa 8.

#### Scenario: Cada personaje tiene su valor del juego clásico

- **WHEN** se consulta el valor de cada uno de los ocho personajes
- **THEN** los valores son exactamente del 1 al 8, uno por personaje, en el orden del juego clásico

#### Scenario: Una carta ajena a la edición clásica no es representable

- **WHEN** se intenta representar una carta que no es uno de los ocho personajes
- **THEN** la verificación de tipos la rechaza

### Requirement: Un jugador activo sostiene exactamente una carta

Cada jugador que sigue en la ronda SHALL sostener exactamente una carta como parte de su estado. El modelo NO SHALL poder representar a un jugador activo sin carta ni con más de una: la segunda carta de un turno no pertenece al jugador, sino al turno.

#### Scenario: Un jugador activo sin carta no es representable

- **WHEN** se intenta representar a un jugador activo que no sostiene ninguna carta
- **THEN** la verificación de tipos lo rechaza

#### Scenario: Un jugador con dos cartas no es representable, tenga o no el turno

- **WHEN** se intenta representar a cualquier jugador activo sosteniendo dos cartas
- **THEN** la verificación de tipos lo rechaza

### Requirement: La carta robada existe solo durante la fase de jugar

El turno SHALL tener dos fases: antes de robar y después de robar. La carta robada SHALL existir únicamente en la segunda fase y únicamente para el jugador que tiene el turno. En esa fase, la mano del jugador en turno SHALL ser exactamente dos cartas —la que sostiene y la robada—, y la de cualquier otro jugador activo SHALL seguir siendo una.

#### Scenario: Antes de robar no hay carta robada

- **WHEN** se intenta representar un turno en la fase anterior a robar que lleve una carta robada
- **THEN** la verificación de tipos lo rechaza

#### Scenario: Tras robar, el jugador en turno tiene dos cartas en la mano

- **WHEN** el turno está en la fase posterior a robar
- **THEN** la mano del jugador en turno son su carta sostenida y la carta robada

#### Scenario: Tras robar, los demás jugadores siguen con una carta

- **WHEN** el turno está en la fase posterior a robar
- **THEN** la mano de cualquier otro jugador activo es su única carta sostenida

### Requirement: Un jugador eliminado no tiene carta, pero conserva sus descartes

Un jugador eliminado de la ronda NO SHALL tener carta. Sus descartes SHALL seguir formando parte del estado de la ronda, porque siguen sobre la mesa y son información pública.

#### Scenario: Un jugador eliminado con carta no es representable

- **WHEN** se intenta representar a un jugador eliminado que sostiene una carta
- **THEN** la verificación de tipos lo rechaza

#### Scenario: Un jugador eliminado no tiene mano

- **WHEN** se consulta la mano de un jugador eliminado
- **THEN** el resultado indica que no tiene mano

#### Scenario: Los descartes de un jugador eliminado siguen disponibles

- **WHEN** un jugador está eliminado
- **THEN** sus descartes siguen presentes en el estado de la ronda

### Requirement: Las fichas de afecto pertenecen a la partida, no a la ronda

El estado SHALL separar lo que dura toda la partida —la identidad de cada jugador y sus fichas de afecto— de lo que dura una sola ronda: carta, descartes, eliminación, protección, mazo y turno. Iniciar una ronda SHALL poder hacerse construyendo únicamente la parte de ronda, sin tocar las fichas.

#### Scenario: El estado de ronda de un jugador no representa fichas

- **WHEN** se intenta representar fichas de afecto dentro del estado de ronda de un jugador
- **THEN** la verificación de tipos lo rechaza

#### Scenario: Los datos de partida de un jugador no representan carta ni descartes

- **WHEN** se intenta representar una carta o descartes dentro de los datos de partida de un jugador
- **THEN** la verificación de tipos lo rechaza

### Requirement: Las cartas descubiertas son ninguna o exactamente tres

Las cartas que se descubren boca arriba al preparar una ronda SHALL ser exactamente tres o ninguna. Ninguna otra cantidad SHALL ser representable.

#### Scenario: Tres cartas descubiertas son representables

- **WHEN** se representa una ronda con tres cartas descubiertas
- **THEN** la verificación de tipos la acepta

#### Scenario: Ninguna carta descubierta es representable

- **WHEN** se representa una ronda sin cartas descubiertas
- **THEN** la verificación de tipos la acepta

#### Scenario: Otra cantidad de cartas descubiertas no es representable

- **WHEN** se intenta representar una ronda con una cantidad de cartas descubiertas distinta de cero y de tres
- **THEN** la verificación de tipos la rechaza

### Requirement: El estado es inmutable

Ninguna parte del estado de una partida SHALL poder modificarse en sitio: ni sus campos ni sus colecciones, a ninguna profundidad. Todo cambio SHALL expresarse produciendo un estado nuevo.

#### Scenario: Modificar un campo del estado no compila

- **WHEN** se intenta asignar un valor nuevo a un campo del estado, por ejemplo las fichas de un jugador
- **THEN** la verificación de tipos lo rechaza

#### Scenario: Modificar una colección del estado no compila

- **WHEN** se intenta añadir o quitar elementos de una colección del estado, por ejemplo los descartes de un jugador
- **THEN** la verificación de tipos lo rechaza

### Requirement: Una jugada ilegal se representa como valor

El resultado de toda operación que las reglas puedan rechazar SHALL ser un valor que distingue explícitamente el éxito de la violación. Una violación de reglas NO SHALL señalarse lanzando una excepción. Cada violación SHALL identificar la regla violada mediante un código y los datos del caso, sin texto libre, para que la capa de presentación la explique en su propio idioma.

#### Scenario: El valor de un resultado no se puede usar sin distinguir antes el éxito

- **WHEN** se intenta usar el valor de un resultado sin haber comprobado que es un éxito
- **THEN** la verificación de tipos lo rechaza

#### Scenario: La violación identifica la regla y sus datos, sin texto libre

- **WHEN** se representa una violación de reglas
- **THEN** lleva el código de la regla violada y los datos del caso, y no admite un mensaje de texto

## Purpose

Define el registro de eventos de una partida y cómo declara su audiencia, para que el conocimiento privado de un jugador se derive de filtrar ese registro en vez de mantenerse en una estructura aparte de quién sabe qué.

## ADDED Requirements

### Requirement: Todo evento declara su audiencia

Todo evento del registro SHALL declarar su audiencia: pública, o restringida a una lista explícita de jugadores. No SHALL existir un evento sin audiencia declarada.

#### Scenario: Un evento público es visible para cualquiera

- **WHEN** un evento declara audiencia pública
- **THEN** ese evento se considera visible para cualquier jugador de la partida

#### Scenario: Un evento restringido solo es visible para su lista de jugadores

- **WHEN** un evento declara su audiencia como una lista de jugadores
- **THEN** ese evento se considera visible únicamente para los jugadores de esa lista, sin importar cuántos sean

### Requirement: Robar una carta es un evento restringido a quien la robó

El evento de que un jugador robó una carta SHALL identificar al jugador y la carta robada, y SHALL declarar como audiencia únicamente a ese jugador.

#### Scenario: El evento de robo identifica la carta

- **WHEN** se registra que un jugador robó una carta
- **THEN** el evento identifica al jugador y la carta que robó

#### Scenario: Solo quien robó es la audiencia del evento

- **WHEN** se registra que un jugador robó una carta
- **THEN** la audiencia del evento es únicamente ese jugador

### Requirement: Descartar una carta y cambiar de turno son eventos públicos

El evento de que un jugador descartó una carta SHALL identificar al jugador y la carta descartada, y SHALL ser público. El evento de que el turno pasó a otro jugador SHALL identificar a ese jugador y SHALL ser público.

#### Scenario: El evento de descarte es público

- **WHEN** se registra que un jugador descartó una carta
- **THEN** el evento es público e identifica al jugador y la carta descartada

#### Scenario: El evento de cambio de turno es público

- **WHEN** se registra que el turno pasó a otro jugador
- **THEN** el evento es público e identifica a ese jugador

### Requirement: El inicio de una ronda es un evento público

El evento de que empezó una ronda SHALL identificar el número de ronda y quién la empieza, y SHALL ser público.

#### Scenario: El evento de inicio de ronda identifica la ronda y quién empieza

- **WHEN** se registra que empezó una ronda
- **THEN** el evento es público e identifica el número de esa ronda y el jugador que la empieza

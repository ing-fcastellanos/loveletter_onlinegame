## Purpose

Define cómo una partida avanza turno a turno —robar y descartar— sin resolver ningún efecto de carta: quién puede jugar, qué rechaza el motor, y cómo pasa el turno al siguiente jugador.

## Requirements

### Requirement: Solo el jugador del turno puede actuar

Un comando de un jugador que no es quien tiene el turno SHALL rechazarse identificando al jugador que lo intentó y a quien sí tiene el turno, sin lanzar excepciones.

#### Scenario: Robar fuera de turno se rechaza

- **WHEN** un jugador que no tiene el turno intenta robar
- **THEN** el resultado es un rechazo que identifica a ese jugador y a quien sí tiene el turno, y no se lanza ninguna excepción

#### Scenario: Descartar fuera de turno se rechaza

- **WHEN** un jugador que no tiene el turno intenta descartar
- **THEN** el resultado es un rechazo que identifica a ese jugador y a quien sí tiene el turno, y no se lanza ninguna excepción

### Requirement: Robar exige estar en la fase de robar

Un jugador que ya robó en su turno actual NO SHALL poder robar de nuevo. El intento SHALL rechazarse identificando al jugador, sin lanzar excepciones.

#### Scenario: Robar dos veces en el mismo turno se rechaza

- **WHEN** el jugador del turno, que ya robó, intenta robar otra vez
- **THEN** el resultado es un rechazo que lo identifica, y no se lanza ninguna excepción

### Requirement: Descartar exige haber robado

Un jugador que todavía no robó en su turno actual NO SHALL poder descartar. El intento SHALL rechazarse identificando al jugador, sin lanzar excepciones.

#### Scenario: Descartar antes de robar se rechaza

- **WHEN** el jugador del turno, que todavía no robó, intenta descartar
- **THEN** el resultado es un rechazo que lo identifica, y no se lanza ninguna excepción

### Requirement: Robar exige que el mazo no esté vacío

Un intento de robar con el mazo restante vacío SHALL rechazarse identificando al jugador, sin lanzar excepciones.

#### Scenario: Robar con el mazo vacío se rechaza

- **WHEN** el jugador del turno intenta robar y el mazo restante de la ronda está vacío
- **THEN** el resultado es un rechazo que lo identifica, y no se lanza ninguna excepción

### Requirement: Descartar exige tener la carta en mano

Un intento de descartar una carta que el jugador no sostiene ni acaba de robar SHALL rechazarse identificando al jugador y la carta, sin lanzar excepciones.

#### Scenario: Descartar una carta ajena a la mano se rechaza

- **WHEN** el jugador del turno, ya en la fase de descartar, intenta descartar una carta que no es ninguna de las dos que tiene en mano
- **THEN** el resultado es un rechazo que identifica al jugador y esa carta, y no se lanza ninguna excepción

### Requirement: Robar mueve la carta superior del mazo a la mano del jugador

Robar SHALL tomar la carta superior del mazo restante de la ronda como la carta robada del turno. El resto del mazo y la mano de cualquier otro jugador NO SHALL alterarse.

#### Scenario: La carta robada es la superior del mazo

- **WHEN** el jugador del turno roba
- **THEN** la carta robada es la que estaba en la posición superior del mazo restante antes de robar

#### Scenario: El resto del mazo y las demás manos no cambian

- **WHEN** el jugador del turno roba
- **THEN** el mazo restante pierde solo esa carta, en el mismo orden, y ningún otro jugador cambia su mano

### Requirement: Descartar dispensa la carta elegida y conserva la otra

Descartar SHALL mover la carta elegida a los descartes del jugador. La otra de las dos cartas que tenía SHALL quedar como su única carta en mano.

#### Scenario: La carta descartada se suma a los descartes del jugador

- **WHEN** el jugador del turno descarta una de sus dos cartas
- **THEN** esa carta se agrega a sus descartes

#### Scenario: La carta no descartada queda como la única en mano

- **WHEN** el jugador del turno descarta una de sus dos cartas
- **THEN** la otra carta queda como la única que sostiene

### Requirement: Descartar avanza el turno al siguiente jugador activo

Tras un descarte, el turno SHALL pasar al siguiente jugador activo en orden de asiento —saltando a cualquier jugador eliminado— y SHALL quedar en la fase de robar.

#### Scenario: El turno pasa al siguiente jugador activo en orden de asiento

- **WHEN** un jugador descarta
- **THEN** el turno pasa al siguiente jugador activo según el orden de asiento de la ronda, en la fase de robar

#### Scenario: Un jugador eliminado se salta al avanzar el turno

- **WHEN** un jugador descarta y el siguiente en orden de asiento está eliminado
- **THEN** el turno pasa al primer jugador activo después de él, no al eliminado

### Requirement: Cada comando produce sus eventos con la audiencia correcta

Robar SHALL producir un evento de carta robada restringido a quien robó. Descartar SHALL producir un evento de carta descartada y un evento de cambio de turno, ambos públicos.

#### Scenario: Robar produce el evento restringido a quien robó

- **WHEN** un jugador roba
- **THEN** se produce un evento de carta robada cuya audiencia es únicamente ese jugador

#### Scenario: Descartar produce sus dos eventos públicos

- **WHEN** un jugador descarta
- **THEN** se produce un evento público de carta descartada y un evento público de cambio de turno

### Requirement: El estado nunca se modifica en sitio

Aplicar un comando SHALL producir un estado nuevo. El estado que recibió el comando SHALL permanecer exactamente igual después de aplicarlo.

#### Scenario: El estado original queda intacto tras aplicar un comando

- **WHEN** se aplica un comando válido sobre un estado
- **THEN** ese estado original, comparado después, sigue siendo idéntico al que era antes

### Requirement: Una ronda se juega por turnos hasta vaciar el mazo

Robando y descartando por turnos, sin resolver ningún efecto de carta, SHALL poder jugarse una ronda completa hasta que el mazo restante quede vacío.

#### Scenario: Una ronda completa se juega hasta vaciar el mazo

- **WHEN** los jugadores de una ronda roban y descartan por turnos, sin interrupciones ni jugadas ilegales
- **THEN** el mazo restante llega a quedar vacío sin que ningún comando se rechace

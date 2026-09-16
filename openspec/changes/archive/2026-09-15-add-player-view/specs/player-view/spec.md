## Purpose

Define qué puede ver un jugador concreto de una partida en curso: su propia mano, lo público de cada rival y del turno, y nada de lo que el juego le oculta — de forma que lo oculto esté ausente de la vista, no censurado dentro de ella.

## ADDED Requirements

### Requirement: La vista oculta la carta apartada y el orden del mazo

La proyección SHALL exponer el mazo restante únicamente como una cantidad. Ningún campo de la vista SHALL contener la carta apartada de la ronda ni el orden o el contenido del mazo restante.

#### Scenario: El mazo se expone solo como cantidad

- **WHEN** se proyecta la vista de un jugador
- **THEN** la vista indica cuántas cartas quedan en el mazo, y ese número coincide con el tamaño del mazo restante de la ronda

#### Scenario: La carta apartada no aparece

- **WHEN** se proyecta la vista de un jugador, para cualquier jugador de la partida
- **THEN** ningún campo de la vista contiene la carta apartada de esa ronda

### Requirement: El jugador ve su propia mano completa

El asiento propio, mientras esté activo, SHALL exponer su mano completa: una carta cuando no es su turno o está en la fase de robar, dos cuando está en la fase de jugar de su propio turno.

#### Scenario: Una carta fuera de la fase de jugar

- **WHEN** un jugador activo proyecta su propia vista y no está en la fase de jugar de su turno
- **THEN** su asiento expone exactamente la carta que sostiene

#### Scenario: Dos cartas en la fase de jugar del propio turno

- **WHEN** un jugador activo proyecta su propia vista durante la fase de jugar de su propio turno
- **THEN** su asiento expone las dos cartas que tiene en mano: la que sostenía y la que robó

### Requirement: Los rivales no revelan su carta

Un asiento de un rival activo SHALL indicar que sostiene una carta sin revelar cuál es, y SHALL indicar si está protegido por la Sirvienta.

#### Scenario: Un rival activo no revela su carta

- **WHEN** se proyecta la vista de un jugador y hay un rival activo
- **THEN** el asiento de ese rival indica que sostiene una carta, y ningún campo de ese asiento contiene el valor de esa carta

#### Scenario: La protección de un rival es visible

- **WHEN** un rival activo está protegido por la Sirvienta
- **THEN** su asiento en cualquier vista lo refleja

### Requirement: Un jugador eliminado solo expone sus descartes

El asiento de un jugador eliminado —propio o rival— SHALL exponer únicamente sus descartes. Ningún campo de ese asiento SHALL describir una carta en mano.

#### Scenario: Un rival eliminado

- **WHEN** se proyecta la vista de un jugador y hay un rival eliminado
- **THEN** el asiento de ese rival expone sus descartes y no expone ninguna carta en mano

#### Scenario: El propio jugador eliminado

- **WHEN** un jugador eliminado proyecta su propia vista
- **THEN** su asiento expone sus descartes y no expone ninguna carta en mano

### Requirement: Las cartas descubiertas son visibles en toda vista

Con exactamente dos jugadores, las tres cartas descubiertas de la ronda SHALL aparecer, y de forma idéntica, en la vista de cualquier jugador de esa partida. Con tres o cuatro jugadores, ninguna vista SHALL mostrar cartas descubiertas.

#### Scenario: Descubiertas iguales para ambos jugadores

- **WHEN** se proyecta la vista de cada uno de los dos jugadores de una partida a dos
- **THEN** ambas vistas exponen las mismas tres cartas descubiertas, en el mismo orden

#### Scenario: Sin descubiertas a tres o cuatro jugadores

- **WHEN** se proyecta la vista de un jugador en una partida de tres o cuatro
- **THEN** la vista no expone ninguna carta descubierta

### Requirement: El turno no revela la carta que se acaba de robar

La vista SHALL indicar la fase del turno en curso y quién juega. Ningún campo de la vista SHALL exponer directamente la carta que esa persona robó; si quien juega es el propio jugador que pide la vista, esa carta solo es visible como parte de su propia mano.

#### Scenario: La carta robada de un rival no aparece

- **WHEN** se proyecta la vista de un jugador y un rival está en la fase de jugar de su turno, con una carta ya robada
- **THEN** la vista indica que ese rival está en la fase de jugar, y ningún campo expone la carta que robó

#### Scenario: La propia carta robada aparece solo como parte de la propia mano

- **WHEN** un jugador activo proyecta su propia vista durante la fase de jugar de su propio turno
- **THEN** la carta que robó aparece únicamente como una de las dos cartas de su propia mano

### Requirement: El orden de los asientos es el de la partida

La lista de asientos de la vista SHALL seguir el mismo orden que los jugadores de la partida, sin reordenar según quién solicita la vista.

#### Scenario: Orden estable sin importar quién pide la vista

- **WHEN** se proyecta la vista de cada jugador de una misma partida
- **THEN** el orden de los asientos es el mismo en todas esas vistas, y coincide con el orden de los jugadores de la partida

### Requirement: Ninguna carta oculta escapa a ninguna vista

Para cualquier estado de partida y cualquier jugador sentado, la vista proyectada SHALL excluir, en todos sus campos, la carta apartada, el contenido del mazo restante y la carta en mano de cada rival activo.

#### Scenario: Verificación exhaustiva contra los valores ocultos reales

- **WHEN** se proyecta la vista de un jugador para un conjunto de estados de partida distintos, con distinto número de jugadores y distinta fase de turno
- **THEN** en cada vista, ninguno de sus campos coincide con la carta apartada de ese estado, con ninguna carta del mazo restante de ese estado, ni con la carta en mano de ningún rival activo de ese estado

## ADDED Requirements

### Requirement: Descartar acepta los parámetros del efecto de la carta

El comando de descartar SHALL admitir, opcionalmente, un objetivo y una carta adivinada, para que la carta descartada pueda declarar los parámetros que su efecto necesite. Ninguno de los dos SHALL ser obligatorio para descartar una carta.

#### Scenario: Descartar sin objetivo ni carta adivinada sigue siendo válido

- **WHEN** un jugador descarta una carta sin indicar objetivo ni carta adivinada
- **THEN** el comando se acepta igual que antes

#### Scenario: Descartar con objetivo y carta adivinada es aceptado

- **WHEN** un jugador descarta una carta indicando un objetivo y una carta adivinada
- **THEN** el comando se acepta, aunque el efecto de esa carta todavía no haga nada con esos parámetros

### Requirement: El efecto de la carta se resuelve como parte del descarte

Descartar SHALL resolver el efecto de la carta descartada como parte de la misma operación, después de aplicar el descarte y antes de avanzar el turno.

#### Scenario: El resultado de descartar sigue siendo el descarte y el cambio de turno

- **WHEN** un jugador descarta cualquier carta, con o sin objetivo
- **THEN** el resultado incluye el evento de carta descartada y el de cambio de turno, y ningún otro cambio de estado

## ADDED Requirements

### Requirement: Iniciar una partida registra el evento de que la ronda empezó

Al iniciar una partida SHALL registrarse el evento público de que empezó su primera ronda, identificando el número de ronda y quién la empieza.

#### Scenario: Iniciar una partida deja el evento en el estado

- **WHEN** se inicia una partida
- **THEN** su registro de eventos incluye el evento de que empezó la ronda uno, con quien la empieza

## ADDED Requirements

### Requirement: El estado lleva un registro de eventos que crece con la partida

El estado SHALL llevar un registro de eventos que persiste a través de toda la partida, incluidas las rondas que aún no empezaron cuando ese registro se creó. El registro NO SHALL reiniciarse al empezar una ronda nueva.

#### Scenario: El registro sobrevive al inicio de una ronda nueva

- **WHEN** una partida ya tiene eventos registrados y empieza una ronda nueva
- **THEN** los eventos registrados antes de esa ronda siguen presentes en el estado

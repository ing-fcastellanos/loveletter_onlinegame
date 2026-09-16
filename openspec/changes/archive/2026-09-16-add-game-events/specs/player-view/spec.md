## ADDED Requirements

### Requirement: La vista incluye el registro de eventos que el jugador puede ver

La proyección SHALL incluir el registro de eventos filtrado por audiencia: los eventos públicos y los eventos restringidos cuya audiencia incluye a ese jugador. Un evento restringido a otros jugadores NO SHALL aparecer en la vista de un jugador ajeno a esa audiencia, ni como entrada anónima que delate que algo ocurrió.

#### Scenario: Los eventos públicos aparecen en cualquier vista

- **WHEN** se proyecta la vista de un jugador
- **THEN** todo evento público del estado aparece en su registro

#### Scenario: Un evento restringido aparece solo para su audiencia

- **WHEN** se proyecta la vista de un jugador que está en la audiencia de un evento restringido
- **THEN** ese evento aparece en su registro

#### Scenario: Un evento restringido no aparece para quien queda fuera de su audiencia

- **WHEN** se proyecta la vista de un jugador que no está en la audiencia de un evento restringido a otros dos jugadores
- **THEN** ese evento no aparece en su registro, ni siquiera como una entrada que indique que algo ocurrió entre ellos

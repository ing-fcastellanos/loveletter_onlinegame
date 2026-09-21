## Purpose

Define el comportamiento real de cada carta al descartarse: qué hace, a quién necesita como objetivo, y qué queda registrado en el estado y en el log de eventos. Esta capacidad crece con cada carta que se implemente.

## ADDED Requirements

### Requirement: Guardia y Sacerdote exigen un objetivo activo, no protegido y distinto de quien juega

Un objetivo legal para el Guardia o el Sacerdote SHALL ser un jugador activo de la ronda, sin protección de la Sirvienta, y distinto de quien juega la carta.

#### Scenario: Un objetivo protegido es ilegal si hay otro disponible

- **WHEN** un jugador descarta Guardia o Sacerdote apuntando a un rival protegido por la Sirvienta, existiendo otro objetivo legal
- **THEN** el resultado es un rechazo que identifica al jugador y ese objetivo, y no se lanza ninguna excepción

#### Scenario: Apuntarse a uno mismo es ilegal si hay otro objetivo disponible

- **WHEN** un jugador descarta Guardia o Sacerdote apuntándose a sí mismo, existiendo otro objetivo legal
- **THEN** el resultado es un rechazo, y no se lanza ninguna excepción

#### Scenario: Omitir el objetivo es ilegal si existe uno legal

- **WHEN** un jugador descarta Guardia o Sacerdote sin indicar objetivo, existiendo al menos un objetivo legal
- **THEN** el resultado es un rechazo que identifica al jugador, y no se lanza ninguna excepción

### Requirement: Guardia y Sacerdote se descartan sin efecto si no hay ningún objetivo legal

Si ningún jugador cumple las condiciones de objetivo legal, descartar Guardia o Sacerdote SHALL resolverse sin cambiar el estado, sea cual sea el objetivo indicado.

#### Scenario: Sin objetivo legal, el descarte no cambia nada más

- **WHEN** un jugador descarta Guardia o Sacerdote y ningún otro jugador cumple las condiciones de objetivo legal
- **THEN** el estado resultante es idéntico al que había antes de resolver el efecto

### Requirement: Adivinar "Guardia" es una jugada ilegal

Jugar el Guardia adivinando "Guardia", o sin indicar ninguna carta adivinada cuando hay un objetivo legal, SHALL rechazarse antes de resolver el efecto.

#### Scenario: Adivinar "Guardia" se rechaza

- **WHEN** un jugador descarta el Guardia con un objetivo legal y adivina "Guardia"
- **THEN** el resultado es un rechazo que identifica al jugador, y no se lanza ninguna excepción

#### Scenario: Omitir la carta adivinada se rechaza

- **WHEN** un jugador descarta el Guardia con un objetivo legal sin indicar ninguna carta adivinada
- **THEN** el resultado es un rechazo que identifica al jugador, y no se lanza ninguna excepción

### Requirement: El Guardia elimina al objetivo si acierta su carta

Si la carta adivinada coincide con la que sostiene el objetivo, el objetivo SHALL quedar eliminado.

#### Scenario: Acertar elimina al objetivo

- **WHEN** un jugador descarta el Guardia adivinando correctamente la carta de un objetivo legal
- **THEN** ese objetivo queda eliminado

### Requirement: El Guardia no tiene efecto si falla

Si la carta adivinada no coincide con la que sostiene el objetivo, el estado SHALL permanecer igual salvo por el propio descarte.

#### Scenario: Fallar no cambia nada más

- **WHEN** un jugador descarta el Guardia adivinando incorrectamente la carta de un objetivo legal
- **THEN** ese objetivo sigue activo y conserva la carta que sostenía

### Requirement: El acierto o fallo del Guardia es público, sin revelar la carta si falla

Jugar el Guardia con un objetivo legal SHALL registrar un evento público que identifica a quien juega, el objetivo, la carta adivinada y si acertó. Si falló, ningún campo del evento SHALL revelar la carta real del objetivo.

#### Scenario: El evento del Guardia es visible para cualquier jugador

- **WHEN** un jugador descarta el Guardia con un objetivo legal
- **THEN** todos los jugadores ven un evento con quién jugó, el objetivo, la carta adivinada y si acertó

#### Scenario: Un fallo no revela la carta real del objetivo

- **WHEN** un jugador descarta el Guardia adivinando incorrectamente
- **THEN** ningún evento visible para otro jugador contiene la carta real que sostenía el objetivo

### Requirement: El Sacerdote revela la mano del objetivo solo a quien lo jugó

Jugar el Sacerdote con un objetivo legal SHALL registrar un evento con la carta del objetivo, restringido únicamente a quien jugó la carta. Ni el propio objetivo ni ningún otro jugador SHALL tener acceso a ese evento.

#### Scenario: Quien juega el Sacerdote ve la carta del objetivo

- **WHEN** un jugador descarta el Sacerdote con un objetivo legal
- **THEN** en la vista de quien lo jugó aparece la carta que sostenía el objetivo

#### Scenario: Nadie más ve esa carta, ni siquiera el objetivo

- **WHEN** un jugador descarta el Sacerdote con un objetivo legal
- **THEN** ni la vista del objetivo ni la de ningún otro jugador contienen la carta revelada

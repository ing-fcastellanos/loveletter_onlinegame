## MODIFIED Requirements

### Requirement: Guardia, Sacerdote y Barón exigen un objetivo activo, no protegido y distinto de quien juega

Un objetivo legal para el Guardia, el Sacerdote o el Barón SHALL ser un jugador activo de la ronda, sin protección de la Sirvienta, y distinto de quien juega la carta.

#### Scenario: Un objetivo protegido es ilegal si hay otro disponible

- **WHEN** un jugador descarta Guardia, Sacerdote o Barón apuntando a un rival protegido por la Sirvienta, existiendo otro objetivo legal
- **THEN** el resultado es un rechazo que identifica al jugador y ese objetivo, y no se lanza ninguna excepción

#### Scenario: Apuntarse a uno mismo es ilegal si hay otro objetivo disponible

- **WHEN** un jugador descarta Guardia, Sacerdote o Barón apuntándose a sí mismo, existiendo otro objetivo legal
- **THEN** el resultado es un rechazo, y no se lanza ninguna excepción

#### Scenario: Omitir el objetivo es ilegal si existe uno legal

- **WHEN** un jugador descarta Guardia, Sacerdote o Barón sin indicar objetivo, existiendo al menos un objetivo legal
- **THEN** el resultado es un rechazo que identifica al jugador, y no se lanza ninguna excepción

### Requirement: Guardia, Sacerdote y Barón se descartan sin efecto si no hay ningún objetivo legal

Si ningún jugador cumple las condiciones de objetivo legal, descartar Guardia, Sacerdote o Barón SHALL resolverse sin cambiar el estado, sea cual sea el objetivo indicado.

#### Scenario: Sin objetivo legal, el descarte no cambia nada más

- **WHEN** un jugador descarta Guardia, Sacerdote o Barón y ningún otro jugador cumple las condiciones de objetivo legal
- **THEN** el estado resultante es idéntico al que había antes de resolver el efecto

## ADDED Requirements

### Requirement: El Barón elimina al de menor valor; un empate no elimina a nadie

Al descartar el Barón con un objetivo legal, el motor SHALL comparar el valor de la carta de quien juega con la del objetivo. Si son distintos, el de menor valor SHALL quedar eliminado. Si son iguales, ningún jugador SHALL quedar eliminado.

#### Scenario: Quien juega con la carta más baja queda eliminado

- **WHEN** un jugador descarta el Barón con un objetivo legal cuya carta vale más que la que le queda en mano
- **THEN** quien jugó el Barón queda eliminado y el objetivo sigue activo con su carta

#### Scenario: El objetivo con la carta más baja queda eliminado

- **WHEN** un jugador descarta el Barón con un objetivo legal cuya carta vale menos que la que le queda en mano
- **THEN** el objetivo queda eliminado y quien jugó el Barón sigue activo con su carta

#### Scenario: Un empate no elimina a nadie

- **WHEN** un jugador descarta el Barón con un objetivo legal cuya carta vale lo mismo que la que le queda en mano
- **THEN** ambos jugadores siguen activos y conservan la carta que tenían

### Requirement: La comparación del Barón solo la conocen los dos implicados

Jugar el Barón con un objetivo legal SHALL registrar un evento con ambas cartas comparadas, restringido únicamente a quien jugó la carta y al objetivo. Ningún otro jugador SHALL tener acceso a ese evento, y ningún evento visible para un tercero SHALL identificar a quién se apuntó el Barón salvo que resulte en una eliminación.

#### Scenario: Los dos implicados conocen ambas cartas

- **WHEN** un jugador descarta el Barón con un objetivo legal
- **THEN** tanto la vista de quien lo jugó como la del objetivo contienen un evento con las dos cartas comparadas

#### Scenario: Un tercero no ve la comparación

- **WHEN** un jugador descarta el Barón con un objetivo legal y hay un tercer jugador activo en la ronda
- **THEN** la vista del tercero no contiene la comparación ni las cartas comparadas

#### Scenario: Un empate es indistinguible de un Barón sin objetivo legal para un tercero

- **WHEN** un jugador descarta el Barón y el resultado es un empate
- **THEN** ningún jugador fuera de los dos implicados puede distinguir ese descarte de uno sin ningún objetivo legal

### Requirement: La Sirvienta protege a quien la juega hasta el inicio de su siguiente turno

Descartar la Sirvienta SHALL dejar a quien la jugó protegido de inmediato. La protección SHALL seguir activa durante los turnos de los demás jugadores y SHALL desaparecer exactamente cuando comience el siguiente turno de quien la jugó, sin necesidad de ningún evento adicional: la vista de cualquier jugador ya refleja la protección de un rival en tiempo real.

#### Scenario: Jugar la Sirvienta protege de inmediato

- **WHEN** un jugador descarta la Sirvienta
- **THEN** su propio estado y el que ven los demás jugadores lo muestran protegido a partir de ese momento

#### Scenario: La protección expira al empezar el siguiente turno de quien la jugó

- **WHEN** el turno vuelve a quien jugó la Sirvienta tras al menos una vuelta completa de los demás jugadores
- **THEN** ya no está protegido, y vuelve a ser un objetivo legal para las cartas que lo exigen

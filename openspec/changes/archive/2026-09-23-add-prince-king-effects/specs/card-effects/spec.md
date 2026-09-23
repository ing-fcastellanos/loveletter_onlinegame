## MODIFIED Requirements

### Requirement: Guardia, Sacerdote, Barón y Rey exigen un objetivo activo, no protegido y distinto de quien juega

Un objetivo legal para el Guardia, el Sacerdote, el Barón o el Rey SHALL ser un jugador activo de la ronda, sin protección de la Sirvienta, y distinto de quien juega la carta.

#### Scenario: Un objetivo protegido es ilegal si hay otro disponible

- **WHEN** un jugador descarta Guardia, Sacerdote, Barón o Rey apuntando a un rival protegido por la Sirvienta, existiendo otro objetivo legal
- **THEN** el resultado es un rechazo que identifica al jugador y ese objetivo, y no se lanza ninguna excepción

#### Scenario: Apuntarse a uno mismo es ilegal si hay otro objetivo disponible

- **WHEN** un jugador descarta Guardia, Sacerdote, Barón o Rey apuntándose a sí mismo, existiendo otro objetivo legal
- **THEN** el resultado es un rechazo, y no se lanza ninguna excepción

#### Scenario: Omitir el objetivo es ilegal si existe uno legal

- **WHEN** un jugador descarta Guardia, Sacerdote, Barón o Rey sin indicar objetivo, existiendo al menos un objetivo legal
- **THEN** el resultado es un rechazo que identifica al jugador, y no se lanza ninguna excepción

### Requirement: Guardia, Sacerdote, Barón y Rey se descartan sin efecto si no hay ningún objetivo legal

Si ningún jugador cumple las condiciones de objetivo legal, descartar Guardia, Sacerdote, Barón o Rey SHALL resolverse sin cambiar el estado, sea cual sea el objetivo indicado.

#### Scenario: Sin objetivo legal, el descarte no cambia nada más

- **WHEN** un jugador descarta Guardia, Sacerdote, Barón o Rey y ningún otro jugador cumple las condiciones de objetivo legal
- **THEN** el estado resultante es idéntico al que había antes de resolver el efecto

## ADDED Requirements

### Requirement: El Rey intercambia la carta de quien juega con la del objetivo

Al descartar el Rey con un objetivo legal, el motor SHALL intercambiar la carta que sostiene quien juega con la que sostiene el objetivo.

#### Scenario: Cada quien termina con la carta del otro

- **WHEN** un jugador descarta el Rey con un objetivo legal
- **THEN** quien jugó el Rey sostiene la carta que tenía el objetivo, y el objetivo sostiene la que tenía quien jugó el Rey

### Requirement: El intercambio del Rey no revela ninguna de las dos manos a un tercero

El intercambio del Rey SHALL resolverse sin registrar ningún evento nuevo: la vista de cada jugador ya refleja su propia mano en tiempo real.

#### Scenario: Cada implicado ve su nueva carta; nadie más ve ninguna de las dos

- **WHEN** un jugador descarta el Rey con un objetivo legal
- **THEN** la vista de quien jugó muestra su nueva carta, la vista del objetivo muestra la suya, y ningún otro jugador ve ninguna de las dos manos intercambiadas

### Requirement: El Príncipe siempre tiene un objetivo legal, porque uno mismo lo es siempre

Un objetivo legal para el Príncipe SHALL ser quien juega la carta, o cualquier otro jugador activo de la ronda sin protección de la Sirvienta. A diferencia de las demás cartas de objetivo, el Príncipe nunca SHALL descartarse sin efecto: omitir el objetivo SHALL rechazarse, porque siempre existe al menos uno legal.

#### Scenario: Apuntarse a uno mismo siempre es legal

- **WHEN** un jugador descarta el Príncipe apuntándose a sí mismo
- **THEN** el resultado se acepta sin importar la protección de los demás jugadores

#### Scenario: Omitir el objetivo se rechaza

- **WHEN** un jugador descarta el Príncipe sin indicar objetivo
- **THEN** el resultado es un rechazo que identifica al jugador, y no se lanza ninguna excepción

#### Scenario: Apuntar a un rival protegido es ilegal

- **WHEN** un jugador descarta el Príncipe apuntando a un rival protegido por la Sirvienta
- **THEN** el resultado es un rechazo que identifica al jugador y ese objetivo

### Requirement: Cuando todos los rivales están protegidos, apuntarse a sí mismo con el Príncipe es la única jugada legal

Si ningún otro jugador activo cumple las condiciones de objetivo legal para el Príncipe, el único objetivo legal SHALL ser quien juega la carta. El motor SHALL exigir el auto-objetivo explícito en el comando, no asumirlo ni sugerirlo.

#### Scenario: Apuntar al único rival protegido se rechaza igual que cualquier otro objetivo ilegal

- **WHEN** un jugador descarta el Príncipe apuntando al único otro jugador activo, que está protegido
- **THEN** el resultado es un rechazo

#### Scenario: Apuntarse a uno mismo se acepta cuando todos los rivales están protegidos

- **WHEN** un jugador descarta el Príncipe apuntándose a sí mismo, con todos los demás jugadores activos protegidos
- **THEN** el resultado se acepta

### Requirement: El objetivo del Príncipe descarta su carta y roba otra, sin disparar el efecto de la carta forzada

Al descartar el Príncipe con un objetivo legal, el objetivo SHALL descartar la carta que sostiene — registrada públicamente como cualquier otro descarte — y robar una carta nueva del mazo. El efecto propio de la carta forzada NO SHALL resolverse.

#### Scenario: El objetivo termina con una carta nueva

- **WHEN** un jugador descarta el Príncipe con un objetivo legal y el mazo tiene cartas
- **THEN** el objetivo ya no sostiene la carta que tenía y sostiene una carta robada del mazo

#### Scenario: La carta forzada no dispara su propio efecto

- **WHEN** el Príncipe fuerza a un objetivo a descartar una carta que normalmente exigiría su propio objetivo, como el Guardia
- **THEN** el efecto de esa carta no se resuelve

### Requirement: Con el mazo vacío, el Príncipe entrega la carta apartada al inicio de la ronda

Si el mazo no tiene cartas cuando se resuelve el Príncipe, el objetivo SHALL robar la carta que se apartó al inicio de la ronda en lugar de una carta del mazo.

#### Scenario: El objetivo recibe la carta apartada

- **WHEN** un jugador descarta el Príncipe con un objetivo legal y el mazo está vacío
- **THEN** el objetivo termina sosteniendo la carta que se apartó al inicio de la ronda

### Requirement: Si el Príncipe fuerza el descarte de la Princesa, el objetivo queda eliminado

Si la carta que el objetivo descarta por este efecto es la Princesa, el objetivo SHALL quedar eliminado y NO SHALL robar ninguna carta.

#### Scenario: Forzar la Princesa elimina al objetivo sin que robe nada

- **WHEN** un jugador descarta el Príncipe y la carta que el objetivo descarta por este efecto es la Princesa
- **THEN** el objetivo queda eliminado y no sostiene ninguna carta nueva

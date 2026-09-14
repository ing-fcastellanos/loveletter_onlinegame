## Purpose

Define el mazo de Love Letter y cómo se baraja: su composición, la semilla que gobierna el azar de una partida, y un barajado por ronda reproducible, uniforme y congelado. Es lo que permite reproducir cualquier partida a partir de su semilla.

## ADDED Requirements

### Requirement: El mazo tiene la composición de la edición clásica

El mazo completo SHALL tener exactamente dieciséis cartas: cinco Guardias, dos Sacerdotes, dos Barones, dos Sirvientas, dos Príncipes, un Rey, una Condesa y una Princesa. La composición SHALL estar disponible para cualquier consumidor del motor, incluida la presentación, porque es información pública.

#### Scenario: El mazo completo tiene dieciséis cartas con la distribución clásica

- **WHEN** se construye el mazo completo
- **THEN** tiene dieciséis cartas y la cantidad de cada personaje es la de la edición clásica

#### Scenario: La composición es alcanzable desde la superficie de cliente

- **WHEN** la presentación consulta la composición del mazo
- **THEN** la obtiene sin acceder a la superficie de autoridad

### Requirement: Una semilla sin validar no es utilizable

La semilla SHALL ser un entero seguro no negativo. Validar un número como semilla SHALL devolver un resultado que distingue la semilla válida del valor rechazado, sin lanzar excepciones. Usar como semilla un número que no pasó por esa validación SHALL rechazarse en la verificación de tipos, tanto al barajar como al construir el estado de una partida.

#### Scenario: Un entero seguro no negativo es una semilla válida

- **WHEN** se valida como semilla el cero, un entero cualquiera o el mayor entero seguro
- **THEN** el resultado es una semilla válida

#### Scenario: Un valor fuera de rango se rechaza como resultado

- **WHEN** se valida como semilla un número negativo, fraccionario, no finito o mayor que el mayor entero seguro
- **THEN** el resultado es un rechazo que identifica el valor, y no se lanza ninguna excepción

#### Scenario: Un número sin validar no se acepta como semilla

- **WHEN** se intenta barajar o construir el estado de una partida con un número que no pasó por la validación
- **THEN** la verificación de tipos lo rechaza

### Requirement: El barajado de una ronda es determinista

Dadas la misma semilla y el mismo número de ronda, el mazo barajado SHALL ser siempre el mismo, carta por carta.

#### Scenario: Misma semilla y misma ronda, mismo mazo

- **WHEN** se baraja dos veces la misma ronda con la misma semilla
- **THEN** los dos mazos son idénticos carta por carta

### Requirement: Toda la semilla determina el mazo

Todos los bits de la semilla SHALL influir en el barajado. Dos semillas que difieren solo en sus bits más altos NO SHALL producir por eso el mismo mazo.

#### Scenario: Semillas que difieren solo por encima de 2^32 dan mazos distintos

- **WHEN** se baraja la misma ronda con dos semillas que difieren únicamente en su parte por encima de 2^32
- **THEN** los mazos son distintos

### Requirement: Cada ronda tiene su propio barajado

Dentro de una misma partida, cada número de ronda SHALL producir un barajado propio e independiente del de las demás rondas.

#### Scenario: Las rondas de una partida no repiten mazo más de lo que predice el azar

- **WHEN** se barajan muchas rondas consecutivas con la misma semilla
- **THEN** los mazos repetidos no superan lo que predice el azar para ese número de rondas

#### Scenario: Rondas consecutivas no están correlacionadas

- **WHEN** se compara la carta superior del mazo en rondas consecutivas de la misma semilla
- **THEN** coinciden con la frecuencia que predice el azar dada la composición del mazo

### Requirement: El barajado es uniforme

Cada orden distinguible del mazo SHALL ser igual de probable, y en particular cada carta SHALL tener la misma probabilidad de quedar en cada posición. Como hay más semillas posibles que mazos distinguibles, no se puede exigir que dos semillas nunca coincidan: SHALL coincidir solo en la proporción que predice el azar.

#### Scenario: La posición de una carta es uniforme

- **WHEN** se baraja con un conjunto fijo y amplio de semillas y se cuenta en qué posición queda la Princesa
- **THEN** una prueba χ² no rechaza la uniformidad al nivel de significación del 0,1 %

#### Scenario: La prueba de uniformidad detecta un barajado sesgado

- **WHEN** se aplica la misma prueba a un barajado conocido por sesgado
- **THEN** la prueba rechaza su uniformidad

#### Scenario: Las coincidencias entre semillas son las del azar

- **WHEN** se barajan muchas semillas distintas
- **THEN** los mazos coincidentes no superan lo que predice el problema del cumpleaños para ese número de semillas

### Requirement: El barajado conserva las cartas

Barajar SHALL devolver exactamente las mismas cartas que recibe, en otro orden: ninguna se pierde ni se duplica.

#### Scenario: El mazo barajado es una permutación del mazo completo

- **WHEN** se baraja el mazo completo con cualquier semilla
- **THEN** el resultado contiene exactamente las mismas cartas, con la misma cantidad de cada personaje

### Requirement: El algoritmo de barajado está congelado

Una semilla y un número de ronda de referencia SHALL producir un mazo de referencia registrado. Cualquier cambio en el generador, en el barajado o en el orden de entrada del mazo que altere ese resultado SHALL detectarse, porque rompe la reproducción de las partidas guardadas.

#### Scenario: La semilla de referencia produce el mazo de referencia

- **WHEN** se baraja la ronda de referencia con la semilla de referencia
- **THEN** el mazo coincide carta por carta con el mazo de referencia registrado

### Requirement: Ningún sorteo posterior altera el mazo de la ronda

El mazo de una ronda SHALL ser lo primero que se obtiene del azar de esa ronda. Cualquier otro valor aleatorio que la ronda necesite SHALL obtenerse después del barajado, de modo que no pueda cambiar el mazo.

#### Scenario: Sortear después de barajar no cambia el mazo

- **WHEN** tras obtener el mazo de una ronda se sacan más valores aleatorios de esa misma ronda
- **THEN** el mazo es idéntico al que se obtiene con la misma semilla y ronda sin sorteos posteriores

### Requirement: La semilla es información oculta

Conocer la semilla permite calcular el mazo de cualquier ronda de la partida. Por eso la semilla NO SHALL ser alcanzable desde la superficie de cliente ni aparecer en ninguna vista de jugador, y tampoco SHALL serlo ninguna operación que valide semillas, baraje o derive el azar de una ronda.

#### Scenario: La semilla y el barajado son inalcanzables desde la superficie de cliente

- **WHEN** un consumidor intenta obtener desde la superficie de cliente el tipo de la semilla, su validación o cualquier operación de barajado
- **THEN** la verificación de tipos lo rechaza

#### Scenario: La vista de un jugador no contiene la semilla

- **WHEN** se proyecta el estado de una partida para un jugador
- **THEN** la vista resultante no contiene la semilla

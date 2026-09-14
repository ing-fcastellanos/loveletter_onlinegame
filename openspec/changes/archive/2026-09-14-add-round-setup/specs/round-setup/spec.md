## Purpose

Define cómo se construye una partida de Love Letter y cómo se reparte una ronda: quiénes pueden jugar, qué cartas quedan fuera de juego, qué recibe cada asiento, quién empieza, y que todo sea reproducible a partir de la semilla.

## ADDED Requirements

### Requirement: Una partida admite de dos a cuatro jugadores

Iniciar una partida SHALL requerir entre dos y cuatro jugadores. Cualquier otra cantidad SHALL rechazarse devolviendo un resultado que identifica la cantidad recibida, sin lanzar excepciones.

#### Scenario: Dos, tres o cuatro jugadores inician una partida

- **WHEN** se inicia una partida con dos, tres o cuatro jugadores
- **THEN** el resultado es una partida construida

#### Scenario: Una cantidad fuera de rango se rechaza como resultado

- **WHEN** se intenta iniciar una partida con ninguno, uno, cinco o más jugadores
- **THEN** el resultado es un rechazo que identifica la cantidad recibida, y no se lanza ninguna excepción

### Requirement: Los identificadores de jugador son únicos

Dos jugadores de una misma partida NO SHALL compartir identificador. Una partida con identificadores repetidos SHALL rechazarse devolviendo un resultado que identifica el identificador repetido.

#### Scenario: Un identificador repetido se rechaza

- **WHEN** se intenta iniciar una partida en la que dos asientos comparten identificador
- **THEN** el resultado es un rechazo que identifica ese identificador, y no se lanza ninguna excepción

### Requirement: Una partida nueva empieza desde cero

Al iniciar una partida, todos los jugadores SHALL tener cero fichas de afecto y la ronda en juego SHALL ser la primera. Los jugadores de la ronda SHALL ser exactamente los de la partida, en el mismo orden, todos activos, sin descartes y sin protección.

#### Scenario: Fichas en cero y primera ronda

- **WHEN** se inicia una partida
- **THEN** cada jugador tiene cero fichas y la ronda en juego es la número uno

#### Scenario: Los jugadores de la ronda coinciden con los de la partida

- **WHEN** se inicia una partida
- **THEN** los jugadores de la ronda tienen los mismos identificadores que los de la partida, en el mismo orden, y todos están activos, sin descartes y sin protección

### Requirement: Una carta se aparta siempre y tres se descubren solo en la partida a dos

Al repartir una ronda, la primera carta de su mazo barajado SHALL apartarse boca abajo, sea cual sea el número de jugadores. Con exactamente dos jugadores, las tres cartas siguientes SHALL quedar descubiertas; con tres o cuatro jugadores NO SHALL descubrirse ninguna.

#### Scenario: La carta apartada es la primera del mazo de la ronda

- **WHEN** se reparte una ronda con cualquier número de jugadores
- **THEN** la carta apartada es la primera del mazo barajado de esa ronda

#### Scenario: En la partida a dos se descubren las tres cartas siguientes

- **WHEN** se reparte una ronda con dos jugadores
- **THEN** hay tres cartas descubiertas, y son la segunda, la tercera y la cuarta del mazo barajado

#### Scenario: Con tres o cuatro jugadores no se descubre ninguna carta

- **WHEN** se reparte una ronda con tres o cuatro jugadores
- **THEN** no hay cartas descubiertas

### Requirement: Cada asiento recibe una carta en orden de asiento

Tras apartar y, en su caso, descubrir cartas, cada jugador SHALL recibir la siguiente carta del mazo en orden de asiento. Lo que recibe cada asiento NO SHALL depender de quién empieza la ronda.

#### Scenario: Las cartas se reparten en orden de asiento

- **WHEN** se reparte una ronda
- **THEN** el primer asiento sostiene la carta siguiente a las apartadas y descubiertas, el segundo la que sigue, y así sucesivamente

#### Scenario: Quien empieza no cambia lo que recibe cada asiento

- **WHEN** se reparte la misma ronda con la misma semilla indicando jugadores distintos como quien empieza
- **THEN** cada asiento sostiene la misma carta en todos los casos

### Requirement: El mazo restante conserva todas las demás cartas

Tras el reparto, el mazo SHALL contener todas las cartas que no se apartaron, no se descubrieron y no se repartieron, de modo que la carta apartada, las descubiertas, las que sostienen los jugadores y el mazo restante formen exactamente el mazo completo.

#### Scenario: Tamaño del mazo restante según el número de jugadores

- **WHEN** se reparte una ronda con dos, tres o cuatro jugadores
- **THEN** el mazo restante tiene diez, doce u once cartas respectivamente

#### Scenario: Ninguna carta se pierde ni se duplica en el reparto

- **WHEN** se reparte una ronda
- **THEN** la carta apartada, las descubiertas, las cartas de los jugadores y el mazo restante suman exactamente la composición del mazo completo

### Requirement: Quién empieza la primera ronda se sortea tras el barajado

Al iniciar una partida, el jugador que empieza la primera ronda SHALL elegirse al azar con el azar de esa ronda, después de barajar su mazo, con la misma probabilidad para cada jugador. La ronda SHALL empezar con ese jugador en la fase previa a robar.

#### Scenario: La ronda empieza con el jugador sorteado antes de robar

- **WHEN** se inicia una partida
- **THEN** el turno pertenece a uno de sus jugadores y está en la fase previa a robar

#### Scenario: El sorteo no altera el mazo

- **WHEN** se inicia una partida
- **THEN** el reparto coincide con el del mazo barajado de la primera ronda para esa semilla, como si no se hubiera sorteado nada

#### Scenario: El sorteo es uniforme

- **WHEN** se inician partidas con un conjunto fijo y amplio de semillas y se cuenta quién empieza
- **THEN** una prueba χ² no rechaza que cada jugador empiece con la misma probabilidad, al nivel de significación del 0,1 %

### Requirement: Una ronda se reparte con quien empieza dado

SHALL poder repartirse cualquier ronda de una partida indicando su número y quién la empieza, para encadenar rondas en las que empieza el ganador de la anterior. El reparto SHALL usar el mazo barajado de ese número de ronda. Un jugador que no está sentado en la partida, un número de ronda que no es un entero positivo, o un conjunto de jugadores inválido SHALL rechazarse devolviendo un resultado, sin lanzar excepciones.

#### Scenario: La ronda empieza con quien se indica

- **WHEN** se reparte una ronda indicando quién la empieza
- **THEN** el turno pertenece a ese jugador y está en la fase previa a robar

#### Scenario: El número de ronda determina el mazo

- **WHEN** se reparte una ronda con un número de ronda dado
- **THEN** el reparto coincide con el mazo barajado de ese número de ronda para esa semilla, y la ronda lleva ese número

#### Scenario: Quien empieza debe estar sentado

- **WHEN** se intenta repartir una ronda indicando como quien empieza a alguien que no es jugador de la partida
- **THEN** el resultado es un rechazo que identifica a ese jugador, y no se lanza ninguna excepción

#### Scenario: El número de ronda debe ser un entero positivo

- **WHEN** se intenta repartir una ronda con un número de ronda cero, negativo o fraccionario
- **THEN** el resultado es un rechazo que identifica ese número, y no se lanza ninguna excepción

### Requirement: El setup es determinista y está congelado

Iniciar una partida con la misma semilla y los mismos asientos SHALL producir exactamente la misma partida. Una semilla y unos asientos de referencia SHALL producir un setup de referencia registrado —carta apartada, descubiertas, carta de cada asiento, quién empieza y mazo restante—, y cualquier cambio que lo altere SHALL detectarse, porque rompe la reproducción de las partidas guardadas.

#### Scenario: Misma semilla y mismos asientos, misma partida

- **WHEN** se inicia dos veces una partida con la misma semilla y los mismos asientos
- **THEN** ambas partidas son idénticas

#### Scenario: La referencia produce el setup de referencia

- **WHEN** se inicia la partida de referencia
- **THEN** la carta apartada, las descubiertas, la carta de cada asiento, quién empieza y el mazo restante coinciden con el setup de referencia registrado

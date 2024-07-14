# Trabajo Práctico Final

Este trabajo implica una modificación y extensión del trabajo práctico 9. El examen final consistirá en la presentación del trabajo, explicación del código y de las decisiones de diseño.

El proyecto debe incluir tres componentes principales:

- Un conjunto de _smart contracts_, ubicados en el subdirectorio `contracts`. Dicho subdirectorio debe tener la estructura de un proyecto `truffle` y debe ser posible desplegar todos los contratos relevantes ejecutando simplemente `truffle deploy`. Los contratos deben satisfacer como mínimo las especificaciones del Práctico 6 y pasar todos los casos de prueba.

- API REST, que satisfaga las especificaciones del práctico 6, y situada en el directorio `api`.
  Deben proveerse las instrucciones necesarias para desplegar y ejecutar el servidor que provee la API.

- Interface web, en el directorio `ui`. Deben proveerse las instrucciones para desplegar y ejecutar el servidor que provee esta interface.

Puede usarse una estructura de directorios diferente si las herramientas utilizadas así lo requieren. En este caso se deberá indicar claramente en qué directorio se encuentra cada uno de los tres componentes.

## Descripción general

Debe proveerse un sistema de gestión de llamados a presentación de propuestas, con los criterios utilizados en los prácticos 6, 7 y 8.
Pueden modificarse tanto los contratos como la API para proveer las funcionalidades requeridas. Si se agregan nuevos métodos o _endpoints_ se deberá proveer lo siguiente:

- Documentación que especifique funcionalidad, argumentos, valores devueltos y condiciones de error, ya sea como comentarios en el código o en el `README.md` correspondiente.
- Casos de prueba

### Funcionalidades mínimas requeridas

La interface web deberá permitir:

- Listar los llamado correspondientes a un cierto creador.
- Presentar propuestas en forma anónima.
- Verificar el registro de una propuesta

Además, si el usuario cuenta con Metamask, y está conectado a la red en la que están desplegados los contratos, este usuario debe poder:

- Registrarse para crear llamados.
- Presentar propuestas asociadas a su cuenta.

Si el usuario con Metamask es el dueño de la factoría, debe poder:

- Listar los pedidos de registro
- Autorizar los pedidos de registro

Un usuario con Metamask que está registrado debe poder:

- Crear llamados

Puede encontrarse un ejemplo del uso de Metamask en la carpeta [`ejemplos/metamask`](../../ejemplos/metamask/) del repositorio.

Además deberá implementar el uso de ENS

#### ENS

A nivel de interface, deben reemplazarse todas las direcciones, tanto de contratos como de usuarios, por nombres registrados en un ENS.

Por lo tanto, el conjunto de _smart contracts_ debe contener los contratos necesarios para implementar estas funcionalidades. Esto implica, como mínimo:

- Un registro (_registry_).
- Uno o más registradores (_registers_).
- Uno o más resolutores (_resolvers_).

Estos contratos deben ajustarse a las especificaciones de la [documentación](https://docs.ens.domains/). En particular, para los [_resolvers_](https://docs.ens.domains/contract-api-reference/publicresolver) deben tenerse en cuenta las siguientes _interfaces_:

- [EIP 137](https://eips.ethereum.org/EIPS/eip-137) Direcciones (`addr()`).
- [EIP 165](https://eips.ethereum.org/EIPS/eip-165) Detección de interface (`supportsInterface()`).
- [EIP 181](https://eips.ethereum.org/EIPS/eip-181) Resolución reversa (`name()`).
- [EIP 634](https://eips.ethereum.org/EIPS/eip-634) Registros de tipo `text`

Se usará como dominio de primer nivel el nombre `cfp`. Los dominios a utilizar serán:

- `llamados.cfp`: Dominio donde están los nombres de los llamados. Cada llamado debe estar identificado por un nombre único, y puede tener una descripción en un registro de tipo `text`.
- `usuarios.cfp`: Dominio donde están los nombres de los usuarios, tanto creadores de los llamados como de presentadores de propuestas.
- `addr.reverse`: Dominio para la resolución reversa.

Los usuarios deben poder registrar su cuenta asociándola con un nombre del dominio `usuarios.cfp`.

Los llamados creados deben registrarse con un nombre adecuado del dominio `llamados.cfp`.

El dueño del registro es el dueño del contrato factoría.

La interface web debe presentar al menos las siguientes funcionalidades adicionales:

- Permitir que un usuario con Metamask registre un nombre asociado con su cuenta en el dominio usuarios.cfp.
- En el proceso de creación de un llamado se debe pedir el nombre y la descripción correspondientes.

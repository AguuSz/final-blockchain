# Trabajo Práctico Final

Este trabajo implica una modificación y extensión del trabajo práctico 9. El examen final consistirá en la presentación del trabajo, explicación del código y de las decisiones de diseño.

El proyecto debe incluir tres componentes principales:

- Un conjunto de _smart contracts_, ubicados en el subdirectorio `contracts`. Dicho subdirectorio debe tener la estructura de un proyecto `truffle` y debe ser posible desplegar todos los contratos relevantes ejecutando simplemente `truffle deploy`. Los contratos deben satisfacer como mínimo las especificaciones del Práctico 6 y pasar todos los casos de prueba.

- API REST, que satisfaga las especificaciones del práctico 6, y situada en el directorio `api`.
  Deben proveerse las instrucciones necesarias para desplegar y ejecutar el servidor que provee la API.

- Interface web, en el directorio `ui`. Deben proveerse las instrucciones para desplegar y ejecutar el servidor que provee esta interface.

Puede usarse una estructura de directorios diferente si las herramientas utilizadas así lo requieren. En este caso se deberá indicar claramente en qué directorio se encuentra cada uno de los tres componentes.

## Detalles de instalacion

Requisitos:

- Tener instalado `node` y `npm`.
  - En mi caso utilice `pnpm` en lugar de `npm`. No deberia haber inconvenientes con usar uno o el otro, pero si llega a haber alguno, verificar utilizando `pnpm`.
- En el navegador contar con la extension [Metamask](https://metamask.io/) instalada.
- Tener Python3 instalado.

  - Es recomendable contar con ambientes virtuales para no tener conflictos con las dependencias. Para esto se puede utilizar `virtualenv` o `conda`. Mas informacion aqui:
    - [virtualenv](https://virtualenv.pypa.io/en/latest/)
    - [conda](https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html)

- Tener instalado `truffle` y `ganache-cli` de manera global.

  - Para instalar `truffle`:
    ```bash
    npm install -g truffle
    ```
  - Para instalar `ganache-cli`:
    ```bash
    npm install -g ganache-cli
    ```

> En caso de querer utilizar una interfaz grafica, se puede instalar **ganache**. Cumple la misma funcion que `ganache-cli` pero con una interfaz grafica. Mas informacion [aqui](https://www.trufflesuite.com/ganache).

### Pasos para correr el proyecto

- Tener alguna red de blockchain corriendo en la que se puedan hacer deploy de los contratos.
  - En este caso, yo trabaje con `ganache-cli`, por lo que con este comando voy a levantar una red local:
  - `ganache-cli -m "FRASE SEMILLA AQUI" -p 7545 -i 5777 --db DIRECTORIO_PARA_DB`
    - `-m` es la frase semilla de la red.
    - `-p` es el puerto en el que va a correr la red.
    - `-i` es el id de la red.
    - `--db` es el directorio donde se va a guardar la base de datos de la red. Esto no es obligatorio, pero esta bueno para en caso de que se quiera volver a levantar la red, cuente con los mismos datos de antes.
- Hacer deploy de los contratos ubicados en la carpeta `/contract/` en la red ganache.
  - Para esto: `truffle migrate --network development`.
    - En este caso, va a buscar el archivo `truffle-config.js` y va a buscar la configuracion de la red `development`. En caso de querer configurar en distintos puertos, modificar esa red o crear una nueva segun guste.
  - Esto generara unos archivos `.json` los cuales se utilizara para la interaccion con los contratos.
- Levantar el servidor de la API, el cual se encuentra en la carpeta `./backend`
  - Se asume que se tiene levantada una red ganache, la cual opera en el puerto `7545`.
  - Instalar dependencias con `pip install -r requirements.txt`.
  - Crear un archivo `.txt` con el nombre que quiera y dentro poner la frase semilla de la red levantad.
  - Una vez creado el archivo, levantamos el server con: `python apiserver.py --mnemonic "mnemonic_file_path.txt"`
- Para levantar el cliente hace falta instalar las dependencias del proyecto: `npm install`.
  - Luego se lo inicia con `npm run dev`.
  - Esto levantara el proyecto, el cual por defecto correra en el puerto `5173`.
  - Ir a `http://localhost:5173` para ver la pagina.

---

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

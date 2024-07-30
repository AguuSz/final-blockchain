// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CFP.sol";
import "./ReverseRegistrar.sol";
import "./PublicResolver.sol";

contract CFPFactory {
    // Evento que se emite cuando se crea un llamado a presentación de propuestas
    event CFPCreated(address creator, bytes32 callId, CFP cfp);

    // Estructura que representa un llamado
    struct CallForProposals {
        address creator;
        CFP cfp;
        bytes32 callId;
        uint timestamp;
    }

    enum status {
        UNREGISTERED,
        PENDING,
        UNAUTHORIZED,
        AUTHORIZED
    }

    address private factoryOwner;

    ReverseRegistrar revRegistrar;
    PublicResolver pubResolver;

    mapping(bytes32 => CallForProposals) private callsMapping;  // Mapeo que asocia un identificador de llamado con un llamado
    mapping(address => status) private statusMapping;           // Mapeo que asocia una dirección con su estado
    mapping(address => bytes32[]) private CFPMapping;           // Mapeo que asocia una dirección con la lista de sus CFPs
    address[] private creatorsArray;                            // Array con las direcciones de los creadores de CallsForProposals
    address[] private registerPendingArray;                     // Array con las direcciones de los creadores pendientes de autorizacion

    CallForProposals[] private CFPList;

    constructor (ReverseRegistrar revReg, PublicResolver pubRes) {
        factoryOwner = msg.sender;
        revRegistrar = revReg;
        pubResolver = pubRes;
        statusMapping[factoryOwner] = status.AUTHORIZED;
    }

    modifier created(bytes32 callId) {
        require(callsMapping[callId].creator != address(0), "El llamado no existe");
        _;
    }

    modifier notCreated(bytes32 callId) {
        require(callsMapping[callId].creator == address(0), "El llamado ya existe");
        _;
    }

    modifier authorized(address addr) {
        require(isAuthorized(addr), "No autorizado");
        _;
    }

    modifier ownerOnly(address addr){
        require(addr == factoryOwner, "Solo el creador puede hacer esta llamada");
        _;
    }

    modifier notRegistered(address account) {
        require(statusMapping[account] == status.UNREGISTERED,"Ya se ha registrado");
        _;
    }

    // Dirección del dueño de la factoría
    function owner() public view returns (address) {
        return factoryOwner;
    }

    // Devuelve el llamado asociado con un callId
    function calls(
        bytes32 callId
    ) public view returns (CallForProposals memory) {
        return callsMapping[callId];
    }

    // Devuelve la dirección de un creador de la lista de creadores
    function creators(uint index) public view returns (address) {
        return creatorsArray[index];
    }

    function _createFor(bytes32 callId, uint timestamp, address creator) internal returns (CFP) {
        CFP cfp = new CFP(callId, timestamp, revRegistrar, pubResolver);

        // Creo un nuevo CFP y lo agrego al mapeo de CFPs
        CallForProposals memory newCFP = CallForProposals({
            creator: creator,
            cfp: cfp,
            callId: callId,
            timestamp: timestamp
        });
        callsMapping[callId] = newCFP;
        CFPList.push(newCFP);

        // Si el creador no tiene ningun CFP, lo agrega al array de creadores
        if (CFPMapping[creator].length == 0) {
            creatorsArray.push(creator);
        }

        // Agrega el CFP al array de CFPs del creador
        CFPMapping[creator].push(callId);

        // Emito el evento de que se creo el CFP y devuelvo el CFP creado
        emit CFPCreated(creator, callId, cfp);
        return cfp;
    }

    /** Crea un llamado, con un identificador y un tiempo de cierre
     *  Si ya existe un llamado con ese identificador, revierte con el mensaje de error "El llamado ya existe"
     *  Si el emisor no está autorizado a crear llamados, revierte con el mensaje "No autorizado"
     */
    function create(bytes32 callId, uint256 timestamp) public notCreated(callId) authorized(msg.sender) returns (CFP) {
        return _createFor(callId, timestamp, msg.sender);
    }

    /**
     * Crea un llamado, estableciendo a `creator` como creador del mismo.
     * Sólo puede ser invocada por el dueño de la factoría.
     * Se comporta en todos los demás aspectos como `createFor(bytes32 callId, uint timestamp)`
     */
    function createFor(
        bytes32 callId,
        uint timestamp,
        address creator
    ) public notCreated(callId) ownerOnly(msg.sender) authorized(creator) returns (CFP) {
        return _createFor(callId, timestamp, creator);
    }

    function setName(bytes32 callId, string memory name) public returns (bytes32) {
      return callsMapping[callId].cfp.setName(name);
    }

    function getName(bytes32 callId, bytes32 node) public view returns (string memory) {
      return callsMapping[callId].cfp.getName(node);
    }

    // Devuelve la cantidad de cuentas que han creado llamados.
    function creatorsCount() public view returns (uint256) {
        return creatorsArray.length;
    }

    /// Devuelve el identificador del llamado que está en la posición `index` de la lista de llamados creados por `creator`
    function createdBy(
        address creator,
        uint256 index
    ) public view returns (bytes32) {
        return CFPMapping[creator][index];
    }

    // Devuelve la cantidad de llamados creados por `creator`
    function createdByCount(address creator) public view returns (uint256) {
        return CFPMapping[creator].length;
    }

    /** Permite a un usuario registrar una propuesta, para un llamado con identificador `callId`.
     *  Si el llamado no existe, revierte con el mensaje  "El llamado no existe".
     *  Registra la propuesta en el llamado asociado con `callId` y pasa como creador la dirección del emisor del mensaje.
     */
    function registerProposal(bytes32 callId, bytes32 proposal) public created(callId) {
        callsMapping[callId].cfp.registerProposalFor(proposal, msg.sender);
    }

    /** Permite que una cuenta se registre para poder crear llamados.
     *  El registro queda en estado pendiente hasta que el dueño de la factoría lo autorice.
     *  Si ya se ha registrado, revierte con el mensaje "Ya se ha registrado"
     */
    function register() public notRegistered(msg.sender) {
        statusMapping[msg.sender] = status.PENDING;
        registerPendingArray.push(msg.sender);
    }

    function removeCreatorFromRegisterPendingArray(address creator) private {
        for (uint i = 0; i < registerPendingArray.length; i++) {
            if (registerPendingArray[i] == creator) {
                registerPendingArray[i] = registerPendingArray[registerPendingArray.length - 1];
                registerPendingArray.pop();
            }
        }
    }

    /** Autoriza a una cuenta a crear llamados.
     *  Sólo puede ser ejecutada por el dueño de la factoría.
     *  En caso contrario revierte con el mensaje "Solo el creador puede hacer esta llamada".
     *  Si la cuenta se ha registrado y está pendiente, la quita de la lista de pendientes.
     */
    function authorize(address creator) public ownerOnly(msg.sender) {
        statusMapping[creator] = status.AUTHORIZED;
        removeCreatorFromRegisterPendingArray(creator);
    }

    /** Quita la autorización de una cuenta para crear llamados.
     *  Sólo puede ser ejecutada por el dueño de la factoría.
     *  En caso contrario revierte con el mensaje "Solo el creador puede hacer esta llamada".
     *  Si la cuenta se ha registrado y está pendiente, la quita de la lista de pendientes.
     */
    function unauthorize(address creator) public ownerOnly(msg.sender) {
        statusMapping[creator] = status.UNAUTHORIZED;
        removeCreatorFromRegisterPendingArray(creator);
    }

    // Devuelve la lista de todas las registraciones pendientes.
    // Sólo puede ser ejecutada por el dueño de la factoría
    // En caso contrario revierte con el mensaje "Solo el creador puede hacer esta llamada".
    function getAllPending() public view ownerOnly(msg.sender) returns (address[] memory) {
        return registerPendingArray;
    }

    // Devuelve la registración pendiente con índice `index`
    // Sólo puede ser ejecutada por el dueño de la factoría
    // En caso contrario revierte con el mensaje "Solo el creador puede hacer esta llamada".
    function getPending(uint256 index) public view ownerOnly(msg.sender) returns (address) {
        return registerPendingArray[index];
    }

    // Devuelve la cantidad de registraciones pendientes.
    // Sólo puede ser ejecutada por el dueño de la factoría
    // En caso contrario revierte con el mensaje "Solo el creador puede hacer esta llamada".
    function pendingCount() public view ownerOnly(msg.sender) returns (uint256) {
        return registerPendingArray.length;
    }

    // Devuelve verdadero si una cuenta se ha registrado, tanto si su estado es pendiente como si ya se la ha autorizado.
    function isRegistered(address account) public view returns (bool) {
        return (statusMapping[account] == status.PENDING || statusMapping[account] == status.AUTHORIZED);
    }

    // Devuelve verdadero si una cuenta está autorizada a crear llamados.
    function isAuthorized(address account) public view returns (bool) {
        return statusMapping[account] == status.AUTHORIZED;
    }

    // Devuelve la lista de CallsForProposals creados
    // Necesaria para integrar una nueva funcion en la API
    function callsList() public view returns (CallForProposals[] memory) {
        return CFPList;
    }
}

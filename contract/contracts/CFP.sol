//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CFP {
    // Evento que se emite cuando alguien registra una propuesta
    event ProposalRegistered(
        bytes32 proposal,
        address sender,
        uint256 blockNumber
    );

    // Estructura que representa una propuesta
    struct ProposalData {
        address sender;
        uint256 blockNumber;
        uint256 timestamp;
    }

    // Variables propias
    bytes32 private CFPId;
    uint256 private CFPClosingTime;
    address private CFPCreator;

    // Mapeo de propuestas
    mapping(bytes32 => ProposalData) private proposalsMapping;
    bytes32[] private proposalsIndex;


    modifier validTimestamp(uint _timestamp) {
        // Importante que la condicion sea > y no >=, ya que >= da error
        require(_timestamp > block.timestamp, "El cierre de la convocatoria no puede estar en el pasado");
        _;
    }

    modifier onlyCreator() {
        require(msg.sender == creator(), "Solo el creador puede hacer esta llamada");
        _;
    }

    modifier isOpen() {
        require(block.timestamp < closingTime(), "Convocatoria cerrada");
        _;
    }

    modifier proposalNotRegistered(bytes32 _proposal) {
        require(proposalTimestamp(_proposal) == 0, "La propuesta ya ha sido registrada");
        _;
    }

    // Devuelve los datos asociados con una propuesta
    function proposalData(
        bytes32 proposal
    ) public view returns (ProposalData memory) {
        return proposalsMapping[proposal];
    }

    // Devuelve la propuesta que está en la posición `index` de la lista de propuestas registradas
    function proposals(uint index) public view returns (bytes32) {
        return proposalsIndex[index];
    }

    // Timestamp del cierre de la recepción de propuestas
    function closingTime() public view returns (uint256) {
        return CFPClosingTime;
    }

    // Identificador de este llamado
    function callId() public view returns (bytes32) {
        return CFPId;
    }

    // Creador de este llamado
    function creator() public view returns (address) {
        return CFPCreator;
    }

    /** Construye un llamado con un identificador y un tiempo de cierre.
     *  Si el `timestamp` del bloque actual es mayor o igual al tiempo de cierre especificado,
     *  revierte con el mensaje "El cierre de la convocatoria no puede estar en el pasado".
     */
    constructor(bytes32 _callId, uint256 _closingTime) validTimestamp(_closingTime) {
        // Seteamos las variables propias del CFP
        CFPId = _callId;
        CFPClosingTime = _closingTime;
        CFPCreator = msg.sender;
    }

    // Devuelve la cantidad de propuestas presentadas
    function proposalCount() public view returns (uint256) {
        return proposalsIndex.length;
    }

    function _registerProposal(bytes32 proposal, address sender) private proposalNotRegistered(proposal) isOpen() {
        // Genero una nueva propuesta en base a la propuesta que me envian
        ProposalData memory newProposal = ProposalData({
            sender: sender,
            blockNumber: block.number,
            timestamp: block.timestamp
        });
        proposalsMapping[proposal] = newProposal;
        proposalsIndex.push(proposal);
        emit ProposalRegistered(proposal, sender, block.number);
    }

    /** Permite registrar una propuesta espec.
     *  Registra al emisor del mensaje como emisor de la propuesta.
     *  Si el timestamp del bloque actual es mayor que el del cierre del llamado,
     *  revierte con el error "Convocatoria cerrada"
     *  Si ya se ha registrado una propuesta igual, revierte con el mensaje
     *  "La propuesta ya ha sido registrada"
     *  Emite el evento `ProposalRegistered`
     */
    function registerProposal(bytes32 proposal) public {
        _registerProposal(proposal, msg.sender);
    }

    /** Permite registrar una propuesta especificando un emisor.
     *  Sólo puede ser ejecutada por el creador del llamado. Si no es así, revierte
     *  con el mensaje "Solo el creador puede hacer esta llamada"
     *  Si el timestamp del bloque actual es mayor que el del cierre del llamado,
     *  revierte con el error "Convocatoria cerrada"
     *  Si ya se ha registrado una propuesta igual, revierte con el mensaje
     *  "La propuesta ya ha sido registrada"
     *  Emite el evento `ProposalRegistered`
     */
    function registerProposalFor(bytes32 proposal, address sender) public onlyCreator() {
        _registerProposal(proposal, sender);
    }

    /** Devuelve el timestamp en el que se ha registrado una propuesta.
     *  Si la propuesta no está registrada, devuelve cero.
     */
    function proposalTimestamp(
        bytes32 proposal
    ) public view returns (uint256) {
        return proposalsMapping[proposal].timestamp;
    }
}

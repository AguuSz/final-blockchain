// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./ENS.sol";

/**
 * The ENS registry contract.
 */
contract ENSRegistry is ENS {
    struct Record {
        address owner;
        address resolver;
        uint64 ttl;
    }

    mapping (bytes32 => Record) records;

    // Permits modifications only by the owner of the specified node.
    modifier only_owner(bytes32 _node) {
        require(records[_node].owner == msg.sender);
        _;
    }

    /**
     * @dev Constructs a new ENS registrar.
     */
    constructor() {
        records[0x0].owner = msg.sender;
    }

    /**
     * @dev Transfers ownership of a node to a new address. May only be called by the current owner of the node.
     * @param _node The node to transfer ownership of.
     * @param _owner The address of the new owner.
     */
    function setOwner(bytes32 _node, address _owner) external only_owner(_node) {
        emit Transfer(_node, _owner);
        records[_node].owner = _owner;
    }

    /**
     * @dev Transfers ownership of a subnode keccak256(_node, label) to a new address. May only be called by the owner of the parent node.
     * @param _node The parent node.
     * @param label The hash of the label specifying the subnode.
     * @param _owner The address of the new owner.
     */
    function setSubnodeOwner(bytes32 _node, bytes32 label, address _owner) external only_owner(_node) {
        bytes32 subnode = keccak256(abi.encodePacked(_node, label));
        emit NewOwner(_node, label, _owner);
        records[subnode].owner = _owner;
    }

    /**
     * @dev Sets the resolver address for the specified node.
     * @param _node The node to update.
     * @param _resolver The address of the resolver.
     */
    function setResolver(bytes32 _node, address _resolver) external only_owner(_node) {
        emit NewResolver(_node, _resolver);   
        records[_node].resolver = _resolver;
    }

    /**
     * @dev Sets the TTL for the specified node.
     * @param _node The node to update.
     * @param _ttl The TTL in seconds.
     */
    function setTTL(bytes32 _node, uint64 _ttl) external only_owner(_node) {
        emit NewTTL(_node, _ttl);
        records[_node].ttl = _ttl;
    }

    /**
     * @dev Returns the address that owns the specified node.
     * @param _node The specified node.
     * @return address of the owner.
     */
    function owner(bytes32 _node) external view returns (address) {
        return records[_node].owner;
    }

    /**
     * @dev Returns the address of the resolver for the specified node.
     * @param _node The specified node.
     * @return address of the resolver.
     */
    function resolver(bytes32 _node) external view returns (address) {
        return records[_node].resolver;
    }

    /**
     * @dev Returns the TTL of a node, and any records associated with it.
     * @param _node The specified node.
     * @return ttl of the node.
     */
    function ttl(bytes32 _node) external view returns (uint64) {
        return records[_node].ttl;
    }

}

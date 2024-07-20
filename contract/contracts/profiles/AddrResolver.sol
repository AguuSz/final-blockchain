// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../ResolverBase.sol";

abstract contract AddrResolver is ResolverBase {
    bytes4 constant private ADDR_INTERFACE_ID = 0x3b3b57de;

    event AddrChanged(bytes32 indexed node, address a);

    mapping(bytes32=>address) addresses;

    /**
     * Sets the address associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param nodeAddr The address to set.
     */
    function setAddr(bytes32 node, address nodeAddr) external authorised(node) {
        addresses[node] = nodeAddr;
        emit AddrChanged(node, nodeAddr);
    }

    /**
     * Returns the address associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated address.
     */
    function addr(bytes32 node) public view returns (address) {
        return addresses[node];
    }

    function supportsInterface(bytes4 interfaceID) public pure virtual override returns(bool) {
        return interfaceID == ADDR_INTERFACE_ID || super.supportsInterface(interfaceID);
    }
}

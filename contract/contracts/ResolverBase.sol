// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

abstract contract ResolverBase {
    bytes4 private constant INTERFACE_META_ID = 0x01ffc9a7;

    function supportsInterface(bytes4 interfaceID) public pure virtual returns(bool) {
        return interfaceID == INTERFACE_META_ID;
    }

    function isAuthorised(bytes32 node) internal view virtual returns(bool);

    modifier authorised(bytes32 node) {
        require(isAuthorised(node),"No autorizado");
        _;
    }
}

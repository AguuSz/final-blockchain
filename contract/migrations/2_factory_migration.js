const Factory = artifacts.require("CFPFactory");
const ENSRegistry = artifacts.require("./ENSRegistry.sol");
const CallFIFSRegistrar = artifacts.require("./CallFIFSRegistrar.sol");
const UserFIFSRegistrar = artifacts.require("./UserFIFSRegistrar.sol");
const PublicResolver = artifacts.require("./PublicResolver.sol");
const ReverseRegistrar = artifacts.require("./ReverseRegistrar.sol");

const fs = require("fs");
const path = require("path");
const web3 = new (require("web3"))();
const namehash = require("eth-ens-namehash");
const keccak256 = web3.utils.keccak256;

module.exports = async function (deployer, network, accounts) {
	// Domains
	const tld = "cfp";
	const llamadosDomain = "llamados";
	const usuariosDomain = "usuarios";
	const reverseDomain = "reverse";
	const addrDomain = "addr";
	const llamadosDomainFull = `${llamadosDomain}.${tld}`;
	const usuariosDomainFull = `${usuariosDomain}.${tld}`;

	/* DOMINIO DE PRIMER NIVEL */
	await deployer.deploy(ENSRegistry);
	let registry = await ENSRegistry.deployed();

	await deployer.deploy(PublicResolver, ENSRegistry.address);
	let resolver = await PublicResolver.deployed();

	await registry.setSubnodeOwner("0x0", keccak256(tld), accounts[0]);

	/* DOMINIOS DE SEGUNDO NIVEL */
	await deployer.deploy(
		CallFIFSRegistrar,
		ENSRegistry.address,
		namehash.hash(llamadosDomainFull)
	);
	let callFIFSRegistrar = await CallFIFSRegistrar.deployed();
	await registry.setSubnodeOwner(
		namehash.hash(tld),
		keccak256(llamadosDomain),
		callFIFSRegistrar.address
	);

	await deployer.deploy(
		UserFIFSRegistrar,
		ENSRegistry.address,
		namehash.hash(usuariosDomainFull)
	);
	let userFIFSRegistrar = await UserFIFSRegistrar.deployed();
	await registry.setSubnodeOwner(
		namehash.hash(tld),
		keccak256(usuariosDomain),
		userFIFSRegistrar.address
	);

	/* REVERSE REGISTRAR */
	await deployer.deploy(
		ReverseRegistrar,
		ENSRegistry.address,
		PublicResolver.address
	);
	let reverseRegistrar = await ReverseRegistrar.deployed();
	await registry.setSubnodeOwner("0x0", keccak256(reverseDomain), accounts[0]);
	await registry.setSubnodeOwner(
		namehash.hash(reverseDomain),
		keccak256(addrDomain),
		reverseRegistrar.address
	);

	/* CONTRATO CFPFactory */
	await deployer.deploy(
		Factory,
		reverseRegistrar.address,
		PublicResolver.address
	);
};

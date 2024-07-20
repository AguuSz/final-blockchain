import Web3 from "web3";
import ENSRegistry from "../../../contract/build/contracts/ENSRegistry.json";
import PublicResolver from "../../../contract/build/contracts/PublicResolver.json";
import CallFIFSRegistrar from "../../../contract/build/contracts/CallFIFSRegistrar.json";
import UserFIFSRegistrar from "../../../contract/build/contracts/UserFIFSRegistrar.json";
import ReverseRegistrar from "../../../contract/build/contracts/ReverseRegistrar.json";
import CFPFactory from "../../../contract/build/contracts/CFPFactory.json";
let web3;

if (window.ethereum) {
	web3 = new Web3(window.ethereum);
} else {
	web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:7545"));
}

const cfpFactoryContract = new web3.eth.Contract(
	CFPFactory.abi,
	CFPFactory.networks[5777].address
);

const ensRegistryContract = new web3.eth.Contract(
	ENSRegistry.abi,
	ENSRegistry.networks[5777].address
);

const callFIFSRegistrarContract = new web3.eth.Contract(
	CallFIFSRegistrar.abi,
	CallFIFSRegistrar.networks[5777].address
);

const userFIFSRegistrarContract = new web3.eth.Contract(
	UserFIFSRegistrar.abi,
	UserFIFSRegistrar.networks[5777].address
);

const publicResolverContract = new web3.eth.Contract(
	PublicResolver.abi,
	PublicResolver.networks[5777].address
);

const reverseRegistrarContract = new web3.eth.Contract(
	ReverseRegistrar.abi,
	ReverseRegistrar.networks[5777].address
);

export {
	web3,
	cfpFactoryContract,
	ensRegistryContract,
	callFIFSRegistrarContract,
	userFIFSRegistrarContract,
	publicResolverContract,
	reverseRegistrarContract,
};

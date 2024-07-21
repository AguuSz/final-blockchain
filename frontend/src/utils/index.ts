/* eslint-disable no-mixed-spaces-and-tabs */
import { getContractAddress } from "@/services/apiService";
import { getAddress } from "ethers";
import Web3 from "web3";

export const formatBalance = (rawBalance: string) => {
	const balance = (parseInt(rawBalance) / 1000000000000000000).toFixed(2);
	return balance;
};

export const formatChainAsNum = (chainIdHex: string) => {
	const chainIdNum = parseInt(chainIdHex);
	return chainIdNum;
};

export const formatAddress = (addr: string) => {
	const upperAfterLastTwo = addr.slice(0, 2) + addr.slice(2);
	return `${upperAfterLastTwo.substring(0, 5)}...${upperAfterLastTwo.substring(
		39
	)}`;
};

export const getUserSignature = async (callId?: string) => {
	if (window.ethereum) {
		const accounts: string[] = (await window.ethereum.request({
			method: "eth_requestAccounts",
		})) as Promise<string[]>;
		const account = accounts[0];

		const response = await getContractAddress();
		const cfpAddress = response?.address;
		const suffix = callId ? callId.slice(2) : "";

		const msg = `${cfpAddress}${suffix}`;

		const encodedMsg = Web3.utils.utf8ToHex(msg);

		const signature = (await window.ethereum.request({
			method: "personal_sign",
			params: [encodedMsg, account],
		})) as Promise<string>;

		return signature;
	}
};

export const toChecksumAddress = (address: string) => {
	return getAddress(address);
};

export const generateRandomHash = (length: number) => {
	if (length % 2 !== 0) {
		throw new Error(
			"Length must be an even number to generate a valid hex string."
		);
	}

	const byteLength = length / 2; // Cada byte se convierte en dos caracteres hexadecimales
	const array = new Uint8Array(byteLength);
	window.crypto.getRandomValues(array);
	let hexString = "";
	for (let i = 0; i < array.length; i++) {
		hexString += array[i].toString(16).padStart(2, "0");
	}
	return "0x" + hexString;
};

export const getRandomFutureDate = (daysInFuture: number) => {
	const now = new Date();
	const future = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + daysInFuture
	);
	return future.toISOString().split(".")[0] + "-03:00";
};

export const nameHash = (domain: string) => {
	let node =
		"0x0000000000000000000000000000000000000000000000000000000000000000";
	domain.toString();
	if (domain !== "") {
		const labels = domain.split(".");

		for (let i = labels.length - 1; i >= 0; i--) {
			const labelSha3 = Web3.utils.sha3(labels[i]);
			node = Web3.utils.sha3(node + labelSha3.slice(2), { encoding: "hex" });
		}
	}

	return node;
};

import { create, StateCreator } from "zustand";
import { Call } from "@/types";

// Define la interfaz para el slice de Call
interface CallSlice {
	call: Call;
	setSelectedCall: (call: Call) => void;
	clearSelectedCall: () => void;
}

// Define la interfaz para el slice de Metamask
interface MetamaskSlice {
	selectedWallet: EIP6963ProviderDetail | null;
	userAccount: string;
	userSignature: string;
	setSelectedWallet: (wallet: EIP6963ProviderDetail) => void;
	setUserAccount: (account: string) => void;
	setUserSignature: (signature: string) => void;
	clearSelectedWallet: () => void;
	clearUserAccount: () => void;
}

// Define la interfaz para el slice de CFPAddress
interface CFPAddressSlice {
	cfpAddress: string;
	setCfpAddress: (cfpAddress: string) => void;
}

// Define la interfaz para el slice de Contract
interface ContractSlice {
	contract: any;
	setContract: (contract: any) => void;
	clearContract: () => void;
}

// Define la interfaz para el slice de Web3
interface Web3Slice {
	web3: any;
	setWeb3: (web3: any) => void;
	clearWeb3: () => void;
}

// Crea el slice de Call
const createCallSlice: StateCreator<
	CallSlice & MetamaskSlice & CFPAddressSlice & ContractSlice & Web3Slice,
	[],
	[],
	CallSlice
> = (set) => ({
	call: { callId: "", selected: false, owner: "", timestamp: "" },
	setSelectedCall: (call: Call) => set({ call }),
	clearSelectedCall: () =>
		set({ call: { callId: "", selected: false, owner: "", timestamp: "" } }),
});

// Crea el slice de Metamask
const createMetamaskSlice: StateCreator<
	CallSlice & MetamaskSlice & CFPAddressSlice & ContractSlice & Web3Slice,
	[],
	[],
	MetamaskSlice
> = (set) => ({
	selectedWallet: null,
	userAccount: "",
	userSignature: "",
	setSelectedWallet: (wallet: EIP6963ProviderDetail) =>
		set({ selectedWallet: wallet }),
	setUserAccount: (account: string) => set({ userAccount: account }),
	setUserSignature: (signature: string) => set({ userSignature: signature }),
	clearSelectedWallet: () => set({ selectedWallet: null }),
	clearUserAccount: () => set({ userAccount: "" }),
});

// Crea el slice de CFPAddress
const createCFPAddressSlice: StateCreator<
	CallSlice & MetamaskSlice & CFPAddressSlice & ContractSlice & Web3Slice,
	[],
	[],
	CFPAddressSlice
> = (set) => ({
	cfpAddress: "",
	setCfpAddress: (cfpAddress: string) => set({ cfpAddress }),
});

// Crea el slice de Contract
const createContractSlice: StateCreator<
	CallSlice & MetamaskSlice & CFPAddressSlice & ContractSlice & Web3Slice,
	[],
	[],
	ContractSlice
> = (set) => ({
	contract: null,
	setContract: (contract: any) => set({ contract }),
	clearContract: () => set({ contract: null }),
});

// Crea el slice de Web3
const createWeb3Slice: StateCreator<
	CallSlice & MetamaskSlice & CFPAddressSlice & ContractSlice & Web3Slice,
	[],
	[],
	Web3Slice
> = (set) => ({
	web3: null,
	setWeb3: (web3: any) => set({ web3 }),
	clearWeb3: () => set({ web3: null }),
});

// Crea el store combinado
export const useStore = create<
	CallSlice & MetamaskSlice & CFPAddressSlice & ContractSlice & Web3Slice
>()((...a) => ({
	...createCallSlice(...a),
	...createMetamaskSlice(...a),
	...createCFPAddressSlice(...a),
	...createContractSlice(...a),
	...createWeb3Slice(...a),
}));

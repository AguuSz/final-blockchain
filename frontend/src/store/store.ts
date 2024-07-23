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

// Crea el slice de Call
const createCallSlice: StateCreator<
	CallSlice & MetamaskSlice,
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
	CallSlice & MetamaskSlice,
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

// Crea el store combinado
export const useStore = create<CallSlice & MetamaskSlice>()((...a) => ({
	...createCallSlice(...a),
	...createMetamaskSlice(...a),
}));

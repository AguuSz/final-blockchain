import { toChecksumAddress } from "@/utils";
import axios from "axios";

const api = axios.create({
	baseURL: "http://127.0.0.1:5000",
});

export const getCalls = async () => {
	try {
		const response = await api.get("/calls");
		return response;
	} catch (error) {
		console.error("Error fetching calls:", error);
	}
};

export const createCall = async (
	signature: string,
	callId: string,
	closingTime: string
) => {
	try {
		const response = await api.post("/create", {
			signature: signature,
			callId: callId,
			closingTime: closingTime,
		});
		return {
			statusCode: response.status,
			message: response.data.message,
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const { message } = JSON.parse(error.request.response);
			return {
				statusCode: error.request.status,
				message,
			};
		} else {
			console.error("Error registering user:", error);
		}
	}
};

export const registerUser = async (address: string, signature: string) => {
	try {
		const response = await api.post("/register", {
			address: address,
			signature: signature,
		});
		return {
			statusCode: response.status,
			message: response.data.message,
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const { message } = JSON.parse(error.request.response);
			return {
				statusCode: error.request.status,
				message,
			};
		} else {
			console.error("Error registering user:", error);
		}
	}
};

export const authorizeUser = async (address: string) => {
	console.log(toChecksumAddress(address));
	try {
		const response = await api.post(`/authorize/${toChecksumAddress(address)}`);
		return {
			statusCode: response.status,
			message: response.data.message,
		};
	} catch (error) {
		console.error("Error authorizing user:", error);
	}
};

export const registerProposal = async (callId: string, proposal: string) => {
	try {
		const response = await api.post(`/register-proposal`, {
			callId: callId,
			proposal: proposal,
		});
		return {
			statusCode: response.status,
			message: response.data.message,
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const { message } = JSON.parse(error.request.response);
			return {
				statusCode: error.request.status,
				message,
			};
		} else {
			console.error("Error registering proposal:", error);
		}
	}
};

export const verifyProposal = async (callId: string, proposal: string) => {
	try {
		const response = await api.get(`/proposal-data/${callId}/${proposal}`);
		return {
			statusCode: response.status,
			message: response.data.message,
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const { message } = JSON.parse(error.request.response);
			return {
				statusCode: error.request.status,
				message,
			};
		} else {
			console.error("Error verifying proposal:", error);
		}
	}
};

export const getPendingUsers = async () => {
	try {
		const response = await api.get("/pending-users");
		return {
			statusCode: response.status,
			users: response.data,
		};
	} catch (error) {
		console.error("Error getting pending users:", error);
	}
};

export const isUserAuthorized = async (address: string) => {
	try {
		const response = await api.get(`/authorized/${toChecksumAddress(address)}`);
		return response.data.authorized;
	} catch (error) {
		console.error("Error getting user");
	}
};

export const getFactoryOwner = async () => {
	try {
		const response = await api.get("/contract-owner");
		return {
			statusCode: response.status,
			address: response.data.address,
		};
	} catch (error) {
		console.error("Error getting factory owner address:", error);
	}
};

export const getContractAddress = async () => {
	try {
		const response = await api.get("/contract-address");
		return {
			statusCode: response.status,
			address: response.data.address,
		};
	} catch (error) {
		console.error("Error getting contract address:", error);
	}
};

export const getProposalData = async (callId: string, proposal: string) => {
	try {
		const response = await api.get(`/proposal-data/${callId}/${proposal}`);
		console.log(response);
	} catch (error) {
		console.error("Error fetching proposal data:", error);
	}
};

// Tipo para las calls
export type Call = {
	callId: string;
	name: string;
	owner: string;
	ownerAddress: string;
	timestamp: string;
	selected: boolean;
};

export type File = {
	path: string;
	lastModified: number;
	lastModifiedDate: Date;
	name: string;
	size: number;
	type: string;
	webkitRelativePath: string;
};

export type UserAddress = {
	address: string;
};

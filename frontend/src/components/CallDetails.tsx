import { Call } from "@/types";
import { nameHash } from "@/utils";
import { cfpFactoryContract, publicResolverContract } from "@/utils/web3Config"; // Asegúrate de importar publicResolverContract
import React, { useState, useEffect } from "react";

type Props = {
	call: Call;
};

const CallDetails = (props: Props) => {
	const [callDescription, setCallDescription] = useState("");

	useEffect(() => {
		const fetchCallDetails = async () => {
			try {
				const cfp = await cfpFactoryContract.methods
					.calls("0x" + props.call.callId)
					.call();
				console.log(cfp);
				const reverseNode = nameHash(
					`${cfp[1].toLowerCase().substring(2)}.addr.reverse`
				);
				const description = await publicResolverContract.methods
					.text(reverseNode, "description")
					.call();
				setCallDescription(description);
			} catch (error) {
				console.log("Error al resolver la descripción del llamado: ", error);
				setCallDescription("No hay descripcion registrada.");
			}
		};
		fetchCallDetails();
	}, []);

	return (
		<div className="mt-4">
			<p>Call ID: {props.call.callId}</p>
			<p>Call name: {props.call.name}</p>
			<p>Call Owner: {props.call.owner}</p>
			<p>Call Owner Address: {props.call.ownerAddress}</p>
			<p>Call Description: {callDescription || ""}</p>
		</div>
	);
};

export default CallDetails;

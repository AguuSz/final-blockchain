import { useStore } from "@/store/store";
import { Button } from "./ui/button";
import { Check, Copy } from "lucide-react";
import { formatAddress, nameHash, toChecksumAddress } from "@/utils";
import { useEffect, useState } from "react";
import { publicResolverContract } from "@/utils/web3Config";

const CopyButton = () => {
	const { userAccount } = useStore();
	const [copied, setCopied] = useState(false);
	const [accountName, setAccountName] = useState("");

	useEffect(() => {
		resolveAddress();
	});

	const resolveAddress = async () => {
		if (userAccount === "") return;

		try {
			const reverseNode = nameHash(
				`${userAccount.substring(2).toLowerCase()}.addr.reverse`
			);
			const name = await publicResolverContract.methods
				.name(reverseNode)
				.call();

			// A la hora de retornar, no se si tiene que retornar con name.usuarios.cfp o solo name
			setAccountName(name || formatAddress(toChecksumAddress(userAccount)));
		} catch (error) {
			console.log("Error obteniendo el nombre: ", error);
			setAccountName(formatAddress(toChecksumAddress(userAccount)));
		}
	};

	const handleCopy = () => {
		setCopied(true);
		navigator.clipboard.writeText(toChecksumAddress(userAccount));

		setTimeout(() => {
			setCopied(false);
		}, 500);
	};

	return (
		<Button
			variant="outline"
			className="w-40"
			onClick={handleCopy}
			disabled={!userAccount}>
			{copied ? (
				<>
					<Check size={16} className="mr-2" />
					Copiado
				</>
			) : (
				<>
					<Copy size={16} className="mr-2" />
					{accountName}
				</>
			)}
		</Button>
	);
};

export default CopyButton;

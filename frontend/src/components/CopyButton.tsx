import { useStore } from "@/store/store";
import { Button } from "./ui/button";
import { Check, Copy } from "lucide-react";
import { formatAddress, toChecksumAddress } from "@/utils";
import { useState } from "react";

const CopyButton = () => {
	const { userAccount } = useStore();
	const [copied, setCopied] = useState(false);

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
					{userAccount !== ""
						? formatAddress(toChecksumAddress(userAccount))
						: ""}
				</>
			)}
		</Button>
	);
};

export default CopyButton;

import { useSyncProviders } from "@/hooks/useSyncProviders";
import { useStore } from "@/store/store";
import { formatAddress } from "@/utils";
import { Button } from "./ui/button";
import { useEffect } from "react";

export const DiscoverWalletProviders = () => {
	const { selectedWallet, setSelectedWallet, userAccount, setUserAccount } =
		useStore();

	const providers = useSyncProviders();

	useEffect(() => {
		if (providers.length > 0) handleConnect(providers[0]);
	}, [providers]);

	// Connect to the selected provider using eth_requestAccounts.
	const handleConnect = async (providerWithInfo: EIP6963ProviderDetail) => {
		try {
			const accounts: string[] = (await providerWithInfo.provider.request({
				method: "eth_requestAccounts",
			})) as string[];

			await setSelectedWallet(providerWithInfo);
			await setUserAccount(accounts?.[0]);
		} catch (error) {
			console.error(error);
		}
	};

	// Display detected providers as connect buttons.
	return (
		<>
			{/* A wallet has been found */}
			<div>
				{providers.length > 0 ? (
					providers?.map((provider: EIP6963ProviderDetail) => (
						<Button
							size="icon"
							variant="outline"
							key={provider.info.uuid}
							onClick={() => handleConnect(provider)}>
							<img src="/metamask-icon.svg" alt="metamask" />
						</Button>
					))
				) : (
					// A wallet is not detected
					<p>Metamask no se encuentra instalado en el sistema.</p>
				)}
			</div>
			<hr />
			<h2>{userAccount ? "" : "No "} Wallet has been selected.</h2>
			{userAccount && (
				<div>
					<div>
						<p>Provider: {selectedWallet?.info.name}</p>
						<p>Account address: {formatAddress(userAccount)}</p>
					</div>
				</div>
			)}
		</>
	);
};

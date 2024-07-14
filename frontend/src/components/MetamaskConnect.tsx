import { useSyncProviders } from "@/hooks/useSyncProviders";
import { useStore } from "@/store/store";
import { Button } from "./ui/button";
import { useState } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, Loader2 } from "lucide-react";
import { toast } from "./ui/use-toast";
import buildInfo from "../../../contract/build/contracts/CFPFactory.json";
import Web3 from "web3";
import { toChecksumAddress } from "@/utils";

const MetamaskConnect = () => {
	const {
		setSelectedWallet,
		setUserAccount,
		clearUserAccount,
		setContract,
		setWeb3,
	} = useStore();

	const providers = useSyncProviders();

	const [isConnected, setIsConnected] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const getFactoryAddress = () => {
		return buildInfo.networks[5777].address;
	};

	// Connect to the selected provider using eth_requestAccounts.
	const handleConnect = async (providerWithInfo: EIP6963ProviderDetail) => {
		providers.forEach(async (provider) => {
			if (provider.info.name === "MetaMask") {
				try {
					setIsLoading(true);
					const accounts: string[] = (await providerWithInfo.provider.request({
						method: "eth_requestAccounts",
					})) as string[];

					await setSelectedWallet(providerWithInfo);
					await setUserAccount(toChecksumAddress(accounts?.[0]));

					const web3Instance = new Web3(window.ethereum);
					const contractInstance = new web3Instance.eth.Contract(
						buildInfo.abi,
						getFactoryAddress()
					);
					setWeb3(web3Instance);
					setContract(contractInstance);

					setIsConnected(true);
					setIsLoading(false);
				} catch (error) {
					// El usuario cancelo la peticion de conexion
					setIsLoading(false);
					toast({
						title: "Error",
						description: "No se ha podido conectar con Metamask",
						variant: "destructive",
					});
				}
			}
		});
	};

	const handleLogout = () => {
		clearUserAccount();
		setIsConnected(false);
	};

	return (
		<div>
			{providers.length > 0 ? (
				providers?.map((provider: EIP6963ProviderDetail, i) => (
					<TooltipProvider delayDuration={100} key={i}>
						<Tooltip>
							{isConnected ? (
								<>
									<TooltipTrigger asChild>
										<div className="relative">
											<Button
												size="icon"
												variant="outline"
												className="flex justify-center items-center hover:bg-red-700"
												key={provider.info.uuid}
												onClick={handleLogout}>
												<img src="/metamask-icon.svg" alt="metamask" />
												<div className="rounded-full bg-white text-black absolute top-[-10px] right-[-10px]">
													<Check size={20} className="p-1" />
												</div>
											</Button>
										</div>
									</TooltipTrigger>
									<TooltipContent side="bottom">
										<p>Desconecta la cuenta.</p>
									</TooltipContent>
								</>
							) : (
								<>
									{isLoading ? (
										<div>
											<Button
												size="icon"
												variant="outline"
												className="flex justify-center items-center">
												<Loader2 size={20} className="animate-spin" />
											</Button>
										</div>
									) : (
										<>
											<TooltipTrigger asChild>
												<div className="relative">
													<Button
														size="icon"
														variant="outline"
														className="flex justify-center items-center"
														key={provider.info.uuid}
														onClick={() => handleConnect(provider)}>
														<img src="/metamask-icon.svg" alt="metamask" />
													</Button>
												</div>
											</TooltipTrigger>
											<TooltipContent side="bottom">
												<p>Conecta la app con Metamask.</p>
											</TooltipContent>
										</>
									)}
								</>
							)}
						</Tooltip>
					</TooltipProvider>
				))
			) : (
				// A wallet is not detected
				<>
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger asChild>
								<span tabIndex={0}>
									<Button size="icon" variant="outline" key="disabled" disabled>
										<img src="/metamask-icon.svg" alt="metamask" />
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<p>Necesitas tener Metamask en tu navegador.</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</>
			)}
		</div>
	);
};

export default MetamaskConnect;

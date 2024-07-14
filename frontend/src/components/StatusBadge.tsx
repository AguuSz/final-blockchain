import { ShieldBan, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { useStore } from "@/store/store";
import { useEffect, useState } from "react";
import { isUserAuthorized } from "@/services/apiService";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";
import { toast } from "./ui/use-toast";

const StatusBadge = () => {
	const { userAccount, contract } = useStore();
	const [isAuthorized, setIsAuthorized] = useState(false);

	useEffect(() => {
		const getAuthorizationStatus = async () => {
			const response = await isUserAuthorized(userAccount);
			setIsAuthorized(response);
		};

		if (userAccount !== "") {
			getAuthorizationStatus();
		} else {
			setIsAuthorized(false);
		}
	}, [userAccount]);

	const handleRegister = async () => {
		try {
			await contract.methods
				.register(userAccount)
				.send({ from: userAccount, gas: "1000000", gasPrice: 1000000000 })
				.on(
					"confirmation",
					async (confirmationNumber: number, receipt: any) => {
						toast({
							title: "Exito en el registro!",
							description: "Ahora solo espera hasta que te autoricen.",
						});
					}
				)
				.on("error", (error: any, receipt: any) => {
					toast({
						title: "Error",
						description: `Error al registrar al usuario: ${error.message}`,
					});
				});
		} catch (error) {
			if (error.code === 4001) {
				toast({
					title: "Error",
					description: "El usuario ha cancelado la peticion de firma.",
				});
			} else {
				toast({
					title: "Error",
					description: "Se ha producido un error.",
				});
			}
		}
	};

	return (
		<>
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger asChild>
						<span tabIndex={0}>
							<Button
								disabled={isAuthorized || !userAccount}
								onClick={handleRegister}
								size="icon"
								variant="outline">
								{isAuthorized ? (
									<ShieldCheck size={16} />
								) : (
									<ShieldBan size={16} />
								)}
							</Button>
						</span>
					</TooltipTrigger>
					<TooltipContent side="bottom">
						{isAuthorized ? "Usuario autorizado" : "Usuario no autorizado"}
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</>
	);
};

export default StatusBadge;

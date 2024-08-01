import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/store";
import { Call } from "@/types";
import {
	Circle,
	CircleCheck,
	LoaderCircle,
	Plus,
	RefreshCcw,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getCalls } from "../services/apiService";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "@/components/ui/input";
import { nameHash } from "@/utils";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { CallForm } from "./CallForm";
import { cfpFactoryContract, publicResolverContract } from "@/utils/web3Config";

const CallsTable = ({ className }: { className?: string }) => {
	const [calls, setCalls] = useState<Call[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [creatorAddress, setCreatorAddress] = useState("");
	const { setSelectedCall, clearSelectedCall } = useStore();

	const { userAccount } = useStore();
	const isUserConnected = userAccount !== "";

	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const fetchCalls = async (address = "") => {
		setIsLoading(true);
		try {
			const callsList = await getCalls();

			if (!callsList) {
				setCalls([]);
				toast("Error", {
					description: "Hubo un error al cargar las llamadas",
					id: "error-loading-calls",
				});
				return;
			}

			let updatedCalls = callsList?.data.callsList.map((call) => ({
				...call,
				selected: false,
			}));

			if (address) {
				updatedCalls = updatedCalls.filter(
					(call) => call.owner.toLowerCase() === address.toLowerCase()
				);
			}

			updatedCalls = await Promise.all(
				updatedCalls.map(async (call) => {
					const resolvedName = await resolveOwnerName(call.owner);
					const resolvedCallId = await resolveCallName(call.callId);
					return {
						...call,
						owner: resolvedName,
						ownerAddress: call.owner,
						name: resolvedCallId,
					};
				})
			);

			// Filtro para eliminar los llamados sin nombre
			updatedCalls = updatedCalls.filter((call) => call.name !== "");

			setCalls(updatedCalls);
		} catch (error) {
			setCalls([]);
			toast("Error", {
				description: "Hubo un error al cargar las llamadas",
				id: "error-loading-calls",
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		let isMounted = true;
		if (isMounted) fetchCalls();
		return () => {
			isMounted = false;
		};
	}, []);

	const handleCallClick = (selectedCall: Call) => {
		const updatedCalls = calls.map((call) => ({
			...call,
			selected: call.callId === selectedCall.callId ? !call.selected : false,
		}));
		setCalls(updatedCalls);
		if (selectedCall.selected) {
			clearSelectedCall();
		} else {
			setSelectedCall(selectedCall);
		}
	};

	const handleAddressChange = (e) => {
		setCreatorAddress(e.target.value);
	};

	const handleAddressFilter = () => {
		fetchCalls(creatorAddress);
	};

	const handleResetFilter = () => {
		setCreatorAddress("");
		fetchCalls("");
	};

	const resolveCallName = async (callId: string) => {
		try {
			const cfp = await cfpFactoryContract.methods.calls("0x" + callId).call();
			const reverseNode = nameHash(
				`${cfp[1].toLowerCase().substring(2)}.addr.reverse`
			);

			const name = await publicResolverContract.methods
				.name(reverseNode)
				.call();

			return name;
		} catch (error) {
			console.log(
				`Error al resolver el nombre para el callId ${callId}: `,
				error
			);
			return "";
		}
	};

	const resolveOwnerName = async (account) => {
		try {
			const reverseNode = nameHash(
				`${account.substring(2).toLowerCase()}.addr.reverse`
			);
			const name = await publicResolverContract.methods
				.name(reverseNode)
				.call();

			return name || account;
		} catch (error) {
			console.log("Error obteniendo el nombre: ", error);
			return account;
		}
	};

	const renderHeader = () => (
		<div className="flex flex-row items-center justify-between">
			<h1 className="text-center w-screen my-1 text-xl">
				{calls.length === 0 ? "No hay llamados" : "Lista de llamadas"}
			</h1>
			<div className="flex gap-2">
				{isUserConnected && (
					<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="outline" onClick={() => setIsDialogOpen(true)}>
								<Plus size={20} />
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Creacion de un nuevo llamado</DialogTitle>
								<CallForm onClose={() => setIsDialogOpen(false)} />
							</DialogHeader>
						</DialogContent>
					</Dialog>
				)}
				<Button
					variant="outline"
					className="group"
					onClick={() => fetchCalls(creatorAddress)}>
					<RefreshCcw
						size={20}
						className="group-hover:animate-spin transform rotate-180"
					/>
				</Button>
			</div>
		</div>
	);

	const renderFilterBar = () => (
		<div className="flex flex-row mt-3 gap-2 relative">
			<Input
				type="text"
				placeholder="Ingresar dirección del creador"
				value={creatorAddress}
				onChange={handleAddressChange}
				className="pr-15" // Padding a la derecha para el icono
			/>
			<Button
				variant="ghost"
				size="icon"
				className="absolute right-20"
				onClick={handleResetFilter}>
				<X size={20} />
			</Button>
			<Button variant="outline" onClick={handleAddressFilter}>
				Filtrar
			</Button>
		</div>
	);

	const renderTableContent = () => {
		if (isLoading) {
			return (
				<LoaderCircle
					size={48}
					className="animate-spin flex items-center justify-center w-full"
				/>
			);
		}

		if (calls.length === 0) {
			return (
				<div className="flex flex-col">
					{renderHeader()}
					{renderFilterBar()}
				</div>
			);
		}

		return (
			<div className="flex flex-col">
				{renderHeader()}
				{renderFilterBar()}
				<ScrollArea className="h-96 mt-2">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="text-center">Selected?</TableHead>
								<TableHead className="text-center">Call ID</TableHead>
								<TableHead className="text-center">Creator</TableHead>
								<TableHead className="text-center">Fecha de cierre</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{calls.map((call) => (
								<TableRow
									key={call.callId}
									onClick={() => handleCallClick(call)}
									className={cn(call.selected && "bg-muted hover:bg-muted")}>
									<TableCell className="flex justify-center items-center">
										{call.selected ? (
											<CircleCheck size={20} />
										) : (
											<Circle size={20} />
										)}
									</TableCell>
									<TableCell key={call.callId} className="text-center">
										{call.name}
									</TableCell>
									<TableCell className="text-center">{call.owner}</TableCell>
									<TableCell>
										{new Date(Number(call.timestamp) * 1000).toLocaleString(
											"es-AR",
											{
												day: "2-digit",
												month: "2-digit",
												year: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											}
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</ScrollArea>
			</div>
		);
	};

	return (
		<div className={`p-4 w-full rounded-md border ${className}`}>
			{renderTableContent()}
		</div>
	);
};

export default CallsTable;

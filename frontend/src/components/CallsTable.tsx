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
} from "lucide-react";
import { useEffect, useState } from "react";
import { getCalls } from "../services/apiService";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "@/components/ui/input"; // Importa el componente Input de ShadCN UI
import { toChecksumAddress } from "@/utils";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { CallForm } from "./CallForm";

const CallsTable = ({ className }: { className?: string }) => {
	const [calls, setCalls] = useState<Call[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [showMine, setShowMine] = useState(false);
	const [creatorAddress, setCreatorAddress] = useState(""); // Nuevo estado para la dirección del creador
	const { setSelectedCall, clearSelectedCall } = useStore();
	const { toast } = useToast();

	const { userAccount } = useStore();
	const isUserConnected = userAccount !== "";

	const fetchCalls = async (address = "") => {
		setIsLoading(true);
		try {
			const callsList = await getCalls();

			if (!callsList) {
				setIsLoading(false);
				setCalls([]);
				toast({
					title: "Error",
					description: "Hubo un error al cargar las llamadas",
					variant: "destructive",
				});
				return;
			}

			let updatedCalls = callsList?.data.callsList.map((call: Call) => ({
				...call,
				selected: false,
			}));

			if (address) {
				updatedCalls = updatedCalls.filter(
					(call: Call) => call.owner.toLowerCase() === address.toLowerCase()
				);
			}

			setCalls(updatedCalls);
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			setCalls([]);
			toast({
				title: "Error",
				description: "Hubo un error al cargar las llamadas",
				variant: "destructive",
			});
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

	const showOnlyMine = () => {
		if (showMine) {
			fetchCalls(creatorAddress); // Mostrar todos los llamados
		} else {
			const filteredCalls = calls.filter(
				(call) => call.owner === toChecksumAddress(userAccount)
			);
			setCalls(filteredCalls); // Mostrar solo mis llamados
		}
		setShowMine(!showMine); // Cambiar el estado del checkbox
	};

	const handleAddressChange = (e) => {
		setCreatorAddress(e.target.value);
	};

	const handleAddressFilter = () => {
		fetchCalls(creatorAddress);
	};

	return (
		<div className={`p-4 w-full rounded-md border ${className}`}>
			{isLoading ? (
				<LoaderCircle
					size={48}
					className="animate-spin flex items-center justify-center w-full"
				/>
			) : (
				<>
					{calls.length === 0 ? (
						<div className="flex flex-col">
							<div className="flex flex-row items-center justify-between">
								{isUserConnected && (
									<div className="flex flex-row gap-x-2">
										<Checkbox id="showOnlyMine" onClick={showOnlyMine} />
										<label
											htmlFor="showOnlyMine"
											className="text-sm text-muted-foreground font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
											Mostrar unicamente mis llamados
										</label>
									</div>
								)}
								<h1
									className={cn(
										userAccount ? "" : "text-center w-screen my-1",
										"text-xl"
									)}>
									No hay llamados
								</h1>
								{isUserConnected && (
									<div className="flex gap-2">
										<Dialog>
											<DialogTrigger asChild>
												<Button variant="outline">
													<Plus size={20} />
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>
														Creacion de un nuevo llamado
													</DialogTitle>
													<CallForm />
												</DialogHeader>
											</DialogContent>
										</Dialog>
										<Button
											variant="outline"
											className="group"
											onClick={() => fetchCalls(creatorAddress)}>
											<RefreshCcw
												size={20}
												className="group-hover:animate-spin"
											/>
										</Button>
									</div>
								)}
							</div>
							<div className="flex flex-row mt-3 gap-2">
								<Input
									type="text"
									placeholder="Ingresar dirección del creador"
									value={creatorAddress}
									onChange={handleAddressChange}
								/>
								<Button variant="outline" onClick={handleAddressFilter}>
									Filtrar
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-col">
							<div className="flex flex-row items-center justify-between">
								{isUserConnected && (
									<div className="flex flex-row gap-x-2">
										<Checkbox id="showOnlyMine" onClick={showOnlyMine} />
										<label
											htmlFor="showOnlyMine"
											className="text-sm text-muted-foreground font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
											Mostrar unicamente mis llamados
										</label>
									</div>
								)}
								<h1
									className={cn(
										userAccount ? "" : "text-center w-screen my-1",
										"text-xl"
									)}>
									Lista de llamadas
								</h1>
								{isUserConnected && (
									<div className="flex gap-2">
										<Dialog>
											<DialogTrigger asChild>
												<Button variant="outline">
													<Plus size={20} />
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>
														Creacion de un nuevo llamado
													</DialogTitle>
													<CallForm />
												</DialogHeader>
											</DialogContent>
										</Dialog>
										<Button
											variant="outline"
											className="group"
											onClick={() => fetchCalls(creatorAddress)}>
											<RefreshCcw
												size={20}
												className="group-hover:animate-spin"
											/>
										</Button>
									</div>
								)}
							</div>
							<div className="flex flex-row mt-3 gap-2">
								<Input
									type="text"
									placeholder="Ingresar dirección del creador"
									value={creatorAddress}
									onChange={handleAddressChange}
								/>
								<Button variant="outline" onClick={handleAddressFilter}>
									Filtrar
								</Button>
							</div>
							<ScrollArea className="h-96 mt-2">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="text-center">Selected?</TableHead>
											<TableHead className="text-center">Call ID</TableHead>
											<TableHead className="text-center">Creator</TableHead>
											<TableHead className="text-center">
												Fecha de cierre
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{calls.map((call) => (
											<TableRow
												key={call.callId}
												onClick={() => handleCallClick(call)}
												className={cn(
													call.selected && "bg-muted hover:bg-muted"
												)}>
												<TableCell>
													{call.selected ? (
														<CircleCheck size={24} />
													) : (
														<Circle size={24} />
													)}
												</TableCell>
												<TableCell className="text-left">
													{call.callId}
												</TableCell>
												<TableCell>{call.owner}</TableCell>
												<TableCell>
													{new Date(
														Number(call.timestamp) * 1000
													).toLocaleString("es-AR", {
														day: "2-digit",
														month: "2-digit",
														year: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</ScrollArea>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default CallsTable;

import { Button } from "@/components/ui/button";
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
import { getFactoryOwner, getPendingUsers } from "@/services/apiService";
import { useStore } from "@/store/store";
import { toChecksumAddress } from "@/utils";
import { Check, LoaderCircle, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { cfpFactoryContract } from "@/utils/web3Config";

type User = {
	address: string;
	selected: boolean;
};

const AuthorizePage = () => {
	const [isLoading, setIsLoading] = useState(false);
	// Lista de usuarios obtenidos de API
	const [pendingUsers, setPendingUsers] = useState<User[]>([]);
	// Lista de usuarios a autorizar
	const [usersToAuthorize, setUsersToAuthorize] = useState<string[]>([]);
	// Loader para saber si se estan autorizando usuarios
	const [areUsersBeingAuthorized, setAreUsersBeingAuthorized] =
		useState<boolean>(false);
	const [selectAll, setSelectAll] = useState(false);

	const { userAccount } = useStore();

	useEffect(() => {
		const isOwner = async () => {
			if (!userAccount) {
				// Vuelvo a la pagina de inicio
				redirect("/");
				return;
			}
			const factoryOwner = await getFactoryOwner();
			if (toChecksumAddress(userAccount) !== factoryOwner?.address) {
				// Vuelvo a la pagina de inicio
				redirect("/");
				return;
			}
			setIsLoading(false);
		};

		isOwner();
		getUsers();
	}, [userAccount]);

	const getUsers = async () => {
		setIsLoading(true);
		const response = await getPendingUsers();

		if (response) {
			const pendingUsersList = response.users.pendingUsers;
			const users = pendingUsersList.map((address: string) => ({
				address,
				selected: false,
			}));
			setPendingUsers(users);
		} else {
			toast({
				title: "Error",
				description: "Hubo un error al cargar los usuarios pendientes",
			});
		}
		setIsLoading(false);
	};

	const handleOnSelectChange = (index: number) => {
		setPendingUsers((prevUsers) => {
			const updatedUsers = prevUsers.map((user, i) =>
				i === index ? { ...user, selected: !user.selected } : user
			);

			const selectedUsers = updatedUsers
				.filter((user) => user.selected)
				.map((user) => user.address);
			setUsersToAuthorize(selectedUsers);
			console.log(selectedUsers);

			return updatedUsers;
		});
		setSelectAll(false);
	};

	const handleSelectAllChange = () => {
		const newSelectAll = !selectAll;
		setSelectAll(newSelectAll);
		setPendingUsers((prevUsers) => {
			const updatedUsers = prevUsers.map((user) => ({
				...user,
				selected: newSelectAll,
			}));

			const selectedUsers = newSelectAll
				? updatedUsers.map((user) => user.address)
				: [];
			setUsersToAuthorize(selectedUsers);

			return updatedUsers;
		});
	};

	const handleAuthorize = async () => {
		if (usersToAuthorize.length === 0) {
			toast({
				title: "Error",
				description: "No se seleccionaron usuarios para autorizar",
			});
			return;
		}

		setAreUsersBeingAuthorized(true);
		await usersToAuthorize.forEach(async (address: string) => {
			try {
				await cfpFactoryContract.methods
					.authorize(address)
					.send({ from: userAccount, gas: 6721975, gasPrice: 1000000000 })
					.on("confirmation", (confirmationNumber, receipt) => {
						toast({
							title: "Usuario autorizado",
							description: `El usuario ${toChecksumAddress(
								address
							)} ha sido autorizado exitosamente.`,
						});

						setPendingUsers((prevUsers) => {
							const updatedUsers = prevUsers.map((user) =>
								user.address === address ? { ...user, selected: false } : user
							);
							return updatedUsers;
						});
					})
					.on("error", (error, receipt) => {
						toast({
							title: "Error al autorizar",
							description: `Hubo un error al autorizar al usuario ${address}`,
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
						description: `Error al autorizar al usuario ${toChecksumAddress(
							address
						)}: ${error.message}`,
					});
				}
			}
		});
		setAreUsersBeingAuthorized(false);
	};

	useEffect(() => {
		const anySelected = pendingUsers.some((user) => user.selected);
		setSelectAll(anySelected);
	}, [pendingUsers]);

	const redirect = (path: string) => {
		window.location.href = path;
	};

	return (
		<div className={"p-4 w-full rounded-md border"}>
			{isLoading || userAccount === "" ? (
				<LoaderCircle
					size={48}
					className="animate-spin flex items-center justify-center w-full"
				/>
			) : (
				<>
					{pendingUsers.length === 0 ? (
						<div className="relative">
							<div className="flex flex-row items-center justify-center">
								<h1 className="my-3 text-xl">No hay usuarios pendientes</h1>
								<Button
									variant="outline"
									className="absolute right-0 group"
									onClick={getUsers}>
									<RefreshCcw size={14} className="group-hover:animate-spin" />
								</Button>
							</div>
						</div>
					) : (
						<div className="relative">
							<div className="flex flex-row items-center justify-center">
								<h1 className="my-3 text-xl">
									Usuarios pendientes de autorizacion
								</h1>
								<Button
									variant="outline"
									className="absolute right-0 group"
									onClick={getUsers}>
									<RefreshCcw size={14} className="group-hover:animate-spin" />
								</Button>
							</div>
							<ScrollArea className="h-96 mt-2">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="text-center">
												<Checkbox
													checked={selectAll}
													onClick={handleSelectAllChange}
												/>
											</TableHead>
											<TableHead>Address del usuario</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{pendingUsers.map((user, index) => (
											<TableRow
												key={user.address}
												className={cn(
													user.selected && "bg-muted hover:bg-muted"
												)}
												onClick={() => handleOnSelectChange(index)}>
												<TableCell className="text-center">
													<Checkbox checked={user.selected} />
												</TableCell>
												<TableCell className="text-left">
													{user.address}
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
			<div className="flex justify-end mt-3">
				{areUsersBeingAuthorized ? (
					<LoaderCircle
						size={24}
						className="animate-spin flex items-center justify-center"
					/>
				) : (
					<div>
						{usersToAuthorize.length > 0 && (
							<Button
								onClick={handleAuthorize}
								disabled={usersToAuthorize.length === 0}>
								<Check size={16} className="mr-2" />
								Autorizar usuarios
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default AuthorizePage;

import { BookUser, KeyRoundIcon, User } from "lucide-react";
import { Button } from "./ui/button";
import { useStore } from "@/store/store";
import { useEffect, useState } from "react";
import { isUserAuthorized } from "@/services/apiService";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	ensRegistryContract,
	userFIFSRegistrarContract,
	reverseRegistrarContract,
	publicResolverContract,
	cfpFactoryContract,
} from "@/utils/web3Config";
import Web3 from "web3";
import { nameHash } from "@/utils";

const formSchema = z.object({
	name: z.string().nonempty("El nombre no puede estar vacío."),
});

type FormSchemaType = z.infer<typeof formSchema>;

const UserRegister = () => {
	const { userAccount, setUserAccount, clearSelectedCall } = useStore();
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [isNameEmpty, setIsNameEmpty] = useState(true);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		getValues,
	} = useForm<FormSchemaType>({
		resolver: zodResolver(formSchema),
	});

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

	useEffect(() => {
		if (window.ethereum) {
			window.ethereum.on("accountsChanged", handleAccountsChanged);
		}
		return () => {
			if (window.ethereum) {
				window.ethereum.removeListener(
					"accountsChanged",
					handleAccountsChanged
				);
			}
			// Reseteo el call
			clearSelectedCall();
		};
	}, []);

	const handleAccountsChanged = (accounts) => {
		clearSelectedCall();
		if (accounts.length > 0) {
			setUserAccount(accounts[0]);
		} else {
			setUserAccount("");
		}
	};

	const isUserRegistered = async (name: string) => {
		try {
			const node = nameHash(name + ".usuarios.cfp");
			const resolverAddress = await ensRegistryContract.methods
				.resolver(node)
				.call();

			return resolverAddress !== "0x0000000000000000000000000000000000000000";
		} catch (error) {
			console.log("Error al verificar si el usuario está registrado: ", error);
			return false;
		}
	};

	const handleNameRegister = async (data: FormSchemaType) => {
		const { name } = data;

		const isRegistered = await isUserRegistered(name);

		if (isRegistered) {
			toast("Error", {
				description: "El nombre ya está registrado.",
				id: "name-already-registered-error",
			});
			return;
		}
		if (name.includes(" ")) {
			toast("Error", {
				description: "El nombre no puede contener espacios.",
				id: "name-with-spaces-error",
			});
			return;
		}

		const nameWithDomain = name + ".usuarios.cfp";
		console.log("User account: ", userAccount);
		console.log("Name with domain: ", nameWithDomain);
		console.log("Name hash: ", nameHash(nameWithDomain));

		try {
			// Registra el nombre
			const registerReceipt = await userFIFSRegistrarContract.methods
				.register(Web3.utils.keccak256(name), userAccount)
				.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 });
			console.log("Register receipt: ", registerReceipt);

			// Configura la dirección en el resolver
			const setAddrReceipt = await publicResolverContract.methods
				.setAddr(nameHash(nameWithDomain), userAccount)
				.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 });
			console.log("Set Addr receipt: ", setAddrReceipt);

			// Configura el resolver para el nombre ENS
			const setResolverReceipt = await ensRegistryContract.methods
				.setResolver(
					nameHash(nameWithDomain),
					publicResolverContract.options.address
				)
				.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 });
			console.log("Set Resolver receipt: ", setResolverReceipt);

			// Configura el nombre inverso
			const setNameReceipt = await reverseRegistrarContract.methods
				.setName(name)
				.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 });
			console.log("Set Name receipt: ", setNameReceipt);

			// Verifica la dirección configurada en el resolver
			const resolvedAddress = await publicResolverContract.methods
				.addr(nameHash(nameWithDomain))
				.call();
			console.log("Resolved address: ", resolvedAddress);

			if (resolvedAddress.toLowerCase() === userAccount.toLowerCase()) {
				toast.success("Éxito", {
					description: `El nombre ${name}.usuarios.cfp ha sido registrado exitosamente.`,
					id: "name-registered-success",
				});
			} else {
				toast("Error", {
					description: `La dirección resuelta ${resolvedAddress} no coincide con la dirección del usuario ${userAccount}.`,
					id: "name-registered-error",
				});
			}
		} catch (error) {
			console.log(error);
			if (error.code === 4001 || error.code === 100) {
				toast("Error", {
					description: "El usuario ha cancelado la petición de firma.",
					id: "transaction-denied",
				});
			} else {
				toast("Error", {
					description: `Error desconocido: ${error.message}`,
					id: "unknown-error",
				});
			}
		}

		setDialogOpen(false);
		reset();
	};

	const handleNameVerification = async () => {
		const { name } = getValues();
		const isRegistered = await isUserRegistered(name);
		if (isRegistered) {
			toast("Verificación", {
				description: `El nombre ${name}.usuarios.cfp ya está registrado.`,
				id: "name-verification",
			});
		} else {
			toast("Verificación", {
				description: `El nombre ${name}.usuarios.cfp está disponible.`,
				id: "name-verification",
			});
		}
	};

	const handleRegister = async () => {
		try {
			await cfpFactoryContract.methods
				.register(userAccount)
				.send({ from: userAccount, gas: 6721975, gasPrice: 1000000000 })
				.on("confirmation", async () => {
					toast("Éxito en el registro!", {
						description: "Ahora solo espera hasta que te autoricen.",
						id: "register-success",
					});
				})
				.on("error", (error) => {
					toast("Error", {
						description: `Error al registrar al usuario: ${error.message}`,
						id: "register-error",
					});
				});
		} catch (error) {
			if (error.code === 4001) {
				toast("Denegado", {
					description: `El usuario ha cancelado la petición de firma.`,
					id: "transaction-denied",
				});
			} else {
				toast("Error", {
					description: `Se ha producido un error.`,
					id: "register-error",
				});
			}
		}
	};

	// Funcion que se ejecuta cuando se cambia el valor del input
	const handleInputChange = (event) => {
		setIsNameEmpty(event.target.value.trim() === "");
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild disabled={!userAccount}>
					<Button size="icon" variant="outline" disabled={!userAccount}>
						<KeyRoundIcon size={16} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem disabled={isAuthorized} onClick={handleRegister}>
						<div className="flex flex-row items-center space-x-2">
							<User size={16} />
							<span>Registrar usuario</span>
						</div>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setDialogOpen(true)}>
						<div className="flex flex-row items-center space-x-2">
							<BookUser size={16} />
							<span>Registrar nombre</span>
						</div>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog
				open={dialogOpen}
				onOpenChange={(isOpen) => {
					setDialogOpen(isOpen);
					if (!isOpen) {
						reset();
					}
				}}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Registrar Nombre</DialogTitle>
						<DialogDescription>
							Ingrese el nombre que desea registrar.
						</DialogDescription>
					</DialogHeader>
					<form
						onSubmit={handleSubmit(handleNameRegister)}
						className="space-y-4">
						<div className="flex items-center space-x-2">
							<Input
								type="text"
								{...register("name")}
								placeholder="Nombre de usuario"
								autoComplete="off"
								onChange={handleInputChange}
								required
							/>
							<Button
								onClick={handleNameVerification}
								type="button"
								disabled={isNameEmpty}>
								Verificar
							</Button>
						</div>
						{errors.name && (
							<p className="text-red-500">{errors.name.message}</p>
						)}
						<DialogFooter>
							<Button type="submit" variant="outline" disabled={isNameEmpty}>
								Registrar nombre
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default UserRegister;

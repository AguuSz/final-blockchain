import { BookUser, KeyRoundIcon, User } from "lucide-react";
import { Button } from "./ui/button";
import { useStore } from "@/store/store";
import { useEffect, useState } from "react";
import { isUserAuthorized } from "@/services/apiService";
import { toast } from "./ui/use-toast";
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
} from "@/utils/web3Config";
import Web3 from "web3";

const formSchema = z.object({
	name: z.string().nonempty("El nombre no puede estar vacío."),
});

type FormSchemaType = z.infer<typeof formSchema>;

const StatusBadge = () => {
	const { userAccount, contract } = useStore();
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

	const nameHash = (domain: string) => {
		let node =
			"0x0000000000000000000000000000000000000000000000000000000000000000";
		domain.toString();
		if (domain !== "") {
			const labels = domain.split(".");

			for (let i = labels.length - 1; i >= 0; i--) {
				const labelSha3 = Web3.utils.sha3(labels[i]);
				node = Web3.utils.sha3(node + labelSha3.slice(2), { encoding: "hex" });
			}
		}

		return node;
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

		// Checks basicos
		if (isRegistered) {
			toast({
				title: "Error",
				description: "El nombre ya está registrado.",
			});
			return;
		}
		if (name.includes(" ")) {
			toast({
				title: "Error",
				description: "El nombre no puede contener espacios.",
			});
			return;
		}

		const nameWithDomain = name + ".usuarios.cfp";

		try {
			// Registra el nombre
			await userFIFSRegistrarContract.methods
				.register(Web3.utils.keccak256(name), userAccount)
				.send({ from: userAccount, gas: "1000000", gasPrice: 1000000000 });

			await publicResolverContract.methods
				.setAddr(nameHash(nameWithDomain), userAccount)
				.send({ from: userAccount, gas: "1000000", gasPrice: 1000000000 });

			await ensRegistryContract.methods
				.setResolver(
					nameHash(nameWithDomain),
					publicResolverContract.options.address
				)
				.send({ from: userAccount, gas: "1000000", gasPrice: 1000000000 });

			await reverseRegistrarContract.methods
				.setName(name)
				.send({ from: userAccount, gas: "1000000", gasPrice: 1000000000 });

			// Muestra un mensaje de éxito y cierra el dialog
			toast({
				title: "Éxito",
				description: `El nombre ${name}.usuarios.cfp ha sido registrado exitosamente.`,
			});
		} catch (error) {
			if (error.code === 4001 || error.code === 100) {
				toast({
					title: "Error",
					description: "El usuario ha cancelado la petición de firma.",
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
			toast({
				title: "Verificación",
				description: `El nombre ${name}.usuarios.cfp ya está registrado.`,
			});
		} else {
			toast({
				title: "Verificación",
				description: `El nombre ${name}.usuarios.cfp está disponible.`,
			});
		}
	};

	const handleRegister = async () => {
		try {
			await contract.methods
				.register(userAccount)
				.send({ from: userAccount, gas: "1000000", gasPrice: 1000000000 })
				.on("confirmation", async () => {
					toast({
						title: "Éxito en el registro!",
						description: "Ahora solo espera hasta que te autoricen.",
					});
				})
				.on("error", (error) => {
					toast({
						title: "Error",
						description: `Error al registrar al usuario: ${error.message}`,
					});
				});
		} catch (error) {
			if (error.code === 4001) {
				toast({
					title: "Error",
					description: "El usuario ha cancelado la petición de firma.",
				});
			} else {
				toast({
					title: "Error",
					description: "Se ha producido un error.",
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

export default StatusBadge;

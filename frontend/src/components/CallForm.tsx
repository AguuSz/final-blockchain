import { format } from "date-fns";
import {
	Calendar as CalendarIcon,
	Check,
	Loader2,
	RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { TimePickerDemo } from "./time-picker-demo";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { generateRandomHash, nameHash } from "@/utils";
import { Input } from "./ui/input";
import { useState } from "react";
import { useStore } from "@/store/store";
import {
	callFIFSRegistrarContract,
	cfpFactoryContract,
	ensRegistryContract,
	publicResolverContract,
	reverseRegistrarContract,
} from "@/utils/web3Config";
import Web3 from "web3";

const validateDate = (date) => {
	const currentDate = new Date();
	const minDate = new Date(currentDate.getTime() + 2 * 60 * 1000); // current date + 2 minutes
	return date >= minDate;
};

const formSchema = z.object({
	callId: z
		.string({
			message: "Se requiere de un ID de llamada.",
		})
		.default(""),
	name: z
		.string({
			message: "El nombre no puede estar vacío.",
		})
		.default(""),
	description: z.string().default(""), // optional
	dateTime: z
		.date({ message: "Se requiere de una fecha de cierre." })
		.refine(validateDate, {
			message: "La fecha debe ser al menos 2 minutos en el futuro.",
		}),
});

type FormSchemaType = z.infer<typeof formSchema>;
const domain = ".llamados.cfp";

export function CallForm({ onClose }) {
	const [isLoading, setIsLoading] = useState(false);
	const { userAccount } = useStore();
	const form = useForm<FormSchemaType>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			callId: "",
			name: "",
			description: "",
			dateTime: undefined,
		},
	});

	async function onSubmit(data: FormSchemaType) {
		setIsLoading(true);

		try {
			const callIdHex = Web3.utils.keccak256(data.callId);
			const isRegistered = await isNameRegistered(data.name);

			if (isRegistered) {
				toast("Verificacion", {
					description: `El nombre ${data.name}${domain} ya se esta en uso.`,
					id: "name-verification",
				});
				setIsLoading(false);
				return;
			}

			const currentTime = Math.floor(Date.now() / 1000);
			const minimumDateTime = currentTime + 2 * 60;

			if (data.dateTime.getTime() / 1000 < minimumDateTime) {
				toast("Validacion de datos", {
					description:
						"La fecha de cierre debe ser al menos 2 minutos después del tiempo actual.",
					id: "date-validation",
				});
				setIsLoading(false);
				return;
			}

			await cfpFactoryContract.methods
				.create(callIdHex, data.dateTime.getTime() / 1000)
				.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 })
				.on("receipt", () => {
					toast("Llamado creado", {
						description: "El llamado ha sido creado.",
						id: "call-created",
					});
				})
				.on("error", () => {
					toast("Error", {
						description: "Hubo un error al crear el llamado.",
						id: "call-error",
					});
					onClose();
					return;
				});

			const cfp = await cfpFactoryContract.methods.calls(callIdHex).call();
			console.log(cfp);

			if (!cfp) {
				toast("Error", {
					description: "Hubo un error al registrar el llamado.",
					id: "call-registration-error",
				});
				setIsLoading(false);
				onClose();
				return;
			}

			await callFIFSRegistrarContract.methods
				.register(Web3.utils.keccak256(data.name), userAccount)
				.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 });

			const node = nameHash(data.name + domain);

			await publicResolverContract.methods
				.setAddr(nameHash(data.name + ".llamados.cfp"), cfp[1])
				.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 });

			await ensRegistryContract.methods
				.setResolver(node, publicResolverContract.options.address)
				.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 });

			await cfpFactoryContract.methods
				.setName(callIdHex, data.name)
				.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 });

			console.log("Registrando descripcion");
			if (data.description) {
				try {
					await reverseRegistrarContract.methods
						.setText(
							nameHash(cfp[1].toLowerCase().substring(2) + ".addr.reverse"),
							"description",
							data.description
						)
						.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 });
				} catch (error) {
					toast("Error con la descripcion", {
						description: "Hubo un error al guardar la descripcion.",
						id: "description-error",
					});
				}
			}

			setIsLoading(false);
			toast("Llamado creado", {
				description: "El llamado ha sido creado y configurado exitosamente.",
				id: "call-created-success",
			});
			onClose();
		} catch (error) {
			toast("Error", {
				description: "Hubo un error al crear el llamado.",
				id: "call-creation-error",
			});
			setIsLoading(false);
			return;
		}
	}

	const handleNameVerification = async (name) => {
		const isRegistered = await isNameRegistered(name);

		if (isRegistered) {
			toast("Verificacion", {
				description: `El nombre ${name}${domain} NO se encuentra disponible.`,
				id: "name-verification",
			});
		} else {
			toast("Verificacion", {
				description: `El nombre ${name}${domain} se encuentra disponible.`,
				id: "name-verification",
			});
		}
	};

	// Verifica si el nombre esta registrado fijandose si tiene owner o no
	const isNameRegistered = async (name: string) => {
		try {
			return (
				(await ensRegistryContract.methods
					.owner(nameHash(name + ".llamados.cfp"))
					.call({ from: userAccount })) !==
				"0x0000000000000000000000000000000000000000"
			);
		} catch (error) {
			console.error("Error verificarExistenciaNombre: ", error);
		}
	};

	return (
		<Form {...form}>
			<form
				className="flex flex-col gap-3 justify-center"
				onSubmit={form.handleSubmit(onSubmit)}>
				<FormField
					control={form.control}
					name="callId"
					render={({ field }) => (
						<FormItem className="flex flex-col mt-4">
							<FormLabel className="text-left">Call ID</FormLabel>
							<FormControl>
								<div className="flex">
									<Input
										{...field}
										type="text"
										disabled
										placeholder="Genere un valor"
										className="rounded-md p-2"
									/>
									<Button
										variant="outline"
										className="ml-2 group"
										type="button"
										onClick={() => field.onChange(generateRandomHash(64))}>
										<RefreshCcw
											size={14}
											className="mr-2 group-hover:animate-spin transform rotate-180"
										/>
										Generar
									</Button>
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem className="flex flex-col my-1">
							<FormLabel className="text-left">Nombre</FormLabel>
							<FormControl>
								<div className="flex">
									<Input
										{...field}
										type="text"
										placeholder="Nombre de la propuesta..."
										className="rounded-md p-2"
										autoComplete="off"
									/>
									<Button
										variant="outline"
										className="ml-2 group"
										type="button"
										onClick={() => handleNameVerification(field.value)}>
										<Check size={14} className="mr-2" />
										Verificar
									</Button>
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem className="flex flex-col my-1">
							<FormLabel className="text-left">Descripcion</FormLabel>
							<FormControl>
								<Input
									{...field}
									type="text"
									placeholder="Breve descripcion del llamado"
									className="rounded-md p-2"
									autoComplete="off"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="dateTime"
					render={({ field }) => (
						<FormItem className="flex flex-col">
							<FormLabel className="text-left">Fecha de cierre</FormLabel>
							<Popover>
								<FormControl>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"justify-start text-left font-normal",
												!field.value && "text-muted-foreground"
											)}>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{field.value ? (
												format(field.value, "PPP HH:mm:ss")
											) : (
												<span>Seleccione una fecha</span>
											)}
										</Button>
									</PopoverTrigger>
								</FormControl>
								<FormMessage />
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={field.value}
										onSelect={field.onChange}
										initialFocus
									/>
									<div className="p-3 border-t border-border">
										<TimePickerDemo
											setDate={field.onChange}
											date={field.value}
										/>
									</div>
								</PopoverContent>
							</Popover>
						</FormItem>
					)}
				/>
				<Button
					disabled={isLoading}
					variant="outline"
					className="w-36 self-center"
					type="submit">
					{isLoading ? (
						<Loader2 className="animate-spin" size={26} />
					) : (
						"Crear llamado"
					)}
				</Button>
			</form>
		</Form>
	);
}

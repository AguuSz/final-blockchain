import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, RefreshCcw } from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";
import { generateRandomHash } from "@/utils";
import { Input } from "./ui/input";
import { useState } from "react";
import { useStore } from "@/store/store";

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
	dateTime: z
		.date({ message: "Se requiere de una fecha de cierre." })
		.refine(validateDate, {
			message: "La fecha debe ser al menos 2 minutos en el futuro.",
		}),
});

type FormSchemaType = z.infer<typeof formSchema>;

export function CallForm({ onClose }) {
	const [isLoading, setIsLoading] = useState(false);
	const { contract, web3, userAccount } = useStore();
	const form = useForm<FormSchemaType>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			callId: "",
			dateTime: undefined,
		},
	});

	async function onSubmit(data: FormSchemaType) {
		setIsLoading(true);

		try {
			const callIdHex = web3.utils.keccak256(data.callId);

			const currentTime = Math.floor(Date.now() / 1000);
			const minimumDateTime = currentTime + 2 * 60;

			if (data.dateTime.getTime() / 1000 < minimumDateTime) {
				toast({
					title: "Error al crear el llamado",
					description:
						"La fecha de cierre debe ser al menos 2 minutos después del tiempo actual.",
				});
				setIsLoading(false);
				return;
			}

			await contract.methods
				.create(callIdHex, data.dateTime.getTime() / 1000)
				.send({ from: userAccount, gas: "1000000", gasPrice: 1000000000 })
				.on("receipt", () => {
					toast({
						title: "Llamado creado",
						description: "El llamado ha sido creado exitosamente.",
					});
					onClose();
				})
				.on("error", () => {
					toast({
						title: "Error al crear el llamado",
						description: "Hubo un error al crear el llamado.",
					});
				});
			setIsLoading(false);
		} catch (error) {
			console.log(error);
			if (error.code === 4001) {
				toast({
					title: "Error al crear el llamado",
					description: "Se ha cancelado la transacción.",
				});
			} else {
				toast({
					title: "Error al crear el llamado",
					description: "Hubo un error al crear el llamado.",
				});
			}
			setIsLoading(false);
			return;
		}
	}

	return (
		<Form {...form}>
			<form
				className="flex flex-col gap-3 justify-center"
				onSubmit={form.handleSubmit(onSubmit)}>
				<FormField
					control={form.control}
					name="callId"
					render={({ field }) => (
						<FormItem className="flex flex-col mt-2">
							<FormLabel className="text-left">Call ID</FormLabel>
							<FormControl>
								<div className="flex">
									<Input
										{...field}
										type="text"
										disabled
										placeholder="Genere un valor"
										className=" rounded-md p-2"
									/>
									<Button
										variant="outline"
										className="ml-2 group"
										type="button"
										onClick={() => field.onChange(generateRandomHash(64))}>
										<RefreshCcw
											size={14}
											className="mr-2 group-hover:animate-spin"
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
						"Submit"
					)}
				</Button>
			</form>
		</Form>
	);
}

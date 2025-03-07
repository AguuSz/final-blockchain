import { FileCheck, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import sha256 from "crypto-js/sha256";
import { useStore } from "@/store/store";
import { registerProposal, verifyProposal } from "@/services/apiService";
import { toast } from "sonner";

import { File } from "@/types";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cfpFactoryContract } from "@/utils/web3Config";

const Dropzone = () => {
	const [files, setFiles] = useState([]);
	const [hash, setHash] = useState("");
	const { call, userAccount } = useStore();

	// @ts-expect-error: It's because the acceptedFiles in Dropzone react doesnt have a particular type
	// and when used with File[] it throws an error
	const onDrop = useCallback((acceptedFiles) => {
		// When a file is dropped, calculate the hash of the file and set it in the state with the preffix 0x needed for the API
		const reader = new FileReader();
		reader.onload = function (event) {
			const fileContent = event?.target?.result;
			if (fileContent) {
				const fileHash = sha256(fileContent.toString()).toString();
				setHash("0x" + fileHash);
			}
		};
		reader.readAsText(acceptedFiles[0]);
		setFiles(acceptedFiles);
	}, []);

	const { getRootProps, isDragActive } = useDropzone({
		onDrop,
		disabled: files.length > 0,
		maxFiles: 1,
	});

	const handleRegisterClick = async () => {
		const callId = "0x" + call.callId;

		const currentTimeInSeconds = Math.floor(Date.now() / 1000);
		const timestamp = Number(call.timestamp);

		if (timestamp < currentTimeInSeconds) {
			toast("Error", {
				description: "La convocatoria se encuentra cerrada.",
				id: "call-closed",
			});
			return;
		}
		const response = await registerProposal(callId, hash);

		if (response?.statusCode === 201) {
			toast("Propuesta registrada", {
				description: "La propuesta ha sido registrada exitosamente.",
				id: "proposal-registered",
			});
		} else {
			toast("Error", {
				description: response?.message,
				id: "proposal-error",
			});
		}
	};

	const handleRegisterWithAccountClick = async () => {
		const callId = "0x" + call.callId;
		const isAlreadyRegistered = await verifyProposal(callId, hash);

		if (isAlreadyRegistered?.statusCode === 200) {
			toast("Error", {
				description: "La propuesta ya se encuentra registrada en este llamado.",
				id: "proposal-already-registered",
			});
			return;
		}

		const currentTimeInSeconds = Math.floor(Date.now() / 1000);
		const timestamp = Number(call.timestamp);

		if (timestamp < currentTimeInSeconds) {
			toast("Error", {
				description: "La convocatoria se encuentra cerrada.",
				id: "call-closed",
			});
			return;
		}

		try {
			await cfpFactoryContract.methods
				.registerProposal(callId, hash)
				.send({ from: userAccount, gas: 6721975, gasPrice: 20000000000 })
				.on("receipt", function () {
					toast("Propuesta registrada", {
						description: "La propuesta ha sido registrada exitosamente.",
						id: "proposal-registered",
					});
				});
		} catch (error) {
			if (error.code === 4001) {
				toast("Denegado", {
					description: "La transacción ha sido rechazada por el usuario.",
					id: "transaction-denied",
				});
			} else {
				toast("Error", {
					description: "Hubo un error al registrar la propuesta.",
					id: "proposal-error",
				});
			}
		}
	};

	const handleVerifyClick = async () => {
		const callId = "0x" + call.callId;
		const response = await verifyProposal(callId, hash);
		if (response?.statusCode === 200) {
			toast("Propuesta registrada", {
				description: "La propuesta ha sido registrada en este llamado.",
				id: "proposal-registered",
			});
		} else if (response?.statusCode === 404) {
			toast("Propuesta no registrada", {
				description: "La propuesta NO ha sido registrada para este llamado.",
				id: "proposal-not-registered",
			});
		} else {
			toast("Error", {
				description: response?.message,
				id: "proposal-error",
			});
		}
	};

	return (
		<>
			<div
				{...getRootProps()}
				className={cn(
					"h-80 border rounded-md dark:border-zinc-700 border-dashed mt-4 flex justify-center items-center",
					files.length === 0 && "hover:bg-muted/50"
				)}>
				{files.length === 0 ? (
					<div className="flex flex-col justify-between items-center gap-4">
						<Upload size={80} className="animate-pulse" />
						{isDragActive ? (
							// If the user is dragging a file over the dropzone
							<p>Suelta los archivos aqui...</p>
						) : (
							// If the user is not dragging a file over the dropzone
							<p>
								Arrastra archivos aqui o clickea para seleccionar un archivo.
							</p>
						)}
					</div>
				) : (
					<div className="flex flex-col justify-center items-center">
						<div className="relative">
							<FileCheck size={80} />
							<button
								type="button"
								className="rounded-full bg-white text-black absolute top-[-10px] right-[-10px] shadow-sm"
								onClick={() => setFiles([])}>
								<X size={24} className="p-1" />
							</button>
						</div>

						<div className="flex flex-col gap-2">
							{files.map((file: File) => (
								<div key={file.name}>
									<p>
										<strong>Nombre:</strong> {file.name}
									</p>
									<p>
										<strong>Hash:</strong> {hash}
									</p>
								</div>
							))}
							<div className="flex flex-row gap-5 justify-center items-center">
								<TooltipProvider delayDuration={100}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button variant="default" onClick={handleVerifyClick}>
												Verificar
											</Button>
										</TooltipTrigger>
										<TooltipContent side="bottom">
											<p>
												Verificara si la propuesta dada (tu archivo) esta
												registrado en este llamado o no.
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<TooltipProvider delayDuration={100}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button variant="secondary" onClick={handleRegisterClick}>
												Registrar (anonimo)
											</Button>
										</TooltipTrigger>
										<TooltipContent side="bottom">
											<p>
												Registrara la propuesta dada (tu archivo) en el llamado
												de forma anonima.
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<>
									{userAccount && (
										<TooltipProvider delayDuration={100}>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="secondary"
														onClick={handleRegisterWithAccountClick}>
														Registrar con tu cuenta
													</Button>
												</TooltipTrigger>
												<TooltipContent side="bottom">
													<p>
														Registrara la propuesta data (tu archivo) en el
														llamado.
													</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									)}
								</>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
};

export default Dropzone;

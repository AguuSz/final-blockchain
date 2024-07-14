import MetamaskConnect from "./MetamaskConnect";
import { ModeToggle } from "./mode-toggle";
import CopyButton from "./CopyButton";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useStore } from "@/store/store";
import { getFactoryOwner } from "@/services/apiService";
import { useEffect, useState } from "react";
import { toChecksumAddress } from "@/utils";
import StatusBadge from "./StatusBadge";

const Navbar = () => {
	const { userAccount } = useStore();
	const [isFactoryOwner, setIsFactoryOwner] = useState(false);

	useEffect(() => {
		async function fetchData() {
			const factoryOwner = await getFactoryOwner();
			if (userAccount !== "") {
				setIsFactoryOwner(
					factoryOwner?.address === toChecksumAddress(userAccount)
				);
			}
		}
		setIsFactoryOwner(false);
		fetchData();
	}, [userAccount]);

	return (
		<div className="flex flex-row items-center justify-between mb-3">
			<ModeToggle />
			<div className="flex flex-row justify-around gap-x-5">
				<Link to="/">
					<Button variant="link">Gestion de propuestas</Button>
				</Link>
				{isFactoryOwner ? (
					<Link to="/authorize">
						<Button variant="link">Pedidos de registro</Button>
					</Link>
				) : null}
			</div>
			<div className="flex flex-row justify-between items-center gap-2">
				<CopyButton />
				<StatusBadge />
				<MetamaskConnect />
			</div>
		</div>
	);
};

export default Navbar;

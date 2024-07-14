import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFoundPage = () => {
	return (
		<div className="flex flex-col justify-center items-center h-screen overflow-hidden">
			<h1 className="text-7xl">404 NOT FOUND</h1>
			<Link to="/" className="mt-4">
				<Button size="lg" variant="default" className="mt-4">
					Volver al inicio
				</Button>
			</Link>
		</div>
	);
};

export default NotFoundPage;

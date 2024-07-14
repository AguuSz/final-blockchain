import CallsTable from "@/components/CallsTable";
import Dropzone from "@/components/Dropzone";
import { useStore } from "@/store/store";

const Homepage = () => {
	const { call } = useStore();

	const showDropzone = call.callId !== "";

	return (
		<div className="flex flex-col">
			<CallsTable />
			{showDropzone ? <Dropzone /> : null}
		</div>
	);
};

export default Homepage;

import CallDetails from "@/components/CallDetails";
import CallsTable from "@/components/CallsTable";
import Dropzone from "@/components/Dropzone";
import { useStore } from "@/store/store";

const Homepage = () => {
	const { call } = useStore();

	const showDropzone = call.callId !== "";

	return (
		<div className="flex flex-col">
			<CallsTable />
			{showDropzone ? (
				<>
					<CallDetails call={call} />
					<Dropzone />
				</>
			) : null}
		</div>
	);
};

export default Homepage;

import "./App.css";
import Navbar from "./components/Navbar";
import { ThemeProvider } from "./components/theme-provider";
import AuthorizePage from "./views/AuthorizePage";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Homepage from "./views/HomePage";
import NotFoundPage from "./views/NotFoundPage";

const router = createBrowserRouter([
	{
		path: "/",
		element: (
			<>
				<Navbar />
				<Homepage />
			</>
		),
		errorElement: <NotFoundPage />,
	},
	{
		path: "/authorize",
		element: (
			<>
				<Navbar />
				<AuthorizePage />
			</>
		),
	},
]);

function App() {
	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<RouterProvider router={router} />
		</ThemeProvider>
	);
}

export default App;

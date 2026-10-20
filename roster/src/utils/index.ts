import { toast } from "frappe-ui";

export { default as dayjs } from "./dayjs";

export const raiseToast = (type: "success" | "error", message: string) => {
	return toast[type](type === "success" ? "Success" : "Error", {
		description: message || "Failed to perform action. Please try again later.",
		position: "bottom-right",
		duration: type === "error" ? 7000 : 4000,
	});
};

export const goTo = (path: string) => {
	window.location.href = path;
};

import { toast } from "frappe-ui";

export { default as dayjs } from "./dayjs";

export const raiseToast = (type: "success" | "error", message: string) => {
	if (type === "success")
		return toast.success("Success", {
			description: message,
			position: "bottom-right",
		});

	const div = document.createElement("div");
	div.innerHTML = message;
	// strip html tags
	const text =
		div.textContent || div.innerText || "Failed to perform action. Please try again later.";
	toast.error("Error", {
		description: text,
		position: "bottom-right",
		duration: 7000,
	});
};

export const goTo = (path: string) => {
	window.location.href = path;
};

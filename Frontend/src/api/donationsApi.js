import { http } from "./httpClient";

// data: { organization_id, type: "books"|"clothes"|"food"|"money", amount?, quantity?, description }
export const createDonation = (data) => http.post("/donations", data);

export const getMyDonations = () => http.get("/donations/me");

// Organization: donations it received. status: "" | "pending" | "verified" | "rejected"
export const getReceivedDonations = (status = "") => http.get("/donations/received", { params: { status } });

// status: "verified" | "rejected"
export const decideDonation = (id, status, note = "") => http.patch(`/donations/${id}`, { status, note });

import { http } from "./httpClient";
export const createDonation = (data) => http.post("/donations", data);

export const getMyDonations = () => http.get("/donations/me");

export const getReceivedDonations = (status = "") => http.get("/donations/received", { params: { status } });

export const decideDonation = (id, status, note = "") => http.patch(`/donations/${id}`, { status, note });

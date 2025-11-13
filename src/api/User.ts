import axiosClient from "./config";

export function getCompanyUserProfile(id: number, companyId: number) {
    return axiosClient.get(`api/v1/companies/${companyId}/members/${id}`);
}
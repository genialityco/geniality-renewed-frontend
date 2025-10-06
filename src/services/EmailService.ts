import api from "./api";

export const sendPasswordResetEmail = async (
  email: string,) => {
  try {
    const response = await api.get(
      `/organization-users/recovery-password/${email}`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

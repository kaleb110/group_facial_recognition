export const handleApiError = (error: any): Error => {
  console.error("API Error:", error);

  if (error.response) {
    // Server responded with a status code outside the 2xx range
    return new Error(error.response.data?.message || "Server error occurred");
  } else if (error.request) {
    // Request was made but no response received
    return new Error("Network error. Please check your internet connection.");
  } else {
    // Something else happened while setting up the request
    return new Error(error.message || "An unexpected error occurred");
  }
};

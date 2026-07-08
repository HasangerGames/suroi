export const handleError = ({ error }) => {
  console.error("SvelteKit error:", error);
  return {
    message: "text" in error ? error.text : "Internal Error"
  };
};

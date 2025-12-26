  
const openPage = (url: string): void => {
  window.open(url, "_blank");
}

document.getElementById("my-stats")?.addEventListener("click", () => {
  openPage("/stats/");
});

  
  
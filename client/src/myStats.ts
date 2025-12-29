  
export function ToMyStats():void{
document.getElementById("my-stats")?.addEventListener("click", () => {
  window.open("/stats/", "_blank");
});
}
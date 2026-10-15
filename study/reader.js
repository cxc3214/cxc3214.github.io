const select = document.getElementById("resource-select");
select.addEventListener("change", (event) => {
  window.location.assign(event.target.value);
});

const frame = document.getElementById("document-frame");
function fitDocument() {
  const document = frame.contentDocument;
  if (!document || document.getElementById("study-reader-fit")) return;
  document.documentElement.dataset.studyDocument = select.value.split("/")[2];
  const stylesheet = document.createElement("link");
  stylesheet.id = "study-reader-fit";
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/study/embedded.css";
  document.head.append(stylesheet);
}
frame.addEventListener("load", fitDocument);
if (frame.contentDocument?.readyState === "complete") fitDocument();

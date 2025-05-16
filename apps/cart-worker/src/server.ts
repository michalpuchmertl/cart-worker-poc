import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

const app = express();
const port = 8081;

const corsOptions = {
  origin: "http://localhost:3000",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

const workerScriptPath = path.join(__dirname, "cart-worker.js");

app.get("/cart-worker.js", (req, res) => {
  if (fs.existsSync(workerScriptPath)) {
    res.setHeader("Content-Type", "application/javascript");
    res.sendFile(workerScriptPath);
  } else {
    console.error(
      `[CartWorkerServer] Compiled worker script not found at ${workerScriptPath}`
    );
    res.status(404).send("Worker script not found.");
  }
});

app.listen(port, () => {
  console.log(
    `[CartWorkerServer] Server listening on http://localhost:${port}, serving worker from ${workerScriptPath}`
  );
});

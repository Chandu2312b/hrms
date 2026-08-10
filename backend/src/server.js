// Local development entry point. On Vercel, api/index.js imports src/app.js
// directly instead — there's no app.listen() there since Vercel manages the
// HTTP server itself for serverless functions.

const app = require("./app");

const DEFAULT_PORT = Number(process.env.PORT || 4000);

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`HRMS API running locally on port ${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.warn(`Port ${port} is busy. Trying ${port + 1}...`);
      startServer(port + 1);
      return;
    }

    throw error;
  });
}

startServer(DEFAULT_PORT);

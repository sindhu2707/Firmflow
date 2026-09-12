import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./database/connect";

async function startServer() {
  await connectDB();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

startServer();
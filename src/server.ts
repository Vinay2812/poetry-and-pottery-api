import App from "./app";

try {
  const app = new App();
  app.start();
} catch (error) {
  console.error("❌ Failed to start the server", error);
}

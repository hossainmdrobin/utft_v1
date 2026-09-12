import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { connectDB } from "@/integrations/mongodb/connection";
import { createMonthlyInstallments } from "./createMonthlyInstallments";

const monthlyInstallmentJob = "create-monthly-installments";
const mongoAddress = process.env.MONGODB_URI || "mongodb://localhost:27017/utft";

const agenda = new Agenda({
  name: "utft-monthly-installments",
  backend: new MongoBackend({
    address: mongoAddress,
    collection: "agendaJobs",
  }),
  processEvery: "1 minute",
  defaultConcurrency: 1,
  maxConcurrency: 1,
});

agenda.define(monthlyInstallmentJob, async () => {
  await connectDB();
  const result = await createMonthlyInstallments();
  console.info("Monthly installment job completed:", result);
});

agenda.on("error", (error) => {
  console.error("Agenda scheduler error:", error);
});

export async function startAgenda(): Promise<void> {
  await agenda.start();
  await agenda.every("0 0 * * *", monthlyInstallmentJob, undefined, {
    timezone: "Asia/Dhaka",
    skipImmediate: true,
  });
  console.info("Agenda monthly installment scheduler started");
}

async function stopAgenda(signal: string) {
  console.info(`Stopping Agenda scheduler after ${signal}`);
  await agenda.stop();
  process.exit(0);
}

process.once("SIGINT", () => void stopAgenda("SIGINT"));
process.once("SIGTERM", () => void stopAgenda("SIGTERM"));

void startAgenda().catch((error) => {
  console.error("Failed to start Agenda scheduler:", error);
  process.exitCode = 1;
});
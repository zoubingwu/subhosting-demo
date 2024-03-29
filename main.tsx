/** @jsx jsx */
import { Hono } from "$hono/mod.ts";
import { jsx } from "$hono/jsx/index.ts";
import { serveStatic } from "$hono/middleware.ts";
import App from "./App.tsx";
import Client from "./subhosting.ts";

const shc = new Client();
const app = new Hono();
const db = await Deno.openKv();

app.get("/", async (c) => {
  const projects = await (await shc.listProjects()).json();
  return c.html(<App projects={projects} />);
});

// Poll deployment data from Subhosting API
app.get("/deployments", async (c) => {
  const projectId = c.req.query("projectId") || "";
  const dr = await shc.listDeployments(projectId, {
    order: "desc",
  });
  const deployments = await dr.json();

  if (deployments.length) {
    const res = await db.get([projectId, deployments[0].id, "code"]);
    deployments[0].code = res.value;
  }

  return c.json(deployments);
});

app.get("/build_logs/:deploymentId", async (c) => {
  const id = c.req.param("deploymentId");
  const logs = await shc.listBuildLogs(id);
  return c.text(await logs.text());
});

app.get("/app_logs/:deploymentId", async (c) => {
  const id = c.req.param("deploymentId");
  const logs = await shc.listAppLogs(id, { until: new Date().toISOString() });
  return c.text(await logs.text());
});

// Create deployment for the given project with the Subhosting API
app.post("/deployment", async (c) => {
  const body = await c.req.json();

  const dr = await shc.createDeployment(body.projectId, {
    entryPointUrl: "main.ts",
    assets: {
      "main.ts": {
        kind: "file",
        content: body.code,
        encoding: "utf-8",
      },
    },
    envVars: {
      DB_HOST: Deno.env.get("DB_HOST"),
      DB_USER: Deno.env.get("DB_USER"),
      DB_PASS: Deno.env.get("DB_PASS"),
    },
  });

  const deploymentResponse = await dr.json();
  console.log("deploymentResponse: ", deploymentResponse);

  await db.set([body.projectId, deploymentResponse.id, "code"], body.code);

  return c.json(deploymentResponse);
});

// Create project for the given org with the Subhosting API
app.post("/project", async (c) => {
  const body = await c.req.parseBody();

  const pr = await shc.createProject(body.name as string);
  const projectResponse = await pr.json();
  console.log(projectResponse);

  return c.redirect("/");
});

app.use("/*", serveStatic({ root: "./static" }));

Deno.serve(app.fetch);

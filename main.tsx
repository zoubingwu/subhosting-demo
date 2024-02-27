/** @jsx jsx */
import { Hono } from "$hono/mod.ts";
import { jsx } from "$hono/jsx/index.ts";
import { serveStatic } from "$hono/middleware.ts";
import App from "./App.tsx";
import Client from "./subhosting.ts";
// import { Client as Mysql, TLSConfig, TLSMode } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

// const tlsConfig: TLSConfig = {
//   mode: TLSMode.VERIFY_IDENTITY,
//   caCerts: [await Deno.readTextFile("/etc/ssl/cert.pem")],
// };

// const client = await new Mysql().connect({
//   hostname: Deno.env.get("DB_HOST"),
//   username: Deno.env.get("DB_USER"),
//   password: Deno.env.get("DB_PASS"),
//   db: "game",
//   tls: tlsConfig,
// });

// const res = await client.query("SELECT `name` FROM `games` ORDER BY `estimated_owners` DESC LIMIT 1;");
// console.log("res: ", res);

// import { Client, TLSConfig, TLSMode } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

// const tlsConfig: TLSConfig = {
//   mode: TLSMode.VERIFY_IDENTITY,
//   caCerts: Deno.env.get("CA_CERT"),
// };

// const client = await new Mysql().connect({
//   hostname: Deno.env.get("DB_HOST"),
//   username: Deno.env.get("DB_USER"),
//   password: Deno.env.get("DB_PASS"),
//   db: "game",
//   tls: tlsConfig,
// });

// Deno.serve(async () => {
//   const res = await client.query("SELECT `name` FROM `games` ORDER BY `estimated_owners` DESC LIMIT 1;");
//   return new Response(`Hello from subhosting, the most popular game is ${res[0].name}`);
// });

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
      CA_CERT: await Deno.readTextFile("/etc/ssl/cert.pem"),
    },
  });

  const deploymentResponse = await dr.json();

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

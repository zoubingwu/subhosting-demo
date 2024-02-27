/** @jsx jsx */
import { jsx } from "$hono/jsx/index.ts";

// deno-lint-ignore no-explicit-any
export default function App({ projects }: { projects?: any }) {
  // deno-lint-ignore no-explicit-any
  const projList = projects?.map((p: any) => {
    return <option value={p.id}>{p.name}</option>;
  });

  return (
    <html>
      <head>
        <title>Basic Browser IDE (Deno Subhosting)</title>
        <link rel="stylesheet" href="/styles.css" />
        <script src="/ace/ace.js"></script>
        <script src="/app.js"></script>
      </head>
      <body>
        <nav>
          <h1>Basic Browser IDE</h1>
          <div id="project-selector">
            <select id="project-list">{projList}</select>
            <form action="/project" method="POST">
              <button type="submit" id="new-project">
                Generate New Project
              </button>
            </form>
          </div>
          <button id="deploy-button">Save & Deploy</button>
        </nav>
        <main>
          <div style="position:relative;height:100%;width:100%;">
            <div id="editor-container">
              <div id="editor"></div>
            </div>
            <div id="deployments-container">
              <iframe src="" frameborder="0" id="preview" height="50%"></iframe>
              <div>
                <h3>Deployment History</h3>
                <div id="deployments"></div>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

let editor; // window scope reference to the Ace editor

function setDeployments(deployments) {
  const $t = document.getElementById("deployments");
  const $iframe = document.getElementById("preview");

  if (deployments.length && deployments?.[0].domains?.[0]) {
    $iframe.setAttribute('src', "https://" + deployments?.[0].domains?.[0]);
  }

  if (!deployments || deployments.length < 1) {
    $t.innerHTML = "<p>No deployments for this project.</p>";
  } else {
    let html = "";
    deployments.forEach((deployment) => {
      html += `<div class="deployment-line">
        <a href="https://${deployment.domains?.[0]}" target="_blank">
          ${deployment.domains?.[0] || "URL pending..."}
        </a>
        <a href="/app_logs/${deployment.id}" target="_blank" class="logs-link">AppLogs</a>
        <a href="/build_logs/${deployment.id}" target="_blank" class="logs-link">BuildLogs</a>
        <span class="timestamp">
          <span class="status ${deployment.status}">${deployment.status}</span>
          ${deployment.updatedAt}
        </span>
      </div>`;
    });
    $t.innerHTML = html;
  }
}

function getProjectId() {
  const $project = document.getElementById("project-list");
  return $project.value;
}

async function pollData() {
  const projectId = getProjectId();

  try {
    // Get list of all deployments
    const dr = await fetch(`/deployments?projectId=${projectId}`);
    const deployments = await dr.json();
    setDeployments(deployments);
  } catch (e) {
    console.error(e);
  }
}

async function saveAndDeploy(e) {
  const $t = document.getElementById("deployments");
  const currentHtml = $t.innerHTML;
  $t.innerHTML = "<p>Creating deployment...</p>" + currentHtml;

  const projectId = getProjectId();

  const dr = await fetch(`/deployment`, {
    method: "POST",
    body: JSON.stringify({
      projectId,
      code: editor.getValue(),
    }),
  });
  const deployResult = await dr.json();
  console.log('deployResult: ', deployResult);
}

window.onload = async function () {
  // Initialize editor
  editor = ace.edit("editor");
  editor.session.setTabSize(2);
  editor.setTheme("ace/theme/chrome");
  editor.session.setMode("ace/mode/typescript");

  const projectId = getProjectId();
  const dr = await fetch(`/deployments?projectId=${projectId}`);
  const deployments = await dr.json();

  editor.setValue(
    deployments?.[0]?.code ||
    `Deno.serve(() => {
  console.log("Responding hello...");
  return new Response("Hello, subhosting!");
});`,
    -1,
  );

  // Attach event handler for deploy button
  document.getElementById("deploy-button").addEventListener(
    "click",
    saveAndDeploy,
  );

  // Immediately refresh deployments when new project selected
  document.getElementById("project-list").addEventListener("change", pollData);

  // Poll for deployment and log data for the selected project
  setInterval(pollData, 5000);
  pollData();
};

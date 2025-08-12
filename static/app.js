/**
 * Main JavaScript file for the Temporal Workflow Monitor
 * Handles WebSocket communication and UI updates for workflow status tracking
 */


// DOM elements
const form = document.getElementById("promptSubmitForm");

// Track workflows started from this page session
const trackedWorkflows = new Map();

// Initialize WebSocket connection
const socket = io();

// WebSocket connection handler
socket.on("connect", function () {
  console.log("WebSocket connected!");
  // Start monitoring tracked workflows every 2 seconds
  setInterval(updateTrackedWorkflowStatuses, 2000);
});

/**
 * Send a question prompt to the server
 * @param {string} prompt - The question to send
 * @param {string} model - The selected model
 */
function sendData(prompt, model) {
  socket.emit("prompt", { prompt, model });
}

/**
 * Request status updates for all tracked workflows
 */
function updateTrackedWorkflowStatuses() {
  if (trackedWorkflows.size > 0) {
    socket.emit("get_workflow_statuses", Array.from(trackedWorkflows.keys()));
  }
}

/**
 * Get CSS class name for a workflow status
 * @param {string} status - The workflow status
 * @returns {string} CSS class name
 */
function getStatusCssClass(status) {
  const statusMap = {
    RUNNING: "capsule-running",
    AWAITING_WORKER: "capsule-awaiting-worker",
    RUNNING_ACTIVITIES: "capsule-running-activities",
    COMPLETED: "capsule-completed",
    FAILED: "capsule-failed",
    CANCELLED: "capsule-cancelled",
    TERMINATED: "capsule-terminated",
    TIMED_OUT: "capsule-timed-out",
  };
  return statusMap[status] || "capsule-unknown";
}

/**
 * Update the visual styling of a workflow capsule based on its status
 * @param {string} capsuleId - The ID of the capsule element
 * @param {string} status - The workflow status
 */
function updateCapsuleStyle(capsuleId, status) {
  const capsule = document.getElementById(capsuleId);
  if (!capsule) return;

  // Remove all existing status classes
  const statusClasses = [
    "capsule-running",
    "capsule-awaiting-worker",
    "capsule-running-activities",
    "capsule-completed",
    "capsule-failed",
    "capsule-cancelled",
    "capsule-terminated",
    "capsule-timed-out",
    "capsule-unknown",
  ];
  capsule.classList.remove(...statusClasses);

  // Add base workflow-capsule class and status-specific class
  // Keep the capsule class for counter-rotation
  capsule.classList.add("workflow-capsule", getStatusCssClass(status));
}

/**
 * Create a button that opens the Temporal UI for a workflow
 * @param {Object} msg - Message containing workflow ID and run ID
 * @returns {HTMLButtonElement} The created button
 */
function createButton(msg) {
  const button = document.createElement("button");
  button.textContent = "View Temporal Workflow";
  button.onclick = () => {
    window.open(
      `http://localhost:8233/namespaces/default/workflows/${msg.id}/${msg.run_id}/history`,
      "_blank"
    );
  };
  return button;
}

/**
 * Get color and emoji for a workflow status
 * @param {string} status - The workflow status
 * @returns {Object} Object with color and emoji properties
 */
function getStatusColors(status) {
  switch (status) {
    case "RUNNING":
    case "RUNNING_ACTIVITIES":
      return {
        color: "#00ff88",
        emoji: status === "RUNNING" ? "⚡" : "🔄",
      };
    case "AWAITING_WORKER":
      return { color: "#ffa726", emoji: "⏳" };
    case "COMPLETED":
      return { color: "#66b3ff", emoji: "✅" };
    case "FAILED":
      return { color: "#ff4757", emoji: "❌" };
    case "CANCELLED":
      return { color: "#8e44ad", emoji: "🚫" };
    case "TERMINATED":
      return { color: "#e74c3c", emoji: "🛑" };
    case "TIMED_OUT":
      return { color: "#ff6b6b", emoji: "⏰" };
    default:
      return { color: "#95a5a6", emoji: "❓" };
  }
}

/**
 * Create a status element with link to Temporal UI
 * @param {string} workflowId - The workflow ID
 * @param {string} runId - The run ID
 * @param {string} status - The workflow status
 * @returns {HTMLElement} The created status element
 */
function createStatusElement(workflowId, runId, status = "RUNNING") {
  const colors = getStatusColors(status);
  const statusText = status.replace("_", " ");

  const statusLink = document.createElement("a");
  statusLink.href = `http://localhost:8233/namespaces/default/workflows/${workflowId}/${runId}/history`;
  statusLink.target = "_blank";
  statusLink.className = "status-link";
  statusLink.style.color = colors.color;
  statusLink.style.borderColor = colors.color;
  statusLink.textContent = `${colors.emoji} ${statusText}`;

  // Add hover effect for color change
  statusLink.onmouseover = function () {
    this.style.backgroundColor = colors.color + "20";
  };
  statusLink.onmouseout = function () {
    this.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
  };

  return statusLink;
}

/**
 * Create a new orbit element (satellite) for a workflow
 * @param {string} workflowId - The workflow ID
 * @param {string} runId - The run ID
 * @param {string} prompt - The original question prompt
 * @param {string} model - The selected model
 * @returns {HTMLElement} The created satellite element
 */
function createOrbitElement(workflowId, runId, prompt, model) {
  const newSatellite = document.createElement("div");
  newSatellite.className = "satellite invisible rotate-orbit rotate-time-2";

  const modelDisplayName = model === "smolm3-3b" ? "SMOL" : "GPT";
  const modelClass = model === "smolm3-3b" ? "model-smol" : "model-gpt";

  const newCapsule = document.createElement("div");
  newCapsule.className = `capsule ${modelClass}`;
  newCapsule.innerHTML = `
    <h3>${prompt}</h3>
    <div class="status-row" id="status-${runId}">
      <div class="workflow-status">
        ${createStatusElement(workflowId, runId, "AWAITING_WORKER").outerHTML}
      </div>
      <div class="model-indicator">${modelDisplayName}</div>
    </div>
  `;
  newCapsule.id = runId;

  newSatellite.appendChild(newCapsule);
  return newSatellite;
}

// Form submission handler
form.addEventListener("submit", function (event) {
  event.preventDefault();
  const formData = new FormData(form);
  const question = formData.get("question");
  const model = formData.get("model");
  
  sendData(question, model);
  
  // Reset only the question field, keep the model selection
  form.querySelector('input[name="question"]').value = "";
});

// WebSocket event handlers

/**
 * Handle workflow acceptance from server
 */
socket.on("accepted", function (msg) {
  console.log("Workflow accepted:", msg);

  // Track this workflow
  trackedWorkflows.set(msg.id, {
    runId: msg.run_id,
    status: "AWAITING_WORKER",
    capsuleId: msg.run_id,
    model: msg.model,
  });

  // Create and add new satellite to the orbit
  const newSatellite = createOrbitElement(msg.id, msg.run_id, msg.prompt, msg.model);
  document.getElementById("orbitRoot").appendChild(newSatellite);

  // Apply initial styling with a slight delay for smooth animation
  setTimeout(() => updateCapsuleStyle(msg.run_id, "AWAITING_WORKER"), 100);
});

/**
 * Handle workflow completion response from server
 */
socket.on("response", function (msg) {
  console.log("Workflow completed:", msg);
  const question = document.getElementById(msg.run_id);
  
  // Truncate response for display in capsule
  const maxLength = 100;
  const truncatedResponse = msg.response.length > maxLength 
    ? msg.response.substring(0, maxLength) + "..." 
    : msg.response;
  
  // Add response element
  const responseElement = document.createElement("p");
  responseElement.className = "response-text";
  responseElement.innerHTML = truncatedResponse;
  responseElement.title = msg.response; // Full response on hover tooltip
  
  question.appendChild(responseElement);
  
  // Add hover handlers to the capsule to show/hide full response
  if (msg.response.length > maxLength) {
    const capsule = question;
    capsule.addEventListener('mouseenter', function() {
      const responseText = this.querySelector('.response-text');
      if (responseText) {
        responseText.innerHTML = msg.response;
      }
    });
    
    capsule.addEventListener('mouseleave', function() {
      const responseText = this.querySelector('.response-text');
      if (responseText) {
        responseText.innerHTML = truncatedResponse;
      }
    });
  }
  
  const button = createButton(msg);
  question.classList.add("animate__animated", "animate__bounceOutLeft");
});

/**
 * Handle workflow status updates from server
 */
socket.on("workflow_statuses", function (data) {
  data.workflows.forEach((workflow) => {
    if (trackedWorkflows.has(workflow.id)) {
      const trackedWorkflow = trackedWorkflows.get(workflow.id);

      // Update status if it changed
      if (trackedWorkflow.status !== workflow.status) {
        trackedWorkflow.status = workflow.status;

        // Update the status element in the capsule
        const statusContainer = document.getElementById(
          `status-${trackedWorkflow.runId}`
        );
        if (statusContainer) {
          const workflowStatusDiv = statusContainer.querySelector('.workflow-status');
          if (workflowStatusDiv) {
            workflowStatusDiv.innerHTML = createStatusElement(
              workflow.id,
              trackedWorkflow.runId,
              workflow.status
            ).outerHTML;
          }
        }

        // Update capsule styling to match new status
        updateCapsuleStyle(trackedWorkflow.runId, workflow.status);

        // Remove completed workflows from tracking
        const completedStatuses = ['COMPLETED', 'FAILED', 'CANCELLED', 'TERMINATED', 'TIMED_OUT'];
        if (completedStatuses.includes(workflow.status)) {
          console.log(`Removing completed workflow from tracking: ${workflow.id} (${workflow.status})`);
          trackedWorkflows.delete(workflow.id);
        }
      }
    }
  });
});

/**
 * Handle workflow status errors from server
 */
socket.on("workflow_statuses_error", function (data) {
  console.error("Workflow statuses error:", data);
});

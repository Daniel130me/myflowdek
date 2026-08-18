import type { AiRequest, AiRequestType } from "./schemas";

const SYSTEM_PROMPTS: Record<AiRequestType, string> = {
  summarize: "You are a senior project management consultant. Summarize overall health, accomplishments, active work, risks, and next steps in under 200 words.",
  suggest_assignee: "You are a team workload balancer. Recommend one assignee per task using role fit, workload, and complexity, with one sentence of reasoning.",
  risk_analysis: "You are a project risk analyst. Identify deadline, resource, and dependency risks; assign an overall risk level and give concise mitigations.",
  smart_breakdown: "You are a project planning expert. Break the task into 3-6 independently verifiable subtasks with a name, estimated days, and deliverable.",
  chat: "You are FlowDeck AI, a concise project-management assistant. Use the supplied project context, be actionable, and redirect unrelated questions.",
};

type TaskContext = {
  name?: unknown;
  status?: unknown;
  priority?: unknown;
  progress?: unknown;
  dueDate?: unknown;
  assignee?: unknown;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function tasks(value: unknown): TaskContext[] {
  return Array.isArray(value) ? (value as TaskContext[]) : [];
}

function formatTasks(value: unknown) {
  return tasks(value)
    .map((task, index) => {
      const details = [
        text(task.status) && `Status: ${text(task.status)}`,
        text(task.priority) && `Priority: ${text(task.priority)}`,
        typeof task.progress === "number" && `Progress: ${task.progress}%`,
        text(task.dueDate) && `Due: ${text(task.dueDate)}`,
        text(task.assignee) && `Assignee: ${text(task.assignee)}`,
      ].filter(Boolean);

      return `${index + 1}. ${text(task.name, "Untitled task")}${details.length ? ` | ${details.join(" | ")}` : ""}`;
    })
    .join("\n");
}

export function buildAiMessages(request: AiRequest) {
  const { type, context } = request;
  let userPrompt: string;

  switch (type) {
    case "summarize":
    case "risk_analysis":
      userPrompt = `Project: "${text(context.projectName, "Untitled project")}"\n\nTasks:\n${formatTasks(context.tasks)}`;
      break;
    case "suggest_assignee":
      userPrompt = `Unassigned tasks:\n${formatTasks(context.unassignedTasks)}\n\nTeam members:\n${JSON.stringify(context.teamMembers ?? [], null, 2)}`;
      break;
    case "smart_breakdown":
      userPrompt = `Task: "${text(context.taskName, "Untitled task")}"\nDescription: ${text(context.taskDescription, "No description provided.")}`;
      break;
    case "chat": {
      const project = context.projectContext as Record<string, unknown> | undefined;
      userPrompt = `User message: ${text(context.message)}${project ? `\n\nProject: "${text(project.projectName, "Untitled project")}"\nTasks:\n${formatTasks(project.tasks)}` : ""}`;
      break;
    }
  }

  return {
    systemPrompt: SYSTEM_PROMPTS[type],
    userPrompt,
  };
}

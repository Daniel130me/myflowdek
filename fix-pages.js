/* eslint-disable */
const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBADF') filelist.push(dirFile);
    }
  });
  return filelist;
}

const files = walkSync('src/app/(product)');

for (const file of files) {
  if (!file.endsWith('.tsx')) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/onMove=\{\(id, status\) => state\.moveStatus\(id, status\)\}/g, "onMove={(id, status) => state.moveStatus(state.currentProjectId!, id, status)}");
  content = content.replace(/onToggleComplete=\{state\.toggleComplete\}/g, "onToggleComplete={(id) => state.toggleComplete(state.currentProjectId!, id)}");
  content = content.replace(/onReorder=\{\(taskId, toIndex\) => state\.reorderTask\(taskId, toIndex\)\}/g, "onReorder={(taskId, toIndex) => state.reorderTask(state.currentProjectId!, taskId, toIndex)}");
  content = content.replace(/onUpdateTask=\{state\.updateTask\}/g, "onUpdateTask={(id, patch) => state.updateTask(state.currentProjectId!, id, patch)}");
  content = content.replace(/onRemoveTask=\{state\.removeTask\}/g, "onRemoveTask={(id) => state.removeTask(state.currentProjectId!, id)}");
  content = content.replace(/onToggleTaskTag=\{state\.toggleTaskTag\}/g, "onToggleTaskTag={(taskId, tagId) => state.toggleTaskTag(state.currentProjectId!, taskId, tagId)}");
  content = content.replace(/onPromoteSubtask=\{state\.promoteSubtask\}/g, "onPromoteSubtask={(id) => state.promoteSubtask(state.currentProjectId!, id)}");
  content = content.replace(/onDemoteToSubtask=\{state\.demoteToSubtask\}/g, "onDemoteToSubtask={(id, parentId) => state.demoteToSubtask(state.currentProjectId!, id, parentId)}");
  content = content.replace(/onAddSection=\{state\.addSection\}/g, "onAddSection={(name) => state.addSection(state.currentProjectId!, name)}");
  content = content.replace(/onDeleteSection=\{state\.deleteSection\}/g, "onDeleteSection={(id) => state.deleteSection(state.currentProjectId!, id)}");
  
  content = content.replace(/onAddFiles=\{state\.addFiles\}/g, "onAddFiles={(files) => state.addFiles(state.currentProjectId!, files)}");
  content = content.replace(/onRemoveFile=\{state\.removeFile\}/g, "onRemoveFile={(fileId) => state.removeFile(state.currentProjectId!, fileId)}");
  content = content.replace(/onLinkFile=\{state\.linkFile\}/g, "onLinkFile={(fileId, linkedTaskId) => state.linkFile(state.currentProjectId!, fileId, linkedTaskId)}");

  content = content.replace(/onAddTask=\{state\.addTask\}/g, "onAddTask={(task) => state.addTask(state.currentProjectId!, task)}");
  
  // also calendar quick add
  content = content.replace(/onQuickAdd=\{name => \{\n\s*state\.quickAddTask\(name, \{ startOverride: (.*) \}\);\n\s*\}\}/g, "onQuickAdd={name => {\n        state.quickAddTask(state.currentProjectId!, name, { startOverride: $1 });\n      }}");
  
  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}
